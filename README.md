# vccui

vccui is a front end interface for console access to Linux-based systems using already established security principles. It is very convienient for replacing SSH access to systems.

In the simplest usage, it can facilitate web based SSH access to one or more systems, and supports Two Step (One Time Password) authentication.

## Installation

The software runs on `nodejs`. `npm` and `bower` are used to handle server side and client side libraries respectively. `grunt` is used to automate building the solution. You will most likely need to install the PAM development headers for your system. A CouchDB database is required to hold configuration for users.

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

## Configuration

Make a copy of the `config.yml.template` file called `config.yml`. The format of this file is self explanatory. Set the correct database connection details. You should also change the secret for generating the authentication tokens. You can also set the path to a `motd` file that will be shown to users on the dashboard.

There are two available modes: `localshell` or `shell+ssh`. 

In `localshell` mode, any authenticated user will be granted a shell local to the machine running vccui. The `shell` command will be launched with the arguments `shellargs`.

In `shell+ssh` mode, the server will run an SSH process for the user to connect to a remote machine. The list of machines in `sshhosts` will be available to choose from in the web application. In this mode, the `shellargs` will be ignored. Additional connection information for the remote hosts must be defined in the user's `~/.ssh/config`. To make best use of this mode, passwordless SSH can be configured for seamless access, without an intermediate password prompt.

## Running (development server)

```
$ grunt build
$ grunt httpdev
```

Server will be listening on port 8000.

## Running (production)

You will want to run `grunt compile` as this will minify all the client side JS libraries that need to be loaded by the browser. Copy the contents of the `bin` folder to your web server.

In addition, you need to run the `server.js` that handles the websocket and opening a console for the user. 

The websocket server and the client side web application can be hosted from different servers. It is recommended to set up a reverse proxy to achieve this, by proxying to a different location for the `socket.io` endpoint. Now you understand why a CouchDB database is used - so that multiple server instances may share the same state (user account mappings and OTP secrets).

## Advanced usage

vccui can use an external directory service (e.g. LDAP) instead of authenticating the user using methods configured on the local system (through PAM). Usernames from the external service can be mapped to a related account on the local system, avoiding the need for usernames to be coherent between the two services.

This is useful, for example, in batch scheduling clusters that use LDAP and private keys for authentication control. This is not easily mapped to a web based login flow. Thus, we can use username / password authentication against the institution's LDAP, whatever those credentials may be, and map that to an account on the cluster (which also may be managed by a separate LDAP instance, but this does not matter because we use PAM). Combined with a OTP, it provides a compelling solution that does not significantly reduce the security of the system.