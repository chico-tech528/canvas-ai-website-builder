require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("node:path");
const fs = require("node:fs");
const { rateLimit } = require("express-rate-limit");
const generateRoute = require("./routes/generate");
const themeRoute = require("./routes/theme");
const projectsRoute = require("./routes/projects");
const { requireAuth, requireProductionConfiguration } = require("./middleware/auth");

const app = express();
const port = Number(process.env.PORT) || 4000;

app.disable("x-powered-by");
const trustProxy = process.env.TRUST_PROXY;
const trustProxySetting = trustProxy === "true" ? true : trustProxy ? Number(trustProxy) : false;
if (typeof trustProxySetting === "number" && !Number.isFinite(trustProxySetting)) {
  throw new Error("TRUST_PROXY must be true or a valid proxy hop count.");
}
app.set("trust proxy", trustProxySetting);
const connectSources = ["'self'", "https://*.supabase.co"];
if (process.env.SUPABASE_URL) {
  try {
    connectSources.push(new URL(process.env.SUPABASE_URL).origin);
  } catch {
    throw new Error("SUPABASE_URL must be a valid absolute URL.");
  }
}
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      connectSrc: connectSources,
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://thumb.wikimedia.org"],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
}));
app.use(express.json({ limit: "16kb" }));

const generationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many generation requests. Please wait a minute and try again." },
});

requireProductionConfiguration();

app.get("/api/health", async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    try {
      const { error } = await require("./middleware/auth").getSupabaseAdmin()
        .from("projects")
        .select("id")
        .limit(1);
      if (error) throw error;
    } catch (error) {
      console.error("Readiness check failed:", error.message);
      return res.status(503).json({ status: "not_ready" });
    }
  }
  return res.json({ status: "ok" });
});
app.use("/api/generate", requireAuth, generationLimiter, generateRoute);
app.use("/api/theme", requireAuth, generationLimiter, themeRoute);
app.use("/api/projects", projectsRoute);

if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  const frontendDist = path.resolve(__dirname, "../frontend/dist");
  const frontendIndex = path.join(frontendDist, "index.html");
  if (!fs.existsSync(frontendIndex)) {
    throw new Error("Production frontend build is missing. Build frontend/dist before starting the API.");
  }
  app.use(express.static(frontendDist, {
    index: false,
    maxAge: "1y",
    immutable: true,
    setHeaders(response, filePath) {
      if (path.basename(filePath) === "index.html") response.setHeader("Cache-Control", "no-cache");
    },
  }));
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => res.sendFile(frontendIndex));
}

app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: "API endpoint not found." });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status === 503) res.set("Retry-After", "5");
  if (status >= 500) {
    console.error("API error:", error.message);
    if (error.cause) {
      console.error("Upstream error details:", {
        name: error.cause.name,
        status: error.cause.status || error.cause.response?.status || undefined,
        code: error.cause.code,
      });
    }
  }
  const message = status === 429
    ? "Too many requests. Please try again shortly."
    : status < 500
      ? error.message
      : error.status
        ? error.message
        : "Something went wrong while generating your website.";
  res.status(status).json({ success: false, error: message });
});

if (require.main === module) {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Canvas API listening on port ${port}`);
  });
  const shutdown = (signal) => {
    console.log(`${signal} received; closing HTTP server`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = app;
