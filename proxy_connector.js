/* Requires */
var http = require('http')
var url = require('url')

/* meta helpers */
function forEachIn(object, action) {
    for (var property in object) {
        if (object.hasOwnProperty(property)) {
            action(property, object[property]);
        }
    }
}

/* method:

   This is how we bundle up objects and their prototype functions into
   a closure.

*/
function method(object, call) {
    return function() {
        return object[call].apply(object, arguments);
    };
}

/* Helper functions */

/* copyHeaders:

   Bring over all headers from the source except for the proxy-connection
   header as this is intended for the proxy (us) to read.
*/
function copyHeaders(source) {
    target = {}
    forEachIn(source, function(p, v) {
        if (p != 'proxy-connection')
            target[p] = v;
        });
    return target;
}

/* paramsFromRequest:

   We have received our request from the client and now we want to make
   a new request to send to the real server. Copy out the things we
   want and ignore the things we don't
*/
function paramsFromRequest(request) {
    var params = {}
    var p = url.parse(request.url);
    params.hostname = p.hostname;
    params.method = request.method;
    params.port = p.port;
    if (!params.port)
        params.port = 80;
    params.path = p.path;

    params.headers = copyHeaders(request.headers);
    return params;
}

/* ProxyRequestor:

   This is what does the actual requesting per session. One of these gets
   created for each new incoming request
*/
function ProxyRequestor(client) {
    this.client = client;
}

ProxyRequestor.prototype.handleData = function(data) {
    this.client.write(data);
};

ProxyRequestor.prototype.handleEnd = function() {
    this.client.end();
};

ProxyRequestor.prototype.handleServerResponse = function(response) {

    this.client.statusCode = response.statusCode;
    this.client.httpVersion = response.httpVersion;
    forEachIn(response.headers, method(this.client, 'setHeader'));

    response.on('data', method(this, 'handleData'));
    response.on('end', method(this, 'handleEnd'));
    response.on('close', method(this, 'handleEnd'));
};

/* ProxyConnector:

   This is what you connect to as a client. There is one of these per
   server. He creates a new ProxyRequestor for each connection.
*/
function ProxyConnector() {
}

ProxyConnector.prototype.handleClientRequest = function(request, response) {
    var pr = new ProxyRequestor(response);
    req = http.request(paramsFromRequest(request),
                       method(pr, 'handleServerResponse'));
    req.on('error', function (e) {
            console.log("error:" + e);
            });
    req.end();
};

exports.ProxyConnector = ProxyConnector;
exports.method = method;
