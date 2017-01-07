var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io');
var pam = require('authenticate-pam');
var notp = require('notp');
var base32 = require('thirty-two');
var PouchDB = require('pouchdb');
var pty = require('pty.js');
var fs = require('fs');

var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var jwt = require('jsonwebtoken');

app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// service the static angular app
app.use('/app', express.static(__dirname + '/build'));

// token secret
var secret = "scotchscotchscotch"

// the couchdb
var db = new PouchDB('http://localhost:5984/qggusers');

// the API
var router = express.Router();

router.get('/', function(req, res) {
    res.json({ message: 'qgg-ui api' });   
});

router.post('/authenticate', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var totptoken = req.body.totptoken;

  // check we in the db first
  db.get(username).then(function (doc) {
    pam.authenticate(username, password, function (err) {
      if (err) {
        // authentication failed
        res.json({
          success: false
        });
        return;
      }
      // check if two step auth is required for this user
      if(doc['require_twostep']) {
        // check for existence of token
        if (!totptoken) {
          res.json({
            success: false
          });
          return;
        }
        // verify the token
        var login = notp.totp.verify(totptoken, doc['totp_key']);
        //console.log("compare", totptoken, doc['totp_key']);
        //console.log(login);
        if (!login) {
          res.json({
            success: false
          });
          return;
        }
        // authentication success, get user data
        var userdata = {
          "name": doc['_id'],
          "fullname": doc['fullname'],
          "group": doc['group']
        };
        var token = jwt.sign(userdata, secret, {
          expiresIn: 21600 // 6 hours
        });
        res.json({
          success: true,
          token: token,
          userdata: userdata
        });
      }
    });
  }).catch(function (err) {
    // authentication failed
    res.json({
      success: false
    });
  });
});

router.use(function(req, res, next) {
  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  // decode token
  if (token) {
    // verifies secret and checks exp
    try {
      var decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(403).send({
          success: false,
          message: 'not authenticated'
      });
    }
    // if everything is good, save to request for use in other routes
    req.userdata = decoded;
    next();
  } else {
    return res.status(403).send({
        success: false,
        message: 'not authenticated'
    });
  }
});

router.post('/user', function(req, res) {
  // return detailed user information from token
  res.json(req.userdata);
});

app.use('/api', router);

// the socket

var socket = io(server,{path: '/wetty/socket.io'});

var setupSocket = function(socket, data) {
  console.log('socket connection authenticated');
  // set up terminal
  var term;
  term = pty.spawn('/bin/login', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30
  });
  console.log((new Date()) + " PID=" + term.pid + " STARTED on behalf of user=" + data.name);
  // set up events
  term.on('data', function(data) {
      socket.emit('output', data);
  });
  term.on('exit', function(code) {
      console.log((new Date()) + " PID=" + term.pid + " ENDED")
  });
  socket.on('resize', function(data) {
      term.resize(data.col, data.row);
  });
  socket.on('input', function(data) {
      term.write(data);
  });
  socket.on('disconnect', function() {
      term.end();
  });
};

// socket authentication
require('socketio-auth')(socket, {
  authenticate: function (socket, data, callback) {
    // check that we got a token
    if (!data.token) {
      console.error("there was no token supplied");
      return callback(null, false);
    }
    // check that the token is valid
    console.log("authenticating socket connection with token");
    try {
      var decoded = jwt.verify(data.token, secret);
    } catch (err) {
      console.log("token is invalid");
      return callback(null, false);
    }
    console.log("token is valid");
    // check that decoded username matches
    if (decoded.name == data.name) {
      console.log("username is valid");
      return callback(null, true);
    } else {
      console.log("username does not match");
      return callback(null, false);
    }
  },
  postAuthenticate: setupSocket
});

// connection handler
socket.on('connection', function(socket) {
  console.log('socket connection accepted, authenticating');
});




exports = module.exports = server;
// delegates use() function
exports.use = function() {
  app.use.apply(app, arguments);
};
