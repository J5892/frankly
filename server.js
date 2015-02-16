var http = require('http');
var url = require('url');
var httpProxy = require('http-proxy');
var fs = require('fs');
var grid = fs.readFileSync('grid.html');
var gridJSON = fs.readFileSync('gridStates.json');
var gridStates = JSON.parse(gridJSON);

var ws = require("websocket").server;
var conns = 0;
var responses = {};
var gridConns = {};

var updateClients = function(size, conn) {
	var json = JSON.stringify(gridStates[size])
	var connections = gridConns[size];
	console.log(gridStates[size]);
	for(c in connections) {
		var connection = connections[c];
		if (connection !== conn) {
			connections[c].sendUTF(json);
		}
	}
	for (r in responses[size]) {
		res = responses[size][r];
		res.writeHead(200, {
			"Content-Type": 'text/json'
		});
		if (gridStates[size]) {
			res.write(json);
			res.end();
			console.log('responded');
		}
		console.log('done');
	}
	responses[size] = [];
};

var server = http.createServer(function(req, res) {
	var path = url.parse(req.url).pathname;
	var size = url.parse(req.url).query;

	if (path.match(/\/\d+/)) {
		res.writeHead(200, {
			"Content-Type": 'text/html'
		});
		res.write(grid);
		res.end();
	} else if (path.match(/poll/)) {

		if (req.method === "GET") {
			console.log('request received');
			if (responses[size]) {
				responses[size].push(res);
			} else {
				responses[size] = [res];
			}
			
		}
		
		
	} else if (path.match(/json/)) {
		if (req.method === "POST") {
			var body = '';
			req.on('data', function(data) {
				body += data;
			});
			req.on('end', function() {
					size = url.parse(req.url).query;

					var update = JSON.parse(body);
					gridStates[update.size] = update.grid;
					fs.writeFile('gridStates.json', JSON.stringify(gridStates));
					updateClients(update.size);
					
			});
		} else if (req.method === "GET") {
			var json = JSON.stringify(gridStates[size])
			res.writeHead(200, {
				"Content-Type": 'text/json'
			});
			if (gridStates[size]) {
				res.write(json);
				res.end();
			}

		}
	}
}).listen(8800);

var socket = new ws({
	httpServer: server
});



socket.on('request', function(r) {
	console.log(r.origin);
	var conn = r.accept('update-protocol', r.origin);
	conns++;
	var size;
	var connections;
	try {
		size = r.resourceURL.match(/\d+$/)[0];
		if (gridConns[size]) {
			gridConns[size].push(conn);
		} else {
			gridConns[size] = [conn];
		}
		if (gridStates[size]) {
			conn.sendUTF(JSON.stringify(gridStates[size]));
		}
		
		connections = gridConns[size];
	}
	catch(e) {
		console.log(e);
	}
	console.log("Connection " + conns + " accepted!");
	conn.on('message', function(m) {
		var data = m.utf8Data;
		var update = JSON.parse(data);
		console.log(update);
		gridStates[update.size] = update.grid;
		fs.writeFile('gridStates.json', JSON.stringify(gridStates));
		updateClients(update.size, conn);

	});

	conn.on('close', function(code, desc) {
		console.log(code, desc);
	});
});








