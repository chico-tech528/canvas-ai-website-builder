const assert = require("node:assert/strict");
const { test } = require("node:test");
const { isOnlineStorePrompt } = require("../utils/promptIntent");

test("coffee shops and restaurants do not require ecommerce product sections", () => {
  assert.equal(isOnlineStorePrompt("A coffee shop with a signature drinks menu"), false);
  assert.equal(isOnlineStorePrompt("A restaurant website with food and opening hours"), false);
  assert.equal(isOnlineStorePrompt("A bakery website with fresh bread and pastries"), false);
});

test("online stores and retail shops still require product sections", () => {
  assert.equal(isOnlineStorePrompt("Build an ecommerce website for handmade ceramics"), true);
  assert.equal(isOnlineStorePrompt("Create an online store for hiking gear"), true);
  assert.equal(isOnlineStorePrompt("Build a shop for handmade jewelry"), true);
});
