const { currentUser, publicState, send } = require("./_helpers");

module.exports = async function handler(req, res) {
  send(res, 200, publicState(currentUser(req)));
};
