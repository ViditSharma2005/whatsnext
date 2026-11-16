// One free-tier Gemini request per scheduled run. Do not link billing to the
// Google project if you want the free tier only; quotas and availability may change.
const { GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing GEMINI_API_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Google lists this model's standard text input/output on its free tier.
// Check model availability and pricing in Google AI Studio before setting up.
const MODEL = 'gemini-3.1-flash-lite';
const prompt = 'Write 20 distinct, original, punchy one-sentence motivational quotes for coding competition participants. Playfully challenging and a little spicy, never hateful, discriminatory, sexually explicit, or personally abusive. Avoid profanity, threats and personal attacks. Each quote must be 10 to 130 characters. Return an object containing a quotes array of 20 strings; no attribution.';
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
  method: 'POST',
  headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT', properties: { quotes: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['quotes'] },
      maxOutputTokens: 4096,
    },
  }),
  signal: AbortSignal.timeout(60000),
});
if (!response.ok) throw new Error(`Gemini request failed (HTTP ${response.status}). The previous quotes are unchanged.`);
const result = await response.json();
const candidate = result.candidates?.[0];
if (!candidate || candidate.finishReason !== 'STOP') throw new Error('Gemini did not complete a usable response. The previous quotes are unchanged.');
const text = (candidate.content?.parts || []).filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('');
let parsed;
try { parsed = JSON.parse(text); } catch { throw new Error('Gemini returned invalid JSON. The previous quotes are unchanged.'); }
const strings = [...new Set((Array.isArray(parsed.quotes) ? parsed.quotes : [])
  .filter(x => typeof x === 'string')
  .map(x => x.trim())
  .filter(x => x.length >= 10 && x.length <= 130))];
if (strings.length < 5) throw new Error('Too few valid quotes. The previous quotes are unchanged.');
const saved = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/quotes?on_conflict=text`, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    ...(SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }),
    'Content-Type': 'application/json',
    Prefer: 'resolution=ignore-duplicates,return=minimal',
  },
  body: JSON.stringify(strings.map(text => ({ text }))),
  signal: AbortSignal.timeout(10000),
});
if (!saved.ok) throw new Error(`Database insert failed (HTTP ${saved.status}). The previous quotes are unchanged.`);
console.log(`Processed ${strings.length} valid quotes (duplicates are skipped).`);
