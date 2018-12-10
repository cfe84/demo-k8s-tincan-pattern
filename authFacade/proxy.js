const url = require("url");
const fs = require("fs");

const copyHeaders = (headers, to) => {
    for(let key in headers) {
        if (headers.hasOwnProperty(key)) {
            to.setHeader(key, headers[key]);
        }
    }
}

const proxy = (params, req, res) => {
    let proxyUrl = params.proxyTo;

    let proxyTo = url.parse(proxyUrl);
    const protocol = proxyTo.protocol.slice(0, -1);
    const http = require(protocol);
    const port = proxyTo.port || (protocol === "http" ? 80 : 443);
    const path = params.path;
    
    req.headers.host = `${proxyTo.hostname}:${port}`

    return new Promise((resolve, reject) => {
        const passThru = http.request({
            port: port,
            hostname: proxyTo.hostname,
            path,
            method: req.method,
            headers: req.headers
        }, (resp) => {
            res.statusCode = resp.statusCode;
            copyHeaders(resp.headers, res);
            resp.on("data", (chunk) => res.write(chunk));
            resp.on("end", () => resolve());
        });
        if (req.data) {
            passThru.write(req.data);
        }
        passThru.on("error", (err) => {
            reject(err);
        });
        passThru.end();
    });
}

module.exports = proxy;