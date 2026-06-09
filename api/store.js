const { config } = require("./_helpers");

module.exports = async function handler(req, res) {
  res.statusCode = 302;
  res.setHeader("Location", config.brand.tebexUrl);
  res.end();
};
