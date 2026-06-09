const { clearSession, send } = require("../_helpers");

module.exports = async function handler(req, res) {
  clearSession(res);
  send(res, 200, { ok: true });
};
