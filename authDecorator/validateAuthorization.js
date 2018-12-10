const jwt = require("jsonwebtoken");

const validateAuthorization = async (param, req, res) => {
    const SECRET = param.secret;
    const AUDIENCE = param.audience;
    const authorizationHeader = req.headers["authorization"];
    if (!authorizationHeader || authorizationHeader.substring(0, 7) != "Bearer ") {
        res.statusCode = 401;
        throw Error("Unauthorized");
    }
    try {
        const token = authorizationHeader.substring(7);
        const decodedJwt = jwt.verify(token, SECRET, {
            audience: AUDIENCE
        });
        req.headers["x-authentication-clientid"] =  
            decodedJwt.data.clientId;
        req.headers["x-authentication-permissions"] = 
            JSON.stringify(decodedJwt.data.permissions);
    }
    catch(error) {
        res.statusCode = 403;
        throw error;
    }
}

module.exports = validateAuthorization;