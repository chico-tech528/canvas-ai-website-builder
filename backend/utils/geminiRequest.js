const RETRYABLE_STATUSES = new Set([500, 503, 504]);
const RETRYABLE_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ECONNREFUSED", "EHOSTUNREACH"]);

function getStatus(error) {
  const status = Number(error?.status);
  return Number.isInteger(status) ? status : 0;
}

function isTimeout(error) {
  const name = String(error?.name || "").toLowerCase();
  const message = String(error?.message || "");
  return /abort|timeout/.test(name)
    || error?.code === "ETIMEDOUT"
    || /timed?\s*out|timeout|operation was aborted|aborted due to timeout/i.test(message);
}

function isRetryable(error) {
  const status = getStatus(error);
  return RETRYABLE_STATUSES.has(status)
    || isTimeout(error)
    || RETRYABLE_CODES.has(error?.code)
    || (status === 0 && /fetch failed|network error|socket hang up|connection reset/i.test(error?.message || ""));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withTransientRetry(operation, { attempts = 2, delayMs = 750 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === attempts || !isRetryable(error)) {
        throw error;
      }
      await wait(delayMs * attempt);
    }
  }
  throw new Error("Gemini request did not complete.");
}

function toPublicGeminiError(error) {
  const status = getStatus(error);
  const timedOut = isTimeout(error);
  const publicError = new Error(
    status === 429
      ? "Gemini is rate-limiting requests or the project quota has been reached. Check your Google AI quota and try again later."
      : RETRYABLE_STATUSES.has(status)
        ? "Gemini is temporarily busy or unavailable. Please try again in a few moments."
        : timedOut
          ? "Gemini took too long to respond. It may be temporarily overloaded; please try again. If this keeps happening, check the backend connection and Gemini model availability."
        : status >= 400 && status < 500
          ? "Gemini rejected the request. Check the configured API key, model name, and Google AI project access."
          : "Canvas could not connect to Gemini. Check backend network access and try again.",
    { cause: error },
  );
  publicError.status = status === 429 ? 503 : status >= 400 && status < 500 ? 502 : 503;
  return publicError;
}

async function requestGemini(operation) {
  try {
    return await withTransientRetry(operation);
  } catch (error) {
    throw toPublicGeminiError(error);
  }
}

module.exports = { isTimeout, requestGemini, toPublicGeminiError, withTransientRetry };
