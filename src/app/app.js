/*jshint -W024 */

angular.module( 'vccui', [
  'templates-app',
  'templates-common',
  'vccui.constants',
  'vccui.database',
  'vccui.dash',
  'vccui.console',
  'ui.router'
])

/**
 * authentication stuff
 */

.factory('AuthService', function ($http, $q, $rootScope, Database) {
  var authService = {};
 
  authService.login = function (credentials) {
    console.log(credentials);
    var deferred = $q.defer();
    jQuery.post('/api/authenticate', credentials, function (result) {
      if(result.success === false) {
        deferred.reject();
      } else {
        $rootScope.setCurrentUser(result['userdata']);
        localStorage.setItem("vccui_token", result['token']);
        deferred.resolve();
      }
    });
    return deferred.promise;
  };

  authService.getUser = function (token) {
    var deferred = $q.defer();
    jQuery.ajax({
      type: "POST",
      url: "/api/user",
      data: {token: token},
      success: function (result) {
        deferred.resolve(result);
      },
      error: function (XMLHttpRequest, textStatus, error) {
        deferred.reject(textStatus);
      }
    });
    return deferred.promise;
  };
 
  authService.isAuthenticated = function () {
    if($rootScope.currentUser) {
      return !!$rootScope.currentUser.name;
    } else {
      return false;
    }
    
  };
 
  authService.isAuthorized = function (authorizedRoles) {
    if(authService.isAuthenticated()) {
      // in future use to test permissions
      return true;
    } else {
      // not authorized if not logged in
      return false;
    }
  };
 
  return authService;
})

/**
 * application stuff
 */

.config( function myAppConfig ( $stateProvider, $urlRouterProvider ) {
  //$urlRouterProvider.otherwise( '/dash' );
})

.run(function ($state, $rootScope, $interval, AUTH_EVENTS, AuthService) {
  $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
    // get authorized roles for new scope
    var authorizedRoles = toState.data.authorizedRoles;
    // check user is authenticated
    if (AuthService.isAuthenticated()) {
      // check user is authorised
      if (AuthService.isAuthorized(authorizedRoles)) {
        console.log("user is authorised");
      } else {
        console.log("user is not authorised");
        event.preventDefault();
        $rootScope.$broadcast(AUTH_EVENTS.notAuthorized);
      }
    } else {
      console.log("user is not logged in");
      event.preventDefault();
      $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated);
      $rootScope.loginBlockedState = {name: toState.name, params: toParams};
    }
  });
})

.controller( 'AppCtrl', function AppCtrl ( $scope, $rootScope, $location, USER_ROLES, AuthService ) {
  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    if ( angular.isDefined( toState.data.pageTitle ) ) {
      $scope.pageTitle = toState.data.pageTitle + ' | vccui' ;
    }
  });

  // initialise currentUser on the scope
  $rootScope.currentUser = null;
  $rootScope.isAuthorized = AuthService.isAuthorized;
  // use setter to avoid shadow properties
  $rootScope.setCurrentUser = function (user) {
    console.log(user);
    $rootScope.currentUser = user;
  };
  // add function to convert unix time on root scope
  $rootScope.humanTime = function (unixtime) {
    return moment.unix(unixtime).format("YYYY-MM-DD HH:mm:ss");
  };

})

.controller('LoginCtrl', function ( $state, $scope, $rootScope, AUTH_EVENTS, AuthService, Database ) {

  // listen for the "notAuthenticated" event
  $rootScope.$on(AUTH_EVENTS.notAuthenticated, function (event, data) {
    console.log("event: notAuthenticated");
    // check the cookie first
    var token = localStorage.getItem("vccui_token");
    if(token) {
      console.log("Using token");
      AuthService.getUser(token).then(function (userdata) {
        $rootScope.setCurrentUser(userdata);
        $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
      }).catch(function (err) {
        console.log("token probably expired, deleting it...");
        localStorage.setItem("vccui_token", "");
        $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated);
      });
    } else {
      // show the modal
      $('#loginModal').modal('show');
    }
  });

  // listen for the "loginSuccess" event
  $rootScope.$on(AUTH_EVENTS.loginSuccess, function (event, data) {
    console.log("event: loginSuccess");
    // hide the login modal if shown
    $('#loginModal').modal('hide');
    // see if we blocked a state change
    if($rootScope.loginBlockedState) {
      $state.go($rootScope.loginBlockedState.name, $rootScope.loginBlockedState.params).then(function () {
        $rootScope.loginBlockedState = null;
      });
    }
  });

  // listen for the "notAuthorized" event
  $rootScope.$on(AUTH_EVENTS.notAuthorized, function (event, data) {
    console.log("event: notAuthorized");
    BootstrapDialog.show({
      type: BootstrapDialog.TYPE_DANGER,
      title: 'Not Authorized',
      message: 'You are not authorized to perform this task. '+data.mx_message+'.',
      buttons: [
        {
          label: 'Debug info',
          action: function(dialogItself) {
              dialogItself.setMessage($('<pre>'+data+'</pre>'));
            }
        },
        {
          label: 'Close',
          action: function(dialogItself) {
              dialogItself.close();
            }
        }
      ]
    });
  });

  // listen for the "loginFailed" event
  $rootScope.$on(AUTH_EVENTS.loginFailed, function (event, data) {
    console.log("event: loginFailed");
    BootstrapDialog.show({
      type: BootstrapDialog.TYPE_DANGER,
      title: 'Login failed',
      message: 'Please check your login details',
      buttons: [
        {
          label: 'Close',
          action: function(dialogItself) {
              dialogItself.close();
            }
        }
      ]
    });
  });

  $scope.credentials = {
    username: '',
    password: '',
    totptoken: ''
  };
  $scope.login = function (credentials) {
    AuthService.login(credentials).then(function () {
      $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
    }, function () {
      $rootScope.$broadcast(AUTH_EVENTS.loginFailed);
    });
  };
})

;

