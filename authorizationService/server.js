const http = require("http"); // IRL this would be https
const processAuthorizationRequest = require("./processAuthorizationRequest");

const PORT = process.env.PORT || 8010;
const JWT_SECRET = process.env.SECRET || "mysupersecret";

const readBodyAsync = (req) => new Promise((resolve, reject) => {
  let data = "";
  req.on("data", (chunk) => data += chunk);
  req.on("end", () => resolve(data));
  req.on("error", (error) => reject(error));
});

const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/oauth2/v2.0/token") {
      readBodyAsync(req)
        .then(body => processAuthorizationRequest(body, JWT_SECRET))
        .then((tokenRecord) => {
          res.setHeader("content-type", "application/json");
          res.write(JSON.stringify(tokenRecord, null, 2))
        })
        .catch((err) => {
          console.error(`Authorization Service: Generated an error: ${err}`);
          res.statusCode = 403;
          res.write(`${err}`);
        })
        .then(() => {
          res.end();
        })
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  server.listen(PORT, () => console.log(`Authorization Service: Listening on ${PORT}`));