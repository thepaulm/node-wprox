/* Requires */
var http = require('http')
var prox_con = require('./proxy_connector')

/* main loop */
function main() {
    /* Create the main proxy listener */
    pcon = new prox_con.ProxyConnector();
    s = http.createServer(prox_con.method(pcon, 'handleClientRequest'));
    s.listen(2004)
}

main();
