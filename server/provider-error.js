// Never forward Google's raw body, URLs, credentials or request details.
export async function providerError(response) {
  const body = await response.json().catch(() => null);
  const reasons = (Array.isArray(body?.error?.details) ? body.error.details : [])
    .map(detail => detail?.reason);
  if (response.status === 429) return {
    status: 429,
    error: 'AI usage limit reached. Check the Gemini project quota and billing, or try again later.',
    code: 'AI_QUOTA_EXCEEDED',
  };
  if (response.status === 401 || reasons.includes('API_KEY_INVALID') || reasons.includes('API_KEY_EXPIRED')) return {
    status: 503,
    error: 'The AI service key is invalid or expired. Update GEMINI_API_KEY for Production in Vercel, then redeploy.',
    code: 'AI_KEY_INVALID',
  };
  if (response.status === 403 || reasons.some(reason => ['SERVICE_DISABLED', 'API_KEY_SERVICE_BLOCKED', 'API_KEY_HTTP_REFERRER_BLOCKED', 'API_KEY_IP_ADDRESS_BLOCKED'].includes(reason))) return {
    status: 503,
    error: 'Google blocked this AI key. Check the key’s API restrictions and that the Generative Language API is enabled in its project.',
    code: 'AI_ACCESS_BLOCKED',
  };
  if (response.status === 404) return {
    status: 503,
    error: 'The configured AI model is unavailable. Check GEMINI_MODEL in Vercel and redeploy with a supported model.',
    code: 'AI_MODEL_UNAVAILABLE',
  };
  return {
    status: 502,
    error: 'The AI provider could not process the request. Please try again later.',
    code: 'AI_PROVIDER_ERROR',
  };
}
