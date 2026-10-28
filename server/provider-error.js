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
  // Inspect only known phrases; never echo provider-controlled text.
  const message = typeof body?.error?.message === 'string' ? body.error.message : '';
  if (response.status === 400) {
    if (/location.*not supported|not available in your (?:country|region)/i.test(message)) return {
      status: 503,
      error: 'Gemini is unavailable in the server’s region. Reference: AI_REGION_UNSUPPORTED.',
      code: 'AI_REGION_UNSUPPORTED',
    };
    if (/billing|paid plan|free tier.*(?:not available|not supported)/i.test(message)) return {
      status: 503,
      error: 'This Gemini project or model requires billing. Check the project’s plan in Google AI Studio. Reference: AI_BILLING_REQUIRED.',
      code: 'AI_BILLING_REQUIRED',
    };
    if (/response[_ ]?schema|response[_ ]?mime[_ ]?type|structured output/i.test(message)) return {
      status: 502,
      error: 'The selected model rejected the structured nutrition response format. Reference: AI_RESPONSE_FORMAT.',
      code: 'AI_RESPONSE_FORMAT',
    };
    return {
      status: 502,
      error: 'Gemini rejected the request settings. Reference: AI_REQUEST_REJECTED (Google 400).',
      code: 'AI_REQUEST_REJECTED',
    };
  }
  if ([500, 502, 503, 504].includes(response.status)) return {
    status: 502,
    error: `Gemini is temporarily failing or overloaded. Reference: AI_UPSTREAM_${response.status}.`,
    code: `AI_UPSTREAM_${response.status}`,
  };
  return {
    status: 502,
    error: 'The AI provider could not process the request. Please try again later.',
    code: 'AI_PROVIDER_ERROR',
  };
}
