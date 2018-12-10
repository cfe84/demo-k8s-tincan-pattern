const jsonWebToken = require("jsonwebtoken");
const requireYaml = require("require-yml");
const path = require("path");
const identities = requireYaml(path.resolve(__dirname, "identities.yml"));
const TOKEN_EXPIRY_SECONDS = 3600;
const TOKEN_TYPE = "Bearer";

const processClientCredentials = (requestAttributes, jwtSecret) => {
    const clientId = requestAttributes.client_id;
    const clientSecret = requestAttributes.client_secret;
    const scope =  requestAttributes.scope;

    if (!clientId || !clientSecret || !scope) {
        throw Error("Request must contain client_id, client_secret and scope")
    }

    const clientIdentity = identities[clientId];

    if (!clientIdentity || clientIdentity.secret !== clientSecret) {
        throw Error("Invalid credentials");
    }

    const permissions = clientIdentity.permissions[scope];
    if (!permissions) {
        throw Error("No permissions defined for this client and scope");
    }

    const payload = {
        data: {
            clientId,
            permissions
        },
        aud: scope
    }
    // In real life, this would be an asymetric encryption alg.
    const jwt = jsonWebToken.sign(payload, jwtSecret, { 
        expiresIn: TOKEN_EXPIRY_SECONDS
    });
    return {
        "access_token": jwt,
        "token_type": TOKEN_TYPE,
        "expires_in": TOKEN_EXPIRY_SECONDS
    };
}

const getUrlFormEncodedRequestAttributes = (request) => {
    request = request.replace(/[\r\n]*/g, "");
    const fields = request.split("&");
    const requestAttributes = fields
        .map((field) => {
            const split = field.split("=");
            return {
                key: split[0],
                value: split[1]
            };
        })
        .reduce((accumulator, currentValue) => { 
            accumulator[currentValue.key] = currentValue.value;
            return accumulator;
        }, {});
    return requestAttributes;
}

const processAuthorizationRequest = (request, jwtSecret) => {
    const requestAttributes = getUrlFormEncodedRequestAttributes(request);
    if (!requestAttributes.grant_type) {
        throw Error("Grant Type is not defined. Must include field" +
            " grant_type in the request");
    }
    if (requestAttributes.grant_type === "client_credentials") {
        console.log(`Authorization Service: creating new token for ${requestAttributes.client_id}`);
        return processClientCredentials(requestAttributes, jwtSecret);
    }
    throw Error("Unknow grant_type: " + grant_type[1]);
}

module.exports = processAuthorizationRequest;