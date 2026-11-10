const { generateWebsite } = require("../services/gemini");

async function generate(req, res, next) {
  try {
    const website = await generateWebsite(req.body.prompt.trim());
    res.json({ success: true, website });
  } catch (error) {
    next(error);
  }
}

module.exports = { generate };
