const express = require("express");
const { z } = require("zod");
const { generateTheme } = require("../controllers/themeController");

const router = express.Router();
const requestSchema = z.object({
  prompt: z.string().trim().min(3).max(500),
});

router.post("/", (req, res, next) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Describe the mood or style for your color palette." });
  }
  req.body = parsed.data;
  return next();
}, generateTheme);

module.exports = router;
