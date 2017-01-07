# vccui

vccui is a front end interface for console access to Linux-based systems using already established security principles. It is very convienient for replacing SSH access to systems.

In the simplest usage, it can facilitate web based SSH access to one or more systems, and supports Two Step (One Time Password) authentication.

## Installation

The software runs on `nodejs`. `npm` and `bower` are used to handle server side and client side libraries respectively. `grunt` is used to automate building the solution. You will most likely need to install the PAM development headers for your system. A CouchDB database is required to hold configuration for allowed users and the details for.

Run most commands as root user.

### Use `n` to install nodejs (or use your package manager)

```
$ git clone https://github.com/tj/n.git
$ cd n
$ make install
$ n 6.4.0
```

### Install the PAM development headers for your system

e.g. on Ubuntu

```
$ apt-get install libpam0g-dev
```

### Install bower, grunt

```
$ npm install -g bower
$ npm install -g grunt
```

### Clone the vccui repo and install dependencies

```
$ git clone https://github.com/hpcrc-hud/vccui.git
$ cd vccui
$ npm install
$ bower install
```

## Running (development server)

```
$ grunt build
$ grunt httpdev
```

Server will be listening on port 8000.

## Running (production)

You will want to run `grunt compile` as this will minify all the client side JS libraries that need to be loaded by the browser. Copy the contents of the `bin` folder to your web server.

In addition, you need to run the `server.js` that handles the websocket and opening a console for the user. 

The websocket server and the client side web application can be hosted from different servers. It is recommended to set up a reverse proxy to achieve this, by proxying to a different location for the `socket.io` endpoint.

## Advanced usage

vccui can use an external directory service (e.g. LDAP) instead of authenticating the user using methods configured on the local system (through PAM). Usernames from the external service can be mapped to a related account on the local system, avoiding the need for usernames to be coherent between the two services.

This is useful, for example, in batch scheduling clusters that use LDAP and private keys for authentication control. This is not easily mapped to a web based login flow. Thus, we can use username / password authentication against the institution's LDAP, whatever those credentials may be, and map that to an account on the cluster (which also may be managed by a separate LDAP instance, but this does not matter because we use PAM). Combined with a OTP, it provides a compelling solution that does not significantly reduce the security of the system.