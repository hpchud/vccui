
angular.module( 'vccui.dash', [
  'ui.router',
  'vccui.constants'
])

.config(function config( $stateProvider, USER_ROLES ) {
  $stateProvider.state( 'dash', {
    url: '/dash',
    views: {
      "main": {
        controller: 'DashCtrl',
        templateUrl: 'dash/dash.tpl.html'
      }
    },
    data: {
      pageTitle: 'Dashboard',
      authorizedRoles: [USER_ROLES.all]
    }
  });
})

/**
 * And of course we define a controller for our route.
 */
.controller( 'DashCtrl', function DashController( $scope ) {
  $scope.motd = "";
  $scope.currenttime = new Date().toLocaleTimeString();
  $scope.currentdate = new Date().toLocaleDateString();
  // get the message of the day
  var token = localStorage.getItem("vccui_token");
  jQuery.ajax({
      type: "GET",
      url: "/api/motd",
      data: {token: token},
      success: function (result) {
        $scope.motd = result.motd;
        $scope.$apply();
      },
      error: function (XMLHttpRequest, textStatus, error) {
        deferred.reject(textStatus);
      }
    });
})

;

