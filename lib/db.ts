const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export function dbConfigured() { return Boolean(base && key); }
export async function dbFetch(path:string, init:RequestInit = {}) {
  if (!base || !key) throw new Error('Database is not configured');
  const r = await fetch(`${base}/rest/v1/${path}`, { ...init, cache:'no-store', headers:{ apikey:key, ...(key.startsWith('sb_secret_') ? {} : { Authorization:`Bearer ${key}` }), 'Content-Type':'application/json', ...init.headers }, signal:AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`Database error ${r.status}`);
  if (r.status === 204) return null;
  return r.json();
}
