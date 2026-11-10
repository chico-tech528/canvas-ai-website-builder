import { ArrowRight, ArrowUpRight, Heart, Menu, Plus, Search, ShoppingBag, Sparkles, Star } from "lucide-react";
import { useMemo, useState, type CSSProperties, type SyntheticEvent } from "react";
import toast from "react-hot-toast";
import type { ProductVisual, WebsiteCard, WebsiteSchema, WebsiteSection } from "../types";

const productImages: Record<ProductVisual, string[]> = {
  fashion: ["photo-1539109136881-3be0616acf4b", "photo-1529139574466-a303027c1d8b", "photo-1483985988355-763728e1935b"],
  skincare: ["photo-1608248543803-ba4f8c70ae0b", "photo-1601049541289-9b1b7bbbfe19", "photo-1611930022073-b7a4ba5fcccd"],
  home: ["photo-1616486338812-3dadae4b4ace", "photo-1600210492486-724fe5c67fb0", "photo-1616486029423-aaa4789e8c9a"],
  tech: ["photo-1523275335684-37898b6baf30", "photo-1505740420928-5e560c06d30e", "photo-1526170375885-4d8ecf77b99f"],
  food: ["photo-1540189549336-e6e99c3679fe", "photo-1565299624946-b28f40a0ae38", "photo-1555939594-58d7cb561ad1"],
  jewelry: ["photo-1611652022419-a9419f74343d", "photo-1617038220319-276d3cfab638", "photo-1599643478518-a784e5dc4c8f"],
  books: ["photo-1544947950-fa07a98d237f", "photo-1512820790803-83ca734da794", "photo-1543002588-bfa74002ed7e"],
  plants: ["photo-1485955900006-10f4d324d411", "photo-1501004318641-b39e6451bec6", "photo-1466692476868-aef1dfb1e735"],
  coffee: ["photo-1445116572660-236099ec97a0", "photo-1495474472287-4d71bcdd2085", "photo-1501339847302-ac426a4a7cbb"],
  art: ["photo-1579783902614-a3fb3927b6a5", "photo-1577083552431-6e5fd01aa342", "photo-1578301978693-85fa9c0320b9"],
  wellness: ["photo-1540555700478-4be289fbecef", "photo-1544367567-0f2fcb009e0b", "photo-1518611012118-696072aa579a"],
  people: ["photo-1534528741775-53994a69daeb", "photo-1500648767791-00dcc994a43e", "photo-1531123897727-8f129e1688ce"],
  architecture: ["photo-1600607687939-ce8a6c25118c", "photo-1600210492486-724fe5c67fb0", "photo-1600607687920-4e2a09cf159d"],
  nature: ["photo-1441974231531-c6227db76b6e", "photo-1470770841072-f978cf4d019e", "photo-1470252649378-9c29740c9fa8"],
  travel: ["photo-1469474968028-56623f02e42e", "photo-1500530855697-b586d89ba3ee", "photo-1476514525535-07fb3b4ae5f1"],
  music: ["photo-1516280440614-37939bbacd81", "photo-1511379938547-c1f69419868d", "photo-1501386761578-eac5c94b800a"],
  sports: ["photo-1461896836934-ffe607ba8211", "photo-1531415074968-036ba1b575da", "photo-1517649763962-0c623066013b"],
  learning: ["photo-1503676260728-1c00da094a0b", "photo-1509062522246-3755977927d7", "photo-1523580494863-6f3031224c94"],
  medical: ["photo-1576091160399-112ba8d25d1d", "photo-1559757148-5c350d0d3c56", "photo-1538108149393-fbbd81895907"],
  events: ["photo-1511795409834-ef04bbd61622", "photo-1492684223066-81342ee5ff30", "photo-1507504031003-b417219a0fde"],
  automotive: ["photo-1492144534655-ae79c964c9d7", "photo-1503376780353-7e6692767b70", "photo-1489824904134-891ab64532f1"],
  abstract: ["photo-1550684848-fac1c5b4e853", "photo-1550859492-d5da9d8e45f3", "photo-1557682250-33bd709cbe85"],
  workspace: ["photo-1497366754035-f200968a6e72", "photo-1497366216548-37526070297c", "photo-1497366811353-6870744d04b2"],
  general: ["photo-1490481651871-ab68de25d43d", "photo-1523275335684-37898b6baf30", "photo-1544947950-fa07a98d237f"],
};

