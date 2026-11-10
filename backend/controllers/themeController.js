const { generatePalette } = require("../services/gemini");

async function generateTheme(req, res, next) {
  try {
    const theme = await generatePalette(req.body.prompt.trim());
    res.json({ success: true, theme });
  } catch (error) {
    next(error);
  }
}

module.exports = { generateTheme };
