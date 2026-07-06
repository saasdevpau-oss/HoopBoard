const { send, methodGuard, readJson } = require("../lib/http.js");

/**
 * POST /api/beta { email, club? } — inscription à la bêta.
 * Stockage : à brancher sur Vercel KV / Postgres / un simple webhook.
 * Pendant la bêta fermée du backend, on valide et on journalise.
 */
module.exports = async (req, res) => {
  if (!methodGuard(req, res, ["POST"])) return;
  let body;
  try { body = await readJson(req); }
  catch { return send(res, 400, { error: "JSON invalide" }); }

  const email = String(body.email || "").trim();
  const club = String(body.club || "").trim().slice(0, 120);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return send(res, 400, { error: "Adresse email invalide" });
  }

  console.log(`[beta] inscription: ${email}${club ? ` — ${club}` : ""}`);
  send(res, 201, {
    ok: true,
    message: club
      ? `Bienvenue ${club} — vous êtes sur la liste. On vous écrit très vite.`
      : "Vous êtes sur la liste — on vous écrit très vite.",
  });
};
