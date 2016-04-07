/**
 * useful constants
 */

angular.module ( 'vccui.constants', [])

.constant('AUTH_EVENTS', {
  loginSuccess: 'auth-login-success',
  loginFailed: 'auth-login-failed',
  logoutSuccess: 'auth-logout-success',
  sessionTimeout: 'auth-session-timeout',
  notAuthenticated: 'auth-not-authenticated',
  notAuthorized: 'auth-not-authorized'
})

.constant('USER_ROLES', {
  all: '*',
  superadmin: 'superadmin',
  siteadmin: 'siteadmin',
  user: 'user',
  guest: 'guest'
})

;