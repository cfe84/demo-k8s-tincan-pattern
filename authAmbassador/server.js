const http = require("http");
const proxy = require("./proxy");
const AuthorizationAdapter = require("./authorizationAdapter");

const PORT = process.env.PORT || 8002;
const PROXY_TO = process.env.PROXY_TO;
const AUTHORIZATION_URL = process.env.AUTHORIZATION_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const AUDIENCE = process.env.AUDIENCE || "aud:general";

const authorizationAdapter = new AuthorizationAdapter({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    authorizationServerUrl: AUTHORIZATION_URL
})

const server = http.createServer((req, res) => {
    params = {
        proxyTo: PROXY_TO,
        path: req.url
    };
    console.log(`Ambassador: Request received, forwarding to: ${PROXY_TO}${req.url}`);
    authorizationAdapter.authorizeAsync(AUDIENCE, req, res)
        .then(() => proxy(params, req, res))
        .then(() => res.end())
        .catch((error) => {
            console.error(`Facade: Generated an error: ${error}`);
            res.end(`${error}`);
        });
  });
  server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  server.listen(PORT, () => console.log(`Ambassador: Listening on ${PORT}`));