angular.module( 'vccui.database', [
  'vccui.constants',
  'pouchdb'
])

.config(function(pouchDBProvider, POUCHDB_METHODS) {
  var authMethods = {
    login: 'qify',
    logout: 'qify',
    getUser: 'qify'
  };
  pouchDBProvider.methods = angular.extend({}, POUCHDB_METHODS, authMethods);
})

.service('Database', function ($q, pouchDB) {
  this.setServer = function (server) {
    this.conn = server;
  };
  this.user = function () {
    return pouchDB(this.conn+'/_users', {skipSetup: true});
  };
  this.org = function (org) {
    return pouchDB(this.conn+'/'+org);
  };
  this.checkLogin = function (credentials) {
    var deferred = $q.defer();
    var me = this;
    // post to the database /_session endpoint to check login
    // if login success we will also get a cookie! yum.
    $.ajax({
      type: "POST",
      url: this.conn+"/_session",
      xhrFields: {
        withCredentials: true
      },
      data: "name="+credentials.username+"&password="+credentials.password,
      success: function (session) {
        // try and get our user doc
        me.user().get("org.couchdb.user:"+credentials.username).then(function (response) {
          // save server connection to localstorage cache
          localStorage.setItem("conn_cookie", me.conn);
          localStorage.setItem("conn_username", credentials.username);
          deferred.resolve(response);
        }, function (error) {
          deferred.reject("Get user doc exception: "+error);
        });
      },
      error: function (error) {
        if(error.status == 401) {
          deferred.reject("Name or password is incorrect");
        } else {
          if(error.responseText) {
            deferred.reject("Unexpected "+error.status+": "+error.responseText);
          } else {
            deferred.reject("Unexpected "+error.status);
          }
        }
      }
    });
    return deferred.promise;
  };
})

;