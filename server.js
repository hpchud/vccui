var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io');
var pam = require('authenticate-pam');
var notp = require('notp');
var base32 = require('thirty-two');
var PouchDB = require('pouchdb');

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

  // check we in the db first
  db.get(username).then(function (doc) {
    pam.authenticate(username, password, function (err) {
      if (err) {
        // authentication failed
        res.json({
          success: false
        });
      } else {
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
    jwt.verify(token, secret, function(err, decoded) {      
      if (err) {
        return res.status(403).send({ 
            success: false, 
            message: 'not authenticated' 
        });
      } else {
        // if everything is good, save to request for use in other routes
        req.userdata = decoded; 
        next();
      }
    });

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

socket.on('connection', function(socket){

    console.log((new Date()) + ' Connection accepted.');

    socket.on('disconnect', function() {
        console.log("disconnect");
    });
})


exports = module.exports = server;
// delegates use() function
exports.use = function() {
  app.use.apply(app, arguments);
};
