const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { once } = require("node:events");

process.env.NODE_ENV = "test";
process.env.GEMINI_API_KEY = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";

const app = require("../server");
const { requireProductionConfiguration } = require("../middleware/auth");
const { websiteSchema } = require("../utils/schema");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health check returns ready status", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("website schema accepts product cards for commerce-specific previews", () => {
  const website = websiteSchema.parse({
    title: "Field & Form",
    description: "A small home goods shop.",
    style: "minimal",
    theme: { primary: "#59634A", background: "#F5F2EB", text: "#252820" },
    sections: [{
      id: "new-arrivals",
      type: "products",
      heading: "New arrivals",
      subheading: "Made for a calmer home.",
      body: "",
      items: [],
      cards: [{
        title: "Linen Table Runner",
        description: "Soft washed linen in natural flax.",
        price: "$48",
        badge: "Bestseller",
        visual: "home",
      }],
    }],
  });

  assert.equal(website.sections[0].cards[0].title, "Linen Table Runner");
});

test("website schema accepts non-commerce site-specific sections", () => {
  const website = websiteSchema.parse({
    title: "Northstar Learning",
    description: "A learning center site.",
    style: "playful",
    theme: { primary: "#2563EB", background: "#F8FAFC", text: "#172033" },
    sections: [
      { id: "team", type: "team", heading: "Meet the teachers", cards: [{ title: "Mina Chen", description: "Mathematics educator", visual: "people" }] },
      { id: "schedule", type: "schedule", heading: "Class times", cards: [{ title: "Saturday studio", description: "Hands-on robotics", price: "", badge: "10:00 AM", visual: "learning" }] },
      { id: "stats", type: "stats", heading: "Learning that lasts", cards: [{ title: "Students served", description: "Across the region", price: "1,200+", badge: "", visual: "learning" }] },
    ],
  });

  assert.deepEqual(website.sections.map((section) => section.type), ["team", "schedule", "stats"]);
  assert.equal(website.sections[0].cards[0].visual, "people");
});

test("website schema normalizes prices embedded in AI card descriptions", () => {
  const website = websiteSchema.parse({
    title: "Lumina Skincare",
    description: "A skincare shop.",
    theme: { primary: "#1A2B3C", background: "#FFFFFF", text: "#17202A" },
    sections: [{
      id: "products",
      type: "products",
      heading: "Daily care",
      cards: [{ title: "Hydrating Mist", description: "Rose-infused botanical mist. Price: $32.00." }],
    }],
  });

  assert.equal(website.sections[0].cards[0].price, "$32.00");
  assert.equal(website.sections[0].cards[0].description, "Rose-infused botanical mist");
});

test("website schema preserves international currency prices embedded in descriptions", () => {
  const website = websiteSchema.parse({
    title: "Nori House",
    description: "A ramen restaurant.",
    theme: { primary: "#1A2B3C", background: "#FFFFFF", text: "#17202A" },
    sections: [{
      id: "menu",
      type: "menu",
      heading: "Our menu",
      cards: [
        { title: "Kyoto Shoyu Ramen", description: "Clear soy broth. Price: ¥1,200" },
        { title: "Seasonal Curry", description: "Slow-cooked vegetables. Price: ₹450" },
      ],
    }],
  });

  assert.deepEqual(website.sections[0].cards.map((card) => card.price), ["¥1,200", "₹450"]);
});

test("website schema preserves attributed Commons images and rejects untrusted image hosts", () => {
  const image = {
    imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Ramen.jpg/960px-Ramen.jpg",
    imagePage: "https://commons.wikimedia.org/wiki/File:Ramen.jpg",
    imageCredit: "Photographer",
    imageLicense: "CC BY-SA 4.0",
  };
  const website = websiteSchema.parse({
    title: "Nori House",
    description: "A ramen restaurant.",
    theme: { primary: "#1A2B3C", background: "#FFFFFF", text: "#17202A" },
    sections: [{
      id: "menu",
      type: "menu",
      heading: "Our menu",
      cards: [{ title: "Shoyu Ramen", description: "Soy broth", ...image }],
    }],
  });

  assert.deepEqual(
    Object.fromEntries(Object.keys(image).map((key) => [key, website.sections[0].cards[0][key]])),
    image,
  );
  assert.equal(websiteSchema.safeParse({
    title: "Untrusted image",
    description: "",
    theme: { primary: "#1A2B3C", background: "#FFFFFF", text: "#17202A" },
    sections: [{
      id: "menu",
      type: "menu",
      heading: "Menu",
      cards: [{ title: "Item", imageUrl: "https://attacker.example/image.jpg" }],
    }],
  }).success, false);
});

test("CORS preflight allows authenticated project writes", async () => {
  const response = await fetch(`${baseUrl}/api/projects/00000000-0000-4000-8000-000000000001`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5173",
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });

  assert.equal(response.status, 204);
  assert.match(response.headers.get("access-control-allow-methods"), /PUT/);
  assert.match(response.headers.get("access-control-allow-headers"), /Authorization/i);
});

test("generation validates prompt and reports missing Gemini configuration", async () => {
  const invalid = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: " " }),
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, "Describe your website in at least 3 characters.");

  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "";
  try {
    const unconfigured = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "A thoughtful studio portfolio" }),
    });
    assert.equal(unconfigured.status, 503);
    assert.match((await unconfigured.json()).error, /GEMINI_API_KEY/);
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

test("project storage fails explicitly instead of pretending to persist without Supabase", async () => {
  const response = await fetch(`${baseUrl}/api/projects`);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Supabase server credentials/);
});

test("project payload accepts Supabase timestamp offsets and validates its website shape", async () => {
  const response = await fetch(`${baseUrl}/api/projects/00000000-0000-4000-8000-000000000001`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "A valid website description",
      createdAt: "2026-10-24T14:00:00+00:00",
      website: {
        title: "Example",
        description: "",
        theme: { primary: "#112233", background: "#ffffff", text: "#171717" },
        sections: [{ id: "hero", type: "hero", heading: "Hello", subheading: "", body: "", items: [] }],
      },
    }),
  });

  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Supabase server credentials/);
});

test("production generation rejects anonymous requests", async () => {
  const previousMode = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "A thoughtful studio portfolio" }),
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Authentication is not configured/);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
  }
});

test("production configuration fails fast when managed auth and storage are missing", () => {
  const previousMode = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assert.throws(requireProductionConfiguration, /SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
  }
});
