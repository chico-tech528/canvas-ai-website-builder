const app = require("../backend/server");

function vercelHandler(req, res) {
  const incomingUrl = new URL(req.url, "http://vercel.local");
  const route = incomingUrl.searchParams.get("path");

  if (route) {
    incomingUrl.searchParams.delete("path");
    const query = incomingUrl.searchParams.toString();
    req.url = `/api/${route}${query ? `?${query}` : ""}`;
  }

  return app(req, res);
}

module.exports = vercelHandler;
