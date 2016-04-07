var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io');

var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var jwt = require('jsonwebtoken');

app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// service the static angular app
app.use('/app', express.static(__dirname + '/build'));

// test users

var users = {
	"josh": {
		"name": "Joshua Higgins",
		"password": "lkjlkjq",
		"group": "admin"
	}
};

// the API
var router = express.Router();

router.get('/', function(req, res) {
    res.json({ message: 'qgg-ui api' });   
});

router.post('/authenticate', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  if(username in users) {
  	if (users[username]["password"] == password) {
  		// generate a token
  		var token = jwt.sign(username, "ilovescotch", {
          expiresIn: 21600 // 6 hours
        });
        res.json({
          success: true,
          token: token
        });
  	} else {
  		res.json({
          success: false
        });
  	}
  } else {
  	res.json({
          success: false
        });
  }
});

router.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, 'ilovescotch', function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'not authenticated' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.username = decoded; 
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

router.get('/user', function(req, res) {
	res.json(users[req.username]);
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
