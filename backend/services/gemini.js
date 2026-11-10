const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { websiteSchema } = require("../utils/schema");
const { enrichWebsiteImages } = require("./imageSearch");
const { requestGemini } = require("../utils/geminiRequest");
const { isOnlineStorePrompt } = require("../utils/promptIntent");
const { z } = require("zod");

const paletteSchema = z.object({
  primary: z.string().regex(/^#[\da-fA-F]{6}$/),
  background: z.string().regex(/^#[\da-fA-F]{6}$/),
  text: z.string().regex(/^#[\da-fA-F]{6}$/),
});

const generatedWebsiteSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    style: { type: SchemaType.STRING, enum: ["editorial", "minimal", "playful", "luxury", "bold", "organic", "tech"] },
    theme: {
      type: SchemaType.OBJECT,
      properties: {
        primary: { type: SchemaType.STRING },
        background: { type: SchemaType.STRING },
        text: { type: SchemaType.STRING },
      },
      required: ["primary", "background", "text"],
    },
    sections: {
      type: SchemaType.ARRAY,
      minItems: 4,
      maxItems: 8,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          type: { type: SchemaType.STRING, enum: ["hero", "about", "features", "services", "products", "categories", "gallery", "menu", "faq", "banner", "team", "stats", "process", "events", "blog", "location", "schedule", "logos", "pricing", "testimonials", "contact", "footer"] },
          heading: { type: SchemaType.STRING },
          subheading: { type: SchemaType.STRING },
          body: { type: SchemaType.STRING },
          items: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          cards: {
            type: SchemaType.ARRAY,
            maxItems: 8,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
              },
              required: ["title", "description"],
            },
          },
        },
        required: ["id", "type", "heading", "subheading", "body", "items", "cards"],
      },
    },
  },
  required: ["title", "description", "style", "theme", "sections"],
};

function getModel(responseSchema) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("Gemini is not configured. Add GEMINI_API_KEY to backend/.env.");
    error.status = 503;
    throw error;
  }

  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7,
    },
  });
}

async function generateWebsite(prompt) {
  const model = getModel(generatedWebsiteSchema);
  const result = await requestGemini(() => model.generateContent(
    `Create a polished, cohesive website specification from this request: "${prompt}".
Return only JSON matching this shape:
{
  "title": "string",
  "description": "string",
  "style": "editorial|minimal|playful|luxury|bold|organic|tech",
  "theme": { "primary": "#6-digit hex", "background": "#6-digit hex", "text": "#6-digit hex" },
  "sections": [
    { "id": "unique-kebab-case-id", "type": "hero|about|features|services|products|categories|gallery|menu|faq|banner|team|stats|process|events|blog|location|schedule|logos|pricing|testimonials|contact|footer", "heading": "string", "subheading": "string", "body": "string", "items": ["short item"], "cards": [{ "title": "specific item name", "description": "specific details, including a real price, metric, or label here when relevant" }] }
  ]
}
Use 4 to 8 relevant sections, prioritizing every distinct content area the user explicitly requests over decorative sections. Put one hero first and a footer last. Choose section types and order for the actual request, not a fixed template. Use the closest semantic blocks: products/categories for stores, menu for restaurants, gallery for portfolios/architecture, team for staff, events/schedule/location for venues, blog for articles, stats for measurable highlights, process for steps, FAQ for questions, and services/features for agencies or software. If the user asks for opening hours, class times, or an itinerary, include a schedule section; for addresses or directions, include a location section; for reservations, bookings, or inquiries, include a contact section. For an online store, include categories and a products section with at least 4 named products and realistic prices. Preserve all concrete details the user requested (names, audience, features, location, offerings, hours, counts, and calls to action) in the generated headings, descriptions, items, or cards; do not silently omit requested details. Do not substitute generic filler or reuse a canned website. Pick a visual style and color palette that fit the prompt. Put a representative visual card on the hero when useful. Include "cards" on every section (empty only when the section does not use cards); each card has a specific title and description. Put prices, metrics, and labels in the description when relevant. Return a hero first and a footer last.`,
    { timeout: 55_000 },
  ));

  const raw = result.response.text();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const error = new Error("The AI returned an invalid response. Please try again.");
    error.status = 502;
    throw error;
  }

  const validated = websiteSchema.safeParse(parsed);
  if (validated.success) {
    const shopRequested = isOnlineStorePrompt(prompt);
    const productSections = validated.data.sections.filter((section) => section.type === "products");
    if (shopRequested && !productSections.some((section) => section.cards.length >= 4)) {
      const error = new Error("The AI response did not include enough specific products for this online store. Please try again.");
      error.status = 502;
      throw error;
    }
  }
  const sectionIds = validated.success ? validated.data.sections.map((section) => section.id) : [];
  const hasRequiredSections = validated.success
    && validated.data.sections.length >= 4
    && validated.data.sections.length <= 8
    && validated.data.sections[0].type === "hero"
    && validated.data.sections.at(-1).type === "footer"
    && new Set(sectionIds).size === sectionIds.length;
  if (!validated.success || !hasRequiredSections) {
    const error = new Error("The AI response did not match the required website format. Please try again.");
    error.status = 502;
    throw error;
  }
  return enrichWebsiteImages(validated.data);
}

async function generatePalette(prompt) {
  const model = getModel({
    type: SchemaType.OBJECT,
    properties: {
      primary: { type: SchemaType.STRING },
      background: { type: SchemaType.STRING },
      text: { type: SchemaType.STRING },
    },
    required: ["primary", "background", "text"],
  });
  const result = await requestGemini(() => model.generateContent(
    `Create an accessible, cohesive 3-color website palette for this creative direction: "${prompt}".
Return only JSON with exactly these keys: primary, background, text. Each value must be a six-digit hex color including #. Ensure text has strong contrast against background.`,
    { timeout: 55_000 },
  ));
  let parsed;
  try {
    parsed = JSON.parse(result.response.text());
  } catch {
    const error = new Error("The AI returned an invalid color palette. Please try again.");
    error.status = 502;
    throw error;
  }
  const validated = paletteSchema.safeParse(parsed);
  if (!validated.success) {
    const error = new Error("The AI returned colors in an unexpected format. Please try again.");
    error.status = 502;
    throw error;
  }
  return validated.data;
}

module.exports = { generateWebsite, generatePalette };
