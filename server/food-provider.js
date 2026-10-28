const base = 'https://generativelanguage.googleapis.com/v1beta';
const transient = new Set([500, 502, 503, 504]);

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

// Query the provider rather than guess a replacement model ID. Only plain-text
// Flash models explicitly advertising generateContent qualify as alternatives.
async function alternativeModel(model, headers, signal, fetchImpl) {
  try {
    const response = await fetchImpl(`${base}/models?pageSize=1000`, { headers, signal });
    if (!response.ok) return null;
    const body = await response.json();
    return (Array.isArray(body.models) ? body.models : [])
      .filter(item => typeof item.name === 'string' &&
        /^models\/gemini-[0-9.]+-flash(?:-lite)?$/.test(item.name) &&
        item.name !== `models/${model}` &&
        item.supportedGenerationMethods?.includes('generateContent'))
      .sort((a, b) => Number(a.name.endsWith('-lite')) - Number(b.name.endsWith('-lite')) ||
        b.name.localeCompare(a.name, undefined, { numeric: true }))
      [0]?.name.slice(7) || null;
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  }
}

export async function requestFoodProvider({ model, apiKey, payload }, {
  fetchImpl = globalThis.fetch,
  sleep = pause,
  timeoutMs = 25000,
} = {}) {
  // One deadline covers generation, backoff, discovery and fallback together.
  const signal = AbortSignal.timeout(timeoutMs);
  const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
  const send = selected => fetchImpl(`${base}/models/${encodeURIComponent(selected)}:generateContent`, {
    method: 'POST', headers, signal, body: JSON.stringify(payload),
  });
  let response = await send(model);
  if (response.ok || (!transient.has(response.status) && response.status !== 404)) return response;
  if (transient.has(response.status)) {
    await response.body?.cancel();
    await sleep(600, signal);
    response = await send(model);
    if (response.ok || (!transient.has(response.status) && response.status !== 404)) return response;
  }
  const alternative = await alternativeModel(model, headers, signal, fetchImpl);
  if (!alternative) return response;
  await response.body?.cancel();
  return send(alternative);
}
