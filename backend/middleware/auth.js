const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isPlaceholder = (value) => !value || /^(?:your[-_]|your-project|placeholder|change[-_]?me)/i.test(value.trim());
const authConfigured = !isPlaceholder(supabaseUrl) && !isPlaceholder(serviceRoleKey);
const supabase = authConfigured
  ? createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  : null;

async function requireAuth(req, res, next) {
  if (!authConfigured && process.env.NODE_ENV !== "production") {
    req.user = null;
    return next();
  }
  if (!supabase) {
    return res.status(503).json({ success: false, error: "Authentication is not configured on this server." });
  }

  const authorization = req.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) {
    return res.status(401).json({ success: false, error: "Sign in to continue." });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ success: false, error: "Your session is invalid or expired. Please sign in again." });
    }
    req.user = { id: data.user.id, email: data.user.email || "" };
    return next();
  } catch (error) {
    console.error("Authentication verification failed:", error.message);
    return res.status(503).json({ success: false, error: "Unable to verify your session right now. Please try again." });
  }
}

function requireProductionConfiguration() {
  if (process.env.NODE_ENV !== "production") return;
  const missing = [
    ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
    ["SUPABASE_URL", supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
  ].filter(([, value]) => isPlaceholder(value)).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
  }
}

function getSupabaseAdmin() {
  return supabase;
}

module.exports = { getSupabaseAdmin, requireAuth, requireProductionConfiguration };
