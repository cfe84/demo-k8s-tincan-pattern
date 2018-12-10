const http = require("http");
const url = require("url");

class authorizationAdapter {
    constructor({clientId, clientSecret, authorizationServerUrl}) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.authorizationServerUrl = url.parse(authorizationServerUrl);

        this.tokenCache = { };

        this.authorizeAsync = this.authorizeAsync.bind(this);
        this.resolveCacheAsync = this.resolveCacheAsync.bind(this);
        this.updateCacheAsync = this.updateCacheAsync.bind(this);
    }

    async resolveCacheAsync(audience) {
        const cachedToken = this.tokenCache[audience];
        if (cachedToken && cachedToken.expiryDate < new Date()) {
            return cachedToken.token;
        }
        return null;
    }
    
    updateCacheAsync(audience) {
        return new Promise((resolve, reject) => {
            const authRequest = http.request({
                hostname: this.authorizationServerUrl.hostname,
                method: "POST",
                port: this.authorizationServerUrl.port,
                path: this.authorizationServerUrl.path,
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                }
            }, (resp) => {
                let data = "";
                resp.on("data", (chunk) => data += chunk);
                resp.on("end", () => {    
                    if (resp.statusCode === 200) {
                        const deserializedResponse = JSON.parse(data);
                        const expiry = new Date();
                        expiry.setSeconds(expiry.getSeconds() + deserializedResponse.expires_in - 60);
                        const token = {
                            token: `${deserializedResponse.token_type} ${deserializedResponse.access_token}`,
                            expiryDate: expiry
                        };
                        this.tokenCache[audience] = token;
                        resolve(token.token);
                    } else {
                        reject(data);
                    }
                });
            });
            const request = `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}&scope=${audience}`;
            authRequest.write(request);
            authRequest.on("error", (err) => {
                reject(err);
            });
            authRequest.end();
        });
    }

    async authorizeAsync(audience, req, res) {
        let token = await this.resolveCacheAsync(audience);
        if (!token) {
            token = await this.updateCacheAsync(audience);
        }
        req.headers["authorization"] = token;
    }
}

module.exports = authorizationAdapter;