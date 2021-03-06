/**
 * index.js
 * Entry point of sockpress wrapper.
 *
 * Inspired by https://gist.github.com/bobbydavid/2640463
 */

'use strict';

var express = require('express'),
  session   = require('express-session'),
  io        = require('socket.io'),
  Router    = require('./router.js');

module.exports.init = function (options) {

  var _app, _server;

  if (!options) options = {};

  //Defaults values for options
  options.name = options.name || 'sockpress.id';
  options.store = options.store || new session.MemoryStore();
  options.resave = options.resave === undefined ? true : false;
  options.saveUninitialized = options.saveUninitialized === undefined ? true : false;

  _app = options.express() || express(); //load an express instance
  _app.express = options.express || express; //expose raw express object for middlewares

  if (!options.https) //load http or https nodejs server
    _server = require('http').createServer(_app);
  else
    _server = require('https').createServer(options.https, _app);

  if (!options.disableSession)
    var _session = options.session(options) || session(options);
    _app.use(_session); //enable session support in express

  _app.io = options.io(_server) || io(_server);
  _app.rawServer = _server;

  //Init IO Router
  var _router = new Router(_app, options);

  // Expose new methods :

  /**
   * Start express and socket.io applications.
   * @params : see http://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback
   */
  _app.listen = function () {

    if (!_app.io.hasListeners) {
      _router.addListeners(_app.io);
      _app.io.hasListeners = true;
    }

    return _server.listen.apply(_server, arguments);

  };

  /**
   * Add a new socket.io route (convenience method)
   * @param  {String}   [namespace] socket.io namespace. Defaults to "/".
   * @param  {String}   eventName   the event name (should be unique)
   * @param  {Function} fn          function(socket, data) { ... }
   */
  _app.io.route = function (namespace, eventName, fn) {
    _router.add(namespace, eventName, fn);
  };

  return _app;

};
