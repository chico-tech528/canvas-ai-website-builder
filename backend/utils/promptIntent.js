function isOnlineStorePrompt(prompt) {
  const explicitCommerceIntent = /\b(?:e[- ]?commerce|online\s+(?:store|shop)|web\s*shop|storefront|retail|shopping|product\s+catalog)\b/i;
  if (explicitCommerceIntent.test(prompt)) return true;

  const hospitalityIntent = /\b(?:coffee\s+shop|cafe|café|restaurant|bakery|tea\s+house|wine\s+bar|diner|eatery|food\s+truck)\b/i;
  return !hospitalityIntent.test(prompt) && /\b(?:shop|store)\b/i.test(prompt);
}

module.exports = { isOnlineStorePrompt };
