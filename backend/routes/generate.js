const express = require("express");
const { z } = require("zod");
const { generate } = require("../controllers/generateController");

const router = express.Router();
const requestSchema = z.object({
  prompt: z.string().trim().min(3, "Describe your website in at least 3 characters.").max(2000),
});

router.post("/", (req, res, next) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const error = issue?.code === "too_small"
      ? "Describe your website in at least 3 characters."
      : issue?.code === "too_big"
        ? "Your prompt cannot exceed 2,000 characters."
        : "A website prompt is required.";
    return res.status(400).json({
      success: false,
      error,
    });
  }
  req.body = parsed.data;
  return next();
}, generate);

module.exports = router;
