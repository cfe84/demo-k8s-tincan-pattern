const jsonwebtoken = require("jsonwebtoken");
const SECRET = "mysupersecret";
const payloads = {
	customer: {
		userid: "cust-1234",
		username: "Rick Hunter",
		role: "customer"
  },
  admin: {
    userid: "adm-1",
    username: "Peter Malone",
    role: "admin"
  }
};

const PERSONA = process.argv[2];
const AUDIENCE = process.argv[3] || 'urn:all';
const payload = 
{
  data: payloads[PERSONA]
};
const jwt = jsonwebtoken.sign(payload, SECRET, {
  expiresIn: '1h',
  audience: AUDIENCE
})
console.log(jwt);
