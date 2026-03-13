import api from '../utils/api';

/**
 * API call with automatic retry on failure.
 * Retries up to `maxRetries` times with exponential backoff.
 */
export async function apiWithRetry(url, options = {}, maxRetries = 2) {
  const { method = 'get', ...rest } = options;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await api[method](url, rest);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        console.warn(`[apiWithRetry] Retrying ${url} (attempt ${attempt + 2}/${maxRetries + 1})`);
      }
    }
  }
  throw lastError;
}