function cardImage(card: WebsiteCard, index: number) {
  const photos = productImages[card.visual] || productImages.general;
  return `https://images.unsplash.com/${photos[index % photos.length]}?auto=format&fit=crop&w=720&q=82`;
}

function handleImageError(event: SyntheticEvent<HTMLImageElement>, fallback: string) {
  const image = event.currentTarget;
  if (image.dataset.fallback !== "true") {
    image.dataset.fallback = "true";
    image.src = fallback;
    image.parentElement?.querySelector<HTMLAnchorElement>(".image-attribution")?.setAttribute("hidden", "");
    return;
  }
  image.style.display = "none";
}

function inferVisual(card: WebsiteCard, context = ""): ProductVisual {
  if (card.visual !== "general") return card.visual;
  const text = `${context} ${card.title} ${card.description}`.toLowerCase();
  const matches: [RegExp, ProductVisual][] = [
    [/\b(skin|skincare|serum|cream|beauty|cosmetic|makeup)\b/, "skincare"],
    [/\b(clothing|fashion|apparel|dress|outfit|wear)\b/, "fashion"],
    [/\b(jewelry|jewellery|ring|necklace|earring|bracelet)\b/, "jewelry"],
    [/\b(home|interior|furniture|decor|ceramic|linen|tableware)\b/, "home"],
    [/\b(software|saas|technology|tech|app|ai|laptop|gadget|electronic)\b/, "tech"],
    [/\b(menu|dish|restaurant|food|meal|bakery|culinary|recipe)\b/, "food"],
    [/\b(book|reading|author|novel|publishing|library)\b/, "books"],
    [/\b(plant|garden|flower|floral|botanical)\b/, "plants"],
    [/\b(coffee|cafe|café|espresso|roast)\b/, "coffee"],
    [/\b(art|artist|painting|gallery|sculpture|creative)\b/, "art"],
    [/\b(wellness|yoga|spa|fitness|meditation|health)\b/, "wellness"],
    [/\b(team|people|staff|teacher|founder|speaker|coach|designer)\b/, "people"],
    [/\b(architecture|architect|building|property|real estate)\b/, "architecture"],
    [/\b(nature|forest|mountain|landscape|wildlife|outdoor)\b/, "nature"],
    [/\b(travel|neighborhood|landmark|itinerary|destination|tour|hotel|kyoto)\b/, "travel"],
    [/\b(music|concert|song|album|band|festival)\b/, "music"],
    [/\b(sport|athlete|training|game|team|running|cycling)\b/, "sports"],
    [/\b(learning|education|school|course|student|class|workshop)\b/, "learning"],
    [/\b(medical|clinic|doctor|patient|dental|care)\b/, "medical"],
    [/\b(event|venue|wedding|conference|gathering)\b/, "events"],
    [/\b(car|auto|vehicle|automotive|driving)\b/, "automotive"],
    [/\b(workspace|office|studio|coworking)\b/, "workspace"],
  ];
  return matches.find(([pattern]) => pattern.test(text))?.[1] || "general";
}

function extractPrice(value: string) {
  return value.match(/(?:[$€£¥￥₹]\s?\d[\d,]*(?:\.\d{1,2})?)/)?.[0] || "";
}

function withoutPrice(value: string) {
  return value.replace(/\s*(?:Price:\s*)?[$€£¥￥₹]\s?\d[\d,]*(?:\.\d{1,2})?/i, "").replace(/[\s.,;—-]+$/, "");
}

function inferMetric(value: string) {
  return value.match(/\b\d[\d,]*(?:\.\d+)?(?:\+|%)?\b/)?.[0] || "";
}

