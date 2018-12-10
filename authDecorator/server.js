const http = require("http");
const proxy = require("./proxy");
const validateAuthorization = require("./validateAuthorization");

const PORT = process.env.PORT || 8001;
const PROXY_TO = process.env.PROXY_TO;
const SECRET = process.env.SECRET || "mysupersecret";
const AUDIENCE = process.env.AUDIENCE || "aud:general";

const server = http.createServer((req, res) => {
    params = {
        proxyTo: PROXY_TO,
        path: req.url
    };
    console.log(`Decorator: Request received, forwarding to: ${PROXY_TO}${req.url}`);
    const authorizationParameters = {
        secret: SECRET,
        audience: AUDIENCE
    };
    validateAuthorization(authorizationParameters, req, res)
        .then(() => proxy(params, req, res))
        .then(() => res.end())
        .catch((error) => {
            console.error(`Decorator: Generated an error: ${error}`);
            res.end(`${error}`);
        });
  });
  server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  server.listen(PORT, () => console.log(`Decorator: Listening on ${PORT}`));