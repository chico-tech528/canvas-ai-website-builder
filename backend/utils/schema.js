const { z } = require("zod");

function isCommonsUrl(value, hostname) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === hostname;
  } catch {
    return false;
  }
}

const commonsImageUrl = z.string().url().refine((value) => isCommonsUrl(value, "thumb.wikimedia.org"));
const commonsPageUrl = z.string().url().refine((value) => isCommonsUrl(value, "commons.wikimedia.org"));

const sectionTypes = [
  "hero",
  "about",
  "features",
  "services",
  "products",
  "categories",
  "gallery",
  "menu",
  "faq",
  "banner",
  "team",
  "stats",
  "process",
  "events",
  "blog",
  "location",
  "schedule",
  "logos",
  "pricing",
  "testimonials",
  "contact",
  "footer",
];

const sectionSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(sectionTypes),
  heading: z.string().max(180).default(""),
  subheading: z.string().max(400).default(""),
  body: z.string().max(1200).default(""),
  items: z.array(z.string().max(180)).max(8).default([]),
  cards: z.array(z.object({
    title: z.string().min(1).max(120),
    description: z.string().max(300).default(""),
    price: z.string().max(40).default(""),
    badge: z.string().max(40).default(""),
    visual: z.enum(["fashion", "skincare", "home", "tech", "food", "jewelry", "books", "plants", "coffee", "art", "wellness", "people", "architecture", "nature", "travel", "music", "sports", "learning", "medical", "events", "automotive", "abstract", "workspace", "general"]).default("general"),
    imageUrl: commonsImageUrl.optional(),
    imagePage: commonsPageUrl.optional(),
    imageCredit: z.string().max(300).optional(),
    imageLicense: z.string().max(80).optional(),
  }).transform((card) => {
    if (card.price) return card;
    const match = card.description.match(/(?:Price:\s*)?([$€£¥￥₹]\s?\d[\d,]*(?:\.\d{1,2})?)/i);
    if (!match) return card;
    return {
      ...card,
      price: match[1],
      description: card.description.replace(match[0], "").replace(/[\s.,;—-]+$/, ""),
    };
  })).max(8).default([]),
});

const websiteSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(300).default(""),
  style: z.enum(["editorial", "minimal", "playful", "luxury", "bold", "organic", "tech"]).default("editorial"),
  theme: z.object({
    primary: z.string().regex(/^#[\da-fA-F]{6}$/).default("#7c5cff"),
    background: z.string().regex(/^#[\da-fA-F]{6}$/).default("#ffffff"),
    text: z.string().regex(/^#[\da-fA-F]{6}$/).default("#171717"),
  }).default({}),
  sections: z.array(sectionSchema).min(1).max(16),
});

module.exports = { sectionTypes, websiteSchema };
