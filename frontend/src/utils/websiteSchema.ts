import type { SectionType, WebsiteSchema } from "../types";

const sectionTypes: SectionType[] = [
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

function isAllowedImageUrl(value: unknown, hostname: string) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === hostname;
  } catch {
    return false;
  }
}

export function isWebsiteSchema(value: unknown): value is WebsiteSchema {
  if (!value || typeof value !== "object") return false;
  const website = value as Partial<WebsiteSchema>;
  if (typeof website.title !== "string" || typeof website.description !== "string") return false;
  if (!website.theme || !["primary", "background", "text"].every((key) => {
    const color = website.theme?.[key as keyof typeof website.theme];
    return typeof color === "string" && /^#[\da-fA-F]{6}$/.test(color);
  })) return false;
  if (!Array.isArray(website.sections)) return false;
  return website.sections.every((section) =>
    !!section
    && typeof section.id === "string"
    && sectionTypes.includes(section.type)
    && typeof section.heading === "string"
    && typeof section.subheading === "string"
    && typeof section.body === "string"
    && Array.isArray(section.items)
    && section.items.every((item) => typeof item === "string")
    && (section.cards === undefined || (
      Array.isArray(section.cards)
      && section.cards.every((card) =>
        !!card
        && typeof card.title === "string"
        && typeof card.description === "string"
        && typeof card.price === "string"
        && typeof card.badge === "string"
        && typeof card.visual === "string"
        && (card.imageUrl === undefined || isAllowedImageUrl(card.imageUrl, "thumb.wikimedia.org"))
        && (card.imagePage === undefined || isAllowedImageUrl(card.imagePage, "commons.wikimedia.org"))
        && (card.imageCredit === undefined || typeof card.imageCredit === "string")
        && (card.imageLicense === undefined || typeof card.imageLicense === "string"),
      )
    )),
  );
}