function inferTime(value: string) {
  return value.match(/\b(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s?(?:am|pm)\b/i)?.[0] || "";
}

const visualGlyphs: Record<ProductVisual, string> = {
  fashion: "✦",
  skincare: "◌",
  home: "⌂",
  tech: "⌘",
  food: "✿",
  jewelry: "◇",
  books: "▤",
  plants: "❋",
  coffee: "◒",
  art: "▧",
  wellness: "☼",
  people: "◉",
  architecture: "⌂",
  nature: "❋",
  travel: "↗",
  music: "♫",
  sports: "◈",
  learning: "▤",
  medical: "+",
  events: "✦",
  automotive: "◉",
  abstract: "◌",
  workspace: "▦",
  general: "✧",
};

function ProductGrid({ section, primary, onAdd, search = "" }: {
  section: WebsiteSection;
  primary: string;
  onAdd?: (card: WebsiteCard) => void;
  search?: string;
}) {
  const sourceCards: WebsiteCard[] = section.cards?.length
    ? section.cards
    : section.items.map((title) => ({ title, description: "", price: "", badge: "", visual: "general" as ProductVisual }));
  const cards = sourceCards.filter((card) =>
    !search || `${card.title} ${card.description} ${card.badge}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className={`site-section showcase-section content-${section.type} ${section.type === "products" || section.type === "menu" ? "product-section" : ""}`} id={section.id}>
      <div className="showcase-heading">
      <div className="site-section-heading"><span>{section.type === "products" ? "CURATED FOR YOU" : section.type === "menu" ? "FROM OUR KITCHEN" : section.type === "categories" ? "EXPLORE THE COLLECTION" : section.type === "gallery" ? "SELECTED WORK" : section.type === "team" ? "THE PEOPLE BEHIND IT" : section.type === "process" ? "HOW IT COMES TOGETHER" : section.type === "events" ? "WHAT'S HAPPENING" : section.type === "blog" ? "NOTES & STORIES" : section.type === "location" ? "FIND US" : section.type.toUpperCase()}</span><h2>{section.heading}</h2><p>{section.subheading || section.body}</p></div>
      {(section.type === "products" || section.type === "menu") && <span className="shop-text-link">{section.type === "menu" ? "Explore menu" : "Shop the collection"} <ArrowRight size={13} /></span>}
      </div>
      {cards.length > 0 ? (
        <div className={`showcase-grid ${section.type === "categories" ? "category-grid" : ""} ${section.type === "gallery" ? "gallery-grid" : ""} ${section.type === "logos" ? "logo-grid" : ""}`}>
          {cards.map((card, index) => (
            (() => {
              const visual = inferVisual(card, `${section.heading} ${section.subheading}`);
              const imageCard = { ...card, visual };
              const extractedPrice = ["products", "menu", "pricing"].includes(section.type) ? extractPrice(card.description) : "";
              const displayPrice = card.price || extractedPrice;
              const displayDescription = !card.price && extractedPrice ? withoutPrice(card.description) : card.description;
              return (
                <article className={`showcase-card card-${section.type} ${section.type === "categories" ? "category-card" : ""}`} key={`${card.title}-${index}`}>
              {["features", "services", "process"].includes(section.type) ? (
                <div className="showcase-icon" style={{ color: primary }} aria-hidden="true">
                  {section.type === "process" ? String(index + 1).padStart(2, "0") : visualGlyphs[visual]}
                </div>
              ) : (
                <div className="showcase-image" data-visual={visual}>
                  <span className="product-visual-fallback" aria-hidden="true">{visualGlyphs[visual]}</span>
                  <img src={card.imageUrl || cardImage(imageCard, index)} alt={card.title} loading="lazy" onError={(event) => handleImageError(event, cardImage(imageCard, index))} />
                  {card.imagePage && <a className="image-attribution" href={card.imagePage} target="_blank" rel="noreferrer" aria-label={`Image by ${card.imageCredit || "Wikimedia Commons contributor"}, licensed ${card.imageLicense || "under the listed license"}`}>
                    {card.imageCredit || "Wikimedia Commons"} · {card.imageLicense || "License"}
                  </a>}
                  {card.badge && <span className="product-badge">{card.badge}</span>}
                  {section.type === "products" && <button className="product-favorite" aria-label={`Save ${card.title}`} onClick={() => toast("Added to your favorites.")}><Heart size={14} /></button>}
                  {section.type === "categories" && <span className="category-overlay"><strong>{card.title}</strong><ArrowUpRight size={17} /></span>}
                  {section.type === "events" && <span className="event-date">{card.badge || inferTime(card.description) || "Upcoming"}</span>}
                </div>
              )}
              <div className="showcase-card-meta">
                <div><h3>{card.title}</h3>{displayDescription && <p>{displayDescription}</p>}</div>
                {displayPrice && <strong className="product-price">{displayPrice}</strong>}
              </div>
              {(section.type === "products" || section.type === "menu") && onAdd && <button className="add-to-cart" style={{ borderColor: `${primary}45` }} onClick={() => onAdd(card)}><Plus size={13} />{section.type === "menu" ? "Add to order" : "Add to bag"}</button>}
              {section.type === "blog" && <span className="card-link">Read story <ArrowUpRight size={13} /></span>}
              {section.type === "location" && <a className="card-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${card.title} ${card.description}`)}`} target="_blank" rel="noreferrer">View directions <ArrowUpRight size={13} /></a>}
                </article>
              );
            })()
          ))}
        </div>
      ) : (
        <div className="showcase-empty">Add content cards in the editor to build this section.</div>
      )}
    </section>
  );
}

function RenderSection({ section, primary, onAdd, search, primaryActionTarget, secondaryActionTarget }: {
  section: WebsiteSection;
  primary: string;
  onAdd: (card: WebsiteCard) => void;
  search: string;
  primaryActionTarget: string;
  secondaryActionTarget: string;
}) {
  switch (section.type) {
    case "hero": {
      const heroCard = section.cards?.[0];
      const heroFallback = heroCard
        ? cardImage({ ...heroCard, visual: inferVisual(heroCard, `${section.heading} ${section.subheading}`) }, 0)
        : "";
      return (
        <section className="site-hero" id={section.id}>
          <div className="site-eyebrow"><span style={{ backgroundColor: primary }} /> {section.body || "A little something different"}</div>
          <h1>{section.heading || "Made for what comes next."}</h1>
          <p>{section.subheading || section.body || "Thoughtful ideas, beautifully brought to life."}</p>
          <div className="site-actions">
            <a className="site-primary" style={{ backgroundColor: primary }} href={`#${primaryActionTarget}`}>{section.items[0] || "Let's get started"} <ArrowUpRight size={16} /></a>
            <a className="site-secondary" href={`#${secondaryActionTarget}`}>{section.items[1] || "Explore more"}</a>
          </div>
          {heroCard && <div className="hero-image"><img src={heroCard.imageUrl || heroFallback} alt={heroCard.title} onError={(event) => handleImageError(event, heroFallback)} />
            {heroCard.imagePage && <a className="image-attribution" href={heroCard.imagePage} target="_blank" rel="noreferrer" aria-label={`Image by ${heroCard.imageCredit || "Wikimedia Commons contributor"}, licensed ${heroCard.imageLicense || "under the listed license"}`}>
              {heroCard.imageCredit || "Wikimedia Commons"} · {heroCard.imageLicense || "License"}
            </a>}
          </div>}
          {!heroCard && <div className="hero-art" style={{ background: `radial-gradient(ellipse at 50% 110%, ${primary}88, transparent 64%), linear-gradient(145deg, ${primary}10, transparent 65%)` }}>
            <div className="art-sun" style={{ backgroundColor: primary }} />
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-caption">{section.subheading || "DESIGNED WITH INTENTION"}</div>
          </div>}
        </section>
      );
    }
    case "features":
    case "services":
      return <ProductGrid section={section} primary={primary} search={search} />;
    case "products":
    case "categories":
    case "gallery":
    case "menu":
    case "team":
    case "process":
    case "events":
    case "blog":
    case "location":
      return <ProductGrid section={section} primary={primary} onAdd={onAdd} search={search} />;
    case "about":
      return (
        <section className="site-section about-layout" id={section.id}>
          <div className="about-art" style={{ background: `linear-gradient(135deg, ${primary}24, ${primary}05)` }}><div className="about-circle" style={{ borderColor: `${primary}55` }} /><Sparkles style={{ color: primary }} size={30} /></div>
          <div className="site-section-heading"><span>A NOTE FROM US</span><h2>{section.heading}</h2><p>{section.body || section.subheading}</p></div>
        </section>
      );
    case "pricing":
      if (section.cards?.length) {
        return (
          <section className="site-section" id={section.id}>
            <div className="site-section-heading"><span>PLANS FOR YOUR NEEDS</span><h2>{section.heading}</h2><p>{section.subheading || section.body}</p></div>
            <div className="preview-grid">{section.cards.map((card, index) => {
              const price = card.price || extractPrice(card.description) || "Let’s talk";
              const description = !card.price && price !== "Let’s talk" ? withoutPrice(card.description) : card.description;
              return <article className={`price-card ${card.badge ? "featured" : ""}`} key={`${card.title}-${index}`}><span>{card.badge || card.title}</span><h3>{price}</h3><p>{description}</p><button className="site-primary" style={{ backgroundColor: primary }}>{card.title} <ArrowUpRight size={14} /></button></article>;
            })}</div>
          </section>
        );
      }
      return <ProductGrid section={section} primary={primary} search={search} />;
    case "faq":
      return (
        <section className="site-section faq-section" id={section.id}>
          <div className="site-section-heading"><span>GOOD TO KNOW</span><h2>{section.heading}</h2><p>{section.subheading || section.body}</p></div>
          <div className="faq-list">{(section.cards || []).map((card, index) => <details key={`${card.title}-${index}`}><summary>{card.title}<Plus size={15} /></summary><p>{card.description}</p></details>)}</div>
        </section>
      );
    case "stats":
      return (
        <section className="site-section" id={section.id}>
          <div className="site-section-heading"><span>BY THE NUMBERS</span><h2>{section.heading}</h2><p>{section.subheading || section.body}</p></div>
          <div className="stats-grid">{section.cards?.length ? section.cards.map((card, index) => <article className="stat-card" key={`${card.title}-${index}`}><strong style={{ color: primary }}>{card.price || inferMetric(card.description)}</strong><h3>{card.title}</h3><p>{card.description}</p></article>) : section.items.map((item, index) => <article className="stat-card" key={`${item}-${index}`}><strong style={{ color: primary }}>{index + 1}</strong><h3>{item}</h3></article>)}</div>
        </section>
      );
    case "schedule":
      return (
        <section className="site-section" id={section.id}>
          <div className="site-section-heading"><span>PLAN YOUR VISIT</span><h2>{section.heading}</h2><p>{section.subheading || section.body}</p></div>
          <div className="schedule-list">{section.cards?.length ? section.cards.map((card, index) => <article key={`${card.title}-${index}`}><strong>{card.title}</strong><span>{card.badge || card.price || inferTime(card.description)}</span><p>{card.description}</p></article>) : section.items.map((item, index) => <article key={`${item}-${index}`}><strong>{item}</strong></article>)}</div>
        </section>
      );
    case "logos":
      return (
        <section className="site-section" id={section.id}>
          <div className="site-section-heading"><span>TRUSTED BY</span><h2>{section.heading}</h2><p>{section.subheading || section.body}</p></div>
          <div className="logo-list">{(section.cards?.map((card) => card.title) || section.items).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
        </section>
      );
    case "banner":
      return <section className="promo-banner" id={section.id} style={{ backgroundColor: primary }}><div><span>{section.subheading}</span><h2>{section.heading}</h2><p>{section.body}</p></div><button>Discover more <ArrowUpRight size={15} /></button></section>;
    case "testimonials":
      return (
        <section className="site-section testimonial-section" id={section.id}>
          {section.cards?.length ? <div className="testimonial-grid">{section.cards.map((card, index) => <article key={`${card.title}-${index}`}><div className="testimonial-stars" style={{ color: primary }}><Star /><Star /><Star /><Star /><Star /></div><h2>“{card.description}”</h2><p>{card.title}</p></article>)}</div> : <><div className="testimonial-stars" style={{ color: primary }}><Star /><Star /><Star /><Star /><Star /></div><h2>“{section.body || section.subheading || section.heading}”</h2><p>{section.heading}</p></>}
        </section>
      );
    case "contact":
      return (
        <section className="site-section contact-section" id={section.id}><div className="site-section-heading"><span>YOUR NEXT CHAPTER</span><h2>{section.heading}</h2><p>{section.subheading || section.body}</p></div><div className="contact-form"><input placeholder="Your name" aria-label="Your name" /><input placeholder="Email address" aria-label="Email address" /><textarea placeholder="Tell us a little about it..." aria-label="Message" /><button className="site-primary" style={{ backgroundColor: primary }}>Send a note <ArrowUpRight size={16} /></button></div></section>
      );
    case "footer":
      return <footer className="site-footer"><span>{section.heading || "Made with intention."}</span><span>{section.subheading || "© 2025 · All rights reserved"}</span></footer>;
    default:
      return null;
  }
}

