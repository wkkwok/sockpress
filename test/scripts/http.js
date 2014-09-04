"use strict";

var sockpress = require("../../lib/index");
var assert = require("assert");

var app = sockpress.init({secret: "key"});


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.use(app.express.static(require("path").join(__dirname, "..", "browser")));

app.get("/foo", function(req, res) {
	res.send("bar");
});

app.get("/increment", function(req, res) {
	if(!req.session) req.session = {};
	if(!req.session.increment) req.session.increment = 0;

	res.send(++req.session.increment + "");
});

app.get("/session/:param/:value", function(req, res) {
	if(!req.session) req.session = {};
	req.session[req.params.param] = req.params.value;

	res.send("OK");
});

app.get("/session/:param", function(req, res) {
	res.send("" + req.session[req.params.param]);
});

app.io.on("connection", function(socket) {
	socket.emit("welcome", "welcome");
	socket.on("PING", function(m) {
		assert.equal("Hi, I am the client", m);
		socket.emit("PONG", "Hi, I am the server");
	});
	socket.on("get_session", function(param) {
		socket.emit("session_param", {param: param, value: socket.session[param]});
	});
	socket.on("set_session", function(o) {
		socket.session[o.param] = o.value;
		socket.session.save();
	});
	socket.on("disconnect me", function() {
		socket.disconnect();
	});
	socket.on("broadcast message", function(msg) {
		socket.broadcast.emit("broadcasted message", msg);
	});
	socket.on("join room", function(room) {
		joinRoom(socket, room);
	});
});

app.io.route("simple route", function(socket, data) {
	socket.emit("simple route ok");
});

app.io.route("route disconnect me", function(socket, data) {
	socket.disconnect();
});

app.io.route("route broadcast message", function(socket, msg) {
	socket.broadcast.emit("broadcasted message", msg);
});

app.io.route("route join room", joinRoom);

app.io.route("another simple route", function(socket, data) {
	if(data !== "hello") throw Error(data + " !== hello");
	socket.emit("another simple route ok", {foo: "bar"});
});

//Namespace test
app.io.of("/namespace").on("connection", function(socket) {
	socket.emit("welcome namespace");
});

app.io.route("/namespace", "ping namespace", function(socket, data) {
	socket.emit("pong namespace", data);
});

app.listen(3333, function() {
	process.stdout.write("READY");
});

function joinRoom(socket, room) {
	socket.join(room);
	socket.broadcast.to(room).emit("room joined", room); //should not be sent
	socket.emit("room joined", room); //should be sent
	app.io.to(room).emit("room joined", room); //should be sent
}