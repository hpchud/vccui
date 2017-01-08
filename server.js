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
var path = require('path');
var yamljs = require('yamljs');

var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var jwt = require('jsonwebtoken');

app.use(bodyParser.urlencoded({
    'extended': 'true'
}));
app.use(bodyParser.json());
app.use(bodyParser.json({
    type: 'application/vnd.api+json'
}));

// load configuration file
var config = yamljs.load("./config.yml")

// service the static angular app
app.use('/app', express.static(__dirname + '/build'));

// token secret
var secret = config.secret;

// the couchdb
var options = {};
if (config.database.username && config.database.password) {
    options.auth = {};
    options.auth.username = config.database.username;
    options.auth.password = config.database.password;
}

var db = new PouchDB(config.database.url, options);

// the API
var router = express.Router();

router.get('/', function(req, res) {
    res.json({
        message: 'qgg-ui api'
    });
});

var authenticate_pam = function (username, password, callback) {
    pam.authenticate(username, password, function(err) {
        if (err) {
            callback(false);
        } else {
            callback(true);
        }
    });
}

router.post('/authenticate', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var totptoken = req.body.totptoken;

    // check we in the db first
    db.get(username).then(function(doc) {
        console.log("found user in db");
        // this callback is called from the authentication module to complete the login
        var auth_module_callback = function (success) {
            if (!success) {
                // authentication failed
                console.error("pam authentication failed for", username);
                res.json({
                    success: false
                });
                return;
            }
            // check if two step auth is required for this user
            if (doc['require_twostep']) {
                console.log("twostep is required for", username);
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
            } else {
                console.log("twostep is not required for", username);
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
        };
        // do the required auth module
        authenticate_pam(username, password, auth_module_callback);
    }).catch(function(err) {
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

router.get('/picture', function(req, res) {
    // include the user's image in this data
    var userdata = req.userdata;
    db.get(userdata.name).then(function(doc) {
        res.json({picture: doc['picture']});
    });
});

router.get('/motd', function(req, res) {
    // get the motd file contents
    fs.readFile(config.motd, 'utf8', function (err,data) {
      if (err) {
        res.json({motd: "Could not load the Message of the Day, sorry about that. Maybe tomorrow?"})
      }
      res.json({motd: data});
    });
});

app.use('/api', router);

// the socket

var socket = io(server, {
    path: '/wetty/socket.io'
});

var setupSocket = function(socket, data) {
    console.log('socket connection authenticated');
    // get user data from the db, don't rely on client provided uid!
    db.get(data.name).then(function(doc) {
        var uid = doc['localuid'];
        // set up terminal
        var term;
        term = pty.spawn('/bin/bash', ['-c', 'tmux attach || tmux new'], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30,
            uid: uid
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
            console.log("socket disconnected, killing terminal...");
            term.destroy();
        });
    });
};

// socket authentication
require('socketio-auth')(socket, {
    authenticate: function(socket, data, callback) {
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

// run the server
if (path.basename(process.argv[1], ".js") == "server") {
    app.listen(8000, function () {
      console.log('server listening on port 8000');
    });
} else {
    exports = module.exports = server;
    // delegates use() function
    exports.use = function() {
        app.use.apply(app, arguments);
    };
}