export default function WebsitePreview({ website, mode }: { website: WebsiteSchema; mode: "desktop" | "tablet" | "mobile" }) {
  const [cartCount, setCartCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isStore = website.sections.some((section) => section.type === "products" || section.type === "categories");
  const navigation = useMemo(
    () => website.sections.filter((section) => !["hero", "footer", "banner"].includes(section.type)).slice(0, 4),
    [website.sections],
  );
  const primaryActionTarget = website.sections.find((section) => section.type === "products" || section.type === "menu")?.id
    || website.sections.find((section) => section.type !== "hero" && section.type !== "footer")?.id
    || "";
  const secondaryActionTarget = website.sections.find((section) => section.type === "categories" || section.type === "about")?.id
    || primaryActionTarget;
  function addToCart(card: WebsiteCard) {
    setCartCount((count) => count + 1);
    toast.success(`${card.title} added to your bag.`);
  }
  return (
    <div id="top" className={`preview-frame preview-${mode} style-${website.style || "editorial"} ${isStore ? "preview-store" : ""}`} style={{ backgroundColor: website.theme.background, color: website.theme.text, "--store-accent": website.theme.primary } as CSSProperties}>
      <header className="site-nav">
        <a className="site-brand" href="#top"><span style={{ backgroundColor: website.theme.primary }} />{website.title}</a>
        <nav>{navigation.map((section) => <a key={section.id} href={`#${section.id}`}>{section.heading}</a>)}</nav>
        {isStore ? <div className="store-nav-actions">{searchOpen && <input className="store-search" autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the collection" aria-label="Search products" />}<button className="store-icon-button" aria-label="Search" onClick={() => setSearchOpen((open) => !open)}><Search size={15} /></button><button className="store-cart" aria-label={`Shopping bag, ${cartCount} items`}><ShoppingBag size={15} /><span>Bag ({cartCount})</span></button></div> : <button className="nav-cta" style={{ borderColor: `${website.theme.primary}55`, color: website.theme.primary }}>Let&apos;s talk <ArrowUpRight size={14} /></button>}
        <button className="mobile-menu" aria-label="Open menu"><Menu size={18} /></button>
      </header>
      {website.sections.map((section) => <RenderSection key={section.id} section={section} primary={website.theme.primary} onAdd={addToCart} search={search} primaryActionTarget={primaryActionTarget} secondaryActionTarget={secondaryActionTarget} />)}
      {!website.sections.some((section) => section.type === "footer") && <footer className="site-footer"><span>{website.title}</span><span>© 2025 · Made with intention.</span></footer>}
    </div>
  );
}
