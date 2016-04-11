
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
 
})

;

