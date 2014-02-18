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

/* The remote server has responded */
function makeDataHandler(client) {
    return function (data) {
        client.write(data);
    };
}

function makeEndHandler(client) {
    return function () {
        client.end();
    }
}

function makeServerResponse(client) {
    return function (response) {
        client.statusCode = response.statusCode;
        client.httpVersion = response.httpVersion;
        forEachIn(response.headers, function (p, v) {
                    client.setHeader(p, v);
                });

        response.on('data', makeDataHandler(client));
        response.on('end', makeEndHandler(client));
        response.on('close', makeEndHandler(client));
    };
}

/* We have a new request from a client */
function clientRequest(request, response) {
    req = http.request(paramsFromRequest(request),
                       makeServerResponse(response));
    req.on('error', function (e) {
            console.log("error:" + e);
            });
    req.end();
}

/* main loop */
function main() {
    s = http.createServer(clientRequest)
    s.listen(2004)
}

main();
