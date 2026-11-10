const express = require("express");
const { z } = require("zod");
const { getSupabaseAdmin, requireAuth } = require("../middleware/auth");
const { websiteSchema } = require("../utils/schema");

const router = express.Router();
const projectSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string().trim().min(3).max(2000),
  website: websiteSchema,
  createdAt: z.string().datetime({ offset: true }),
});

function toProject(row) {
  return {
    id: row.id,
    prompt: row.prompt,
    website: row.website,
    createdAt: row.created_at,
  };
}

function sendStorageError(error, res) {
  console.error("Project storage request failed:", error.message);
  return res.status(503).json({ success: false, error: "Project storage is temporarily unavailable. Please try again." });
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  if (!req.user) return res.status(503).json({ success: false, error: "Configure Supabase server credentials to enable account project storage." });
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ success: false, error: "Project storage is not configured." });
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id,prompt,website,created_at")
      .eq("user_id", req.user.id)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return res.json({ success: true, projects: data.map(toProject) });
  } catch (error) {
    return sendStorageError(error, res);
  }
});

router.put("/:id", async (req, res) => {
  const parsed = projectSchema.safeParse({ ...req.body, id: req.params.id });
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Project data is invalid. Check the website schema and try again." });
  }
  if (!req.user) return res.status(503).json({ success: false, error: "Configure Supabase server credentials to enable account project storage." });
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ success: false, error: "Project storage is not configured." });

  try {
    const { data: existing, error: lookupError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", parsed.data.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const record = {
      prompt: parsed.data.prompt,
      website: parsed.data.website,
      updated_at: new Date().toISOString(),
    };
    const query = existing
      ? supabase.from("projects").update(record).eq("id", parsed.data.id).eq("user_id", req.user.id)
      : supabase.from("projects").insert({
        id: parsed.data.id,
        user_id: req.user.id,
        ...record,
        created_at: parsed.data.createdAt,
      });
    const { data, error } = await query.select("id,prompt,website,created_at").single();
    if (error) throw error;
    return res.json({ success: true, project: toProject(data) });
  } catch (error) {
    return sendStorageError(error, res);
  }
});

router.delete("/:id", async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ success: false, error: "Project ID is invalid." });
  if (!req.user) return res.status(503).json({ success: false, error: "Configure Supabase server credentials to enable account project storage." });
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ success: false, error: "Project storage is not configured." });
  try {
    const { error } = await supabase.from("projects").delete().eq("id", id.data).eq("user_id", req.user.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    return sendStorageError(error, res);
  }
});

module.exports = router;
