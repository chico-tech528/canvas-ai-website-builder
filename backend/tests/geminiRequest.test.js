const assert = require("node:assert/strict");
const { test } = require("node:test");
const { isTimeout, requestGemini, toPublicGeminiError, withTransientRetry } = require("../utils/geminiRequest");

test("retries a transient Gemini error once and returns a later success", async () => {
  let calls = 0;
  const result = await withTransientRetry(async () => {
    calls += 1;
    if (calls === 1) {
      const error = new Error("temporary overload");
      error.status = 503;
      throw error;
    }
    return "generated";
  }, { delayMs: 0 });

  assert.equal(result, "generated");
  assert.equal(calls, 2);
});

test("does not retry non-transient Gemini errors", async () => {
  let calls = 0;
  await assert.rejects(withTransientRetry(async () => {
    calls += 1;
    const error = new Error("invalid API key");
    error.status = 400;
    throw error;
  }, { delayMs: 0 }), /invalid API key/);

  assert.equal(calls, 1);
});

test("retries temporary Gemini network failures", async () => {
  let calls = 0;
  const result = await withTransientRetry(async () => {
    calls += 1;
    if (calls === 1) throw new Error("Error fetching from Gemini: fetch failed");
    return "generated";
  }, { delayMs: 0 });

  assert.equal(result, "generated");
  assert.equal(calls, 2);
});

test("recognizes and retries timed-out Gemini requests", async () => {
  let calls = 0;
  const result = await withTransientRetry(async () => {
    calls += 1;
    if (calls === 1) {
      const error = new Error("The operation was aborted due to timeout");
      error.name = "AbortError";
      throw error;
    }
    return "generated";
  }, { delayMs: 0 });

  assert.equal(result, "generated");
  assert.equal(calls, 2);
  assert.equal(isTimeout(Object.assign(new Error("request timed out"), { code: "ETIMEDOUT" })), true);
});

test("converts upstream overloads to a safe, actionable message", async () => {
  await assert.rejects(requestGemini(async () => {
    const unavailable = new Error("provider details");
    unavailable.status = 503;
    throw unavailable;
  }), (error) => {
    assert.equal(error.status, 503);
    assert.match(error.message, /temporarily busy or unavailable/);
    assert.doesNotMatch(error.message, /provider details/);
    return true;
  });
});

test("maps Gemini timeouts to a clear retry message without exposing provider details", () => {
  const error = toPublicGeminiError(Object.assign(new Error("private request timeout detail"), { name: "AbortError" }));

  assert.equal(error.status, 503);
  assert.match(error.message, /took too long to respond/);
  assert.doesNotMatch(error.message, /private request timeout detail/);
});

test("maps Gemini quota responses without exposing provider details", () => {
  const error = toPublicGeminiError(Object.assign(new Error("private provider details"), { status: 429 }));

  assert.equal(error.status, 503);
  assert.match(error.message, /quota/);
  assert.doesNotMatch(error.message, /private provider details/);
});
