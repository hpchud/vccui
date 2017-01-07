
angular.module( 'vccui.console', [
  'ui.router',
  'vccui.constants'
])

.config(function config( $stateProvider, USER_ROLES ) {
  $stateProvider.state( 'console', {
    url: '/console',
    views: {
      "main": {
        controller: 'ConsoleCtrl',
        templateUrl: 'console/console.tpl.html'
      }
    },
    data: {
      pageTitle: 'Console',
      authorizedRoles: [USER_ROLES.all]
    }
  });
})

/**
 * And of course we define a controller for our route.
 */
.controller( 'ConsoleCtrl', function ConsoleController( $scope, $rootScope ) {
  var term;
  var buf = '';
  var socket = io(location.origin, {path: '/wetty/socket.io'});

  var resizeTerminal = function () {
    // resize to fit screen
    var height = $(window).height() - $('#MainHeader').height();
    var width = $(window).width() - $('#MainSidebar').width();
    jQuery('#TerminalFrame').height(height);
    jQuery('#TerminalFrame').width(width);
  };

  jQuery(window).on('resize', function () {
    resizeTerminal();
  });

  jQuery(window).on('sidebarToggled', function (e) {
    console.log("sidebar changed");
    setTimeout(resizeTerminal, 500);
  });

  $scope.$on("$destroy", function(){
      socket.disconnect();
  });

  socket.on('authenticated', function() {
    console.log('socket is authenticated');
      lib.init(function() {
          hterm.defaultStorage = new lib.Storage.Local();
          term = new hterm.Terminal();
          window.term = term;
          term.decorate(document.getElementById('terminal'));

          jQuery.AdminLTE.layout.fix();

          term.setCursorPosition(0, 0);
          term.setCursorVisible(true);
          term.prefs_.set('ctrl-c-copy', true);
          term.prefs_.set('ctrl-v-paste', true);
          term.prefs_.set('use-default-window-copy', true);

          // define run command class inline

          function Wetty(argv) {
            console.log(argv);
              this.argv_ = argv;
              this.io = null;
              this.pid_ = -1;
          }

          Wetty.prototype.run = function() {
              this.io = this.argv_.io.push();

              this.io.onVTKeystroke = this.sendString_.bind(this);
              this.io.sendString = this.sendString_.bind(this);
              this.io.onTerminalResize = this.onTerminalResize.bind(this);
          };

          Wetty.prototype.sendString_ = function(str) {
              socket.emit('input', str);
          };

          Wetty.prototype.onTerminalResize = function(col, row) {
              resizeTerminal();
              socket.emit('resize', { col: col, row: row });
          };

          term.runCommandClass(Wetty, document.location.hash.substr(1));
          socket.emit('resize', {
              col: term.screenSize.width,
              row: term.screenSize.height
          });

          if (buf && buf !== '')
          {
              term.io.writeUTF16(buf);
              buf = '';
          }
      });
  });

  socket.on('output', function(data) {
      if (!term) {
          buf += data;
          return;
      }
      term.io.writeUTF16(data);
  });

  socket.on('disconnect', function() {
      console.log("Socket.io connection closed");
  });

  socket.on('connect', function() {
    console.log('sending authentication for socket');
    socket.emit('authentication', {token: localStorage.getItem("vccui_token"), name: $rootScope.currentUser.name});
  });

})

;

