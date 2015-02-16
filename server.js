var http = require('http');
var url = require('url');
var httpProxy = require('http-proxy');
var fs = require('fs');
var grid = fs.readFileSync('grid.html');
var gridJSON = fs.readFileSync('gridStates.json');
var gridStates = JSON.parse(gridJSON);

var ws = require("websocket").server;
var conns = 0;

var server = http.createServer(function(req, res) {
	var path = url.parse(req.url).pathname;

	if (path == '/') {
		res.writeHead(200, {
			"Content-Type": 'text/html'
		});
		res.write(grid);
	} else if (path == '/json') {
		if (req.method === "POST") {
			var body = '';
			req.on('data', function(data) {
				body += data;
			});
			req.on('end', function() {
				
			});
			res.writeHead(200, {
				"Content-Type": 'text/json'
			});
			res.write(json);
		}
	}
	res.end();
}).listen(8800);

var socket = new ws({
	httpServer: server
});

var gridConns = {};

socket.on('request', function(r) {
	console.log(r.origin);
	var conn = r.accept('update-protocol', r.origin);
	conns++;
	var size;
	var connections;
	//try {
		size = r.resourceURL.search.match(/\d+$/)[0];
		if (gridConns[size]) {
			gridConns[size].push(conn);
		} else {
			gridConns[size] = [conn];
		}
		if (gridStates[size]) {
			conn.sendUTF(JSON.stringify(gridStates[size]));
		}
		
		connections = gridConns[size];
	/*}
	catch(e) {
		console.log(e);
	}*/
	console.log("Connection " + conns + " accepted!");
	conn.on('message', function(m) {
		var data = m.utf8Data;
		var update = JSON.parse(data);
		console.log(update);
		gridStates[update.size] = update.grid;
		fs.writeFile('gridStates.json', JSON.stringify(gridStates));
		for(c in connections) {
			var connection = connections[c];
			if (connection !== conn) {
				connections[c].sendUTF(JSON.stringify(update.grid));
			}
		} 

	});

	conn.on('close', function(code, desc) {
		console.log(code, desc);
	});
});








