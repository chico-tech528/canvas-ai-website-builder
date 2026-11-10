export type SectionType =
  | "hero"
  | "about"
  | "features"
  | "services"
  | "products"
  | "categories"
  | "gallery"
  | "menu"
  | "faq"
  | "banner"
  | "team"
  | "stats"
  | "process"
  | "events"
  | "blog"
  | "location"
  | "schedule"
  | "logos"
  | "pricing"
  | "testimonials"
  | "contact"
  | "footer";

export interface WebsiteSection {
  id: string;
  type: SectionType;
  heading: string;
  subheading: string;
  body: string;
  items: string[];
  cards?: WebsiteCard[];
}

export type ProductVisual = "fashion" | "skincare" | "home" | "tech" | "food" | "jewelry" | "books" | "plants" | "coffee" | "art" | "wellness" | "people" | "architecture" | "nature" | "travel" | "music" | "sports" | "learning" | "medical" | "events" | "automotive" | "abstract" | "workspace" | "general";

export interface WebsiteCard {
  title: string;
  description: string;
  price: string;
  badge: string;
  visual: ProductVisual;
  imageUrl?: string;
  imagePage?: string;
  imageCredit?: string;
  imageLicense?: string;
}

export interface WebsiteTheme {
  primary: string;
  background: string;
  text: string;
}

export interface WebsiteSchema {
  title: string;
  description: string;
  style?: "editorial" | "minimal" | "playful" | "luxury" | "bold" | "organic" | "tech";
  theme: WebsiteTheme;
  sections: WebsiteSection[];
}

export interface Project {
  id: string;
  prompt: string;
  website: WebsiteSchema;
  createdAt: string;
}
