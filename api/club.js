const DATA = require("../lib/data.js");
const { send, methodGuard } = require("../lib/http.js");

/** GET /api/club — identité du club + bilan du tournoi en cours. */
module.exports = (req, res) => {
  if (!methodGuard(req, res, ["GET"])) return;
  send(res, 200, { club: DATA.club, tournoi: DATA.tournoi });
};
