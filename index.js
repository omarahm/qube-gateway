//A proof of concept.
//No code structure whatsoever applied

var http = require('http');
var redis = require('redis');
var redisClient = redis.createClient(6379, '10.129.123.83');
var NRP = require('node-redis-pubsub')
  , config = { port: 6379       // Port of your remote Redis server
             , host: '10.129.123.83' // Redis server host, defaults to 127.0.0.1
             }
  , nrp = new NRP(config);      // This is the NRP client
var uuid = require('node-uuid');

var responseObjects = {};

http.createServer(function (req, res) {
	var timing      = {};
	timing['gatewayGotRequest'] = Date.now();
	var topicName   = req.method+':'+req.headers.host+':'+req.url;
	var requestUUID = uuid.v1();

	responseObjects[requestUUID] = res;

	redisClient.rpush('request|'+topicName+"-queue", requestUUID, function(err, reply){

		timing['gatewayQueuePush'] = Date.now();
		redisClient.hmset('request-'+requestUUID, {
			requestUUID: requestUUID,
			data: 'Test!',
			method: req.method,
			host: req.headers.host,
			uri: req.url
		}, function(err, reply){
			timing['gatewayHashSet'] = Date.now();
			timing['gatewaySentNotify'] = Date.now();
			nrp.emit('request|'+topicName, {timing: timing});	//Notify workers to fetch the new task/request from list	
		});
	});
}).listen(80);

nrp.on('response|*', function (data, channel) {
	var requestUUID = data.requestUUID;
	
	if(typeof responseObjects[requestUUID] !== "undefined"){
		//console.log(data);
		//console.log('data:', data);
		//console.log('objs:', responseObjects);	
		responseObjects[requestUUID].end(data.response);
		data.timing['gatewayResponseReady'] = Date.now();
		//console.log(data.timing);
	}
	else{
		//console.log(requestUUID);
		//console.log(responseObjects);
	}
	console.log('total:'+(data.timing['gatewayResponseReady']-data.timing['gatewayGotRequest'])+', transit delay: '+ ((data.timing['gatewayResponseReady']-data.timing['gatewayGotRequest'])-(data.timing['serviceGotHttp']-data.timing['serviceStartHttp']))+', internal request: '+ ((data.timing['serviceGotHttp']-data.timing['serviceStartHttp'])));
	//console.log(data.timing);
});
