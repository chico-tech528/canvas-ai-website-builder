const IMAGE_SECTIONS = new Set([
  "hero",
  "products",
  "categories",
  "gallery",
  "menu",
  "team",
  "events",
  "blog",
  "location",
]);
const MAX_IMAGES = 8;
const MAX_CONCURRENT_SEARCHES = 4;

function cleanAttribution(value = "") {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
    .slice(0, 300);
}

async function searchCommonsImage(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: "1",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "960",
    format: "json",
  }).toString();

  const response = await fetch(url, {
    headers: { "User-Agent": "CanvasWebsiteBuilder/1.0 (website preview image search)" },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`Wikimedia Commons returned HTTP ${response.status}.`);

  const result = await response.json();
  const file = Object.values(result.query?.pages || {}).find((page) => page.imageinfo?.[0]?.thumburl);
  const info = file?.imageinfo?.[0];
  if (!info?.thumburl || !info.descriptionurl) return null;

  const imageUrl = new URL(info.thumburl);
  const pageUrl = new URL(info.descriptionurl);
  if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "thumb.wikimedia.org"
    || pageUrl.protocol !== "https:" || pageUrl.hostname !== "commons.wikimedia.org") {
    throw new Error("Wikimedia Commons returned an image URL outside the expected domains.");
  }

  const license = cleanAttribution(info.extmetadata?.LicenseShortName?.value) || "License details";
  const credit = cleanAttribution(info.extmetadata?.Artist?.value) || "Wikimedia Commons contributor";
  return {
    imageUrl: imageUrl.toString(),
    imagePage: pageUrl.toString(),
    imageCredit: credit,
    imageLicense: license,
  };
}

async function enrichWebsiteImages(website) {
  const candidates = website.sections
    .filter((section) => IMAGE_SECTIONS.has(section.type))
    .flatMap((section) => (section.cards || []).map((card) => ({
      card,
      query: card.title.slice(0, 160),
    })))
    .slice(0, MAX_IMAGES);
  let nextIndex = 0;

  async function searchNext() {
    while (nextIndex < candidates.length) {
      const candidate = candidates[nextIndex];
      nextIndex += 1;
      try {
        const image = await searchCommonsImage(candidate.query);
        if (image) Object.assign(candidate.card, image);
      } catch (error) {
        console.warn("Relevant image search failed:", error.message);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENT_SEARCHES, candidates.length) }, () => searchNext()),
  );
  return website;
}

module.exports = { enrichWebsiteImages, searchCommonsImage };
