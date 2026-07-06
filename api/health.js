const { send, methodGuard } = require("../lib/http.js");

module.exports = (req, res) => {
  if (!methodGuard(req, res, ["GET"])) return;
  send(res, 200, {
    ok: true,
    service: "hoopboard-api",
    version: "0.1.0-beta",
    beta: true,
    endpoints: ["/api/health", "/api/club", "/api/matches", "/api/players", "/api/beta", "/api/events"],
  });
};
