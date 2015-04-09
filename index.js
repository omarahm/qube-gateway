//A proof of concept.
//No code structure whatsoever applied
var http = require('http');
var NRP = require('node-redis-pubsub')
  , config = { port: 6379       // Port of your remote Redis server
             , host: '10.129.123.83' // Redis server host, defaults to 127.0.0.1
             }
  , nrp = new NRP(config);      // This is the NRP client
var uuid = require('node-uuid');

var responseObjects = {};


http.createServer(function (req, res) {
	var t1 = Date.now();
	var topicName   = req.method+':'+req.headers.host+':'+req.url;
	var requestUUID = uuid.v1();

	nrp.emit('request|'+topicName, {
		requestUUID: requestUUID,
		data: 'Test!',
		method: req.method,
		host: req.headers.host,
		uri: req.url,
		timing: {
			t1: t1
		}
	});

	responseObjects[requestUUID] = res;
}).listen(80);

nrp.on('response|*', function (data, channel) {
	var requestUUID = data.requestUUID;

	responseObjects[requestUUID].end(data.response);
	data.timing['t5'] = Date.now();
	console.log('total:'+(data.timing['t5']-data.timing['t1'])+', transit delay: '+ ((data.timing['t5']-data.timing['t1'])-(data.timing['t4']-data.timing['t3']))+', internal request: '+ ((data.timing['t4']-data.timing['t3'])));
	//console.log(data.timing);
});