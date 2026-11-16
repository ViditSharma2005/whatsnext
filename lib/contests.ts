import { unstable_cache } from 'next/cache';
import { dbConfigured, dbFetch } from './db';
import { Contest, ContestResponse, Platform } from './types';
const API = 'https://competeapi.vercel.app/contests/upcoming/';
const CF = 'https://codeforces.com/api/contest.list';
const valid:Platform[] = ['leetcode','codechef','codeforces','gfg'];
let memory:ContestResponse | null = null;
async function request(url:string) { const r = await fetch(url, { cache:'no-store', headers:{'User-Agent':'WhatsNextContestCalendar/1.0'}, signal:AbortSignal.timeout(5000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
function safeContest(x:any):Contest | null {
  if (!valid.includes(x.site) || typeof x.title !== 'string' || !Number.isFinite(x.startTime) || !Number.isFinite(x.endTime)) return null;
  try {
    const u = new URL(x.url); if (u.protocol !== 'https:') return null;
    const hosts:Record<string,string[]> = {leetcode:['leetcode.com','www.leetcode.com'],codechef:['codechef.com','www.codechef.com'],codeforces:['codeforces.com','www.codeforces.com'],gfg:['geeksforgeeks.org','www.geeksforgeeks.org','practice.geeksforgeeks.org']};
    if (!hosts[x.site]?.includes(u.hostname)) return null;
    // CompeteAPI multiplies LeetCode's seconds by 60 again. Correct only its known 90-hour weekly/biweekly signature.
    let end = x.endTime;
    if (x.site === 'leetcode' && /^(weekly|biweekly) contest/i.test(x.title) && end - x.startTime === 324000000) end = x.startTime + 5400000;
    if (end <= x.startTime) return null;
    const cfId = x.site === 'codeforces' ? u.pathname.match(/^\/contests?\/(\d+)\/?$/)?.[1] : undefined;
    // Preserve a stable identity across the two Codeforces URL formats.
    const id = cfId ? `codeforces:/contest/${cfId}` : `${x.site}:${u.pathname}`;
    // The singular /contest route redirects to the homepage before the start.
    // Return the official contest detail route for future rounds.
    const url = cfId && x.startTime > Date.now() ? `https://codeforces.com/contests/${cfId}` : u.toString();
    return {id,platform:x.site,name:x.title,url,startTime:new Date(x.startTime).toISOString(),endTime:new Date(end).toISOString(),durationMin:(end-x.startTime)/60000};
  } catch { return null; }
}
async function getGfg() {
  const { CLIST_USERNAME, CLIST_API_KEY } = process.env;
  if (!CLIST_USERNAME || !CLIST_API_KEY) throw new Error('CLIST not configured');
  const url = new URL('https://clist.by/api/v4/contest/');
  url.searchParams.set('resource','geeksforgeeks.org'); url.searchParams.set('end__gte',new Date(Date.now()-8*86400000).toISOString()); url.searchParams.set('order_by','start'); url.searchParams.set('limit','100');
  const r = await fetch(url.toString(), {cache:'no-store',headers:{Authorization:`ApiKey ${CLIST_USERNAME}:${CLIST_API_KEY}`,'User-Agent':'WhatsNextContestCalendar/1.0'},signal:AbortSignal.timeout(5000)});
  if (!r.ok) throw new Error(`CLIST HTTP ${r.status}`); const data = await r.json();
  if (!Array.isArray(data.objects)) throw new Error('Unexpected CLIST response');
  const utc = (v:string) => Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(v) ? v : `${v}Z`);
  return data.objects.map((x:any)=>safeContest({site:'gfg',title:x.event,startTime:utc(x.start),endTime:utc(x.end),url:x.href})).filter(Boolean) as Contest[];
}
class FetchFailure extends Error { constructor(public result:ContestResponse) { super('All contest providers failed'); } }
async function loadContests():Promise<ContestResponse> {
  let old:ContestResponse | null = memory;
  if (dbConfigured()) { try { const rows = await dbFetch('contest_snapshots?id=eq.latest&select=payload'); if (rows?.[0]?.payload) old = rows[0].payload; } catch { /* in-memory fallback */ } }
  const [aggregate, cf, gfg] = await Promise.allSettled([request(API), request(CF), getGfg()]);
  const failed:Platform[] = []; const notes:string[] = [];
  let list:Contest[] = [];
  const aggregateOk = aggregate.status === 'fulfilled' && Array.isArray(aggregate.value);
  if (aggregateOk) { list = aggregate.value.map(safeContest).filter(Boolean) as Contest[]; notes.push('Some providers may omit contests without reporting an error.'); }
  else { failed.push('leetcode','codechef'); }
  const cfOk = cf.status === 'fulfilled' && cf.value?.status === 'OK' && Array.isArray(cf.value.result);
  if (cfOk) {
    list = list.filter(c => c.platform !== 'codeforces');
    list.push(...cf.value.result.filter((c:any) => ['BEFORE','CODING'].includes(c.phase) && Number.isFinite(c.startTimeSeconds) && Number.isFinite(c.durationSeconds)).map((c:any) => safeContest({site:'codeforces', title:c.name, startTime:c.startTimeSeconds*1000, endTime:(c.startTimeSeconds+c.durationSeconds)*1000, url:`https://codeforces.com/contest/${c.id}`})).filter(Boolean));
  } else if (!aggregateOk) failed.push('codeforces');
  if (gfg.status === 'fulfilled') list.push(...gfg.value); else failed.push('gfg');
  const now = Date.now();
  if (old) {
    // Retain recent started contests so they remain visible in the week and live state.
    const keep = old.contests.filter(c => (failed.includes(c.platform) && Date.parse(c.endTime) > now) || (Date.parse(c.startTime) <= now && Date.parse(c.startTime) >= now-8*86400000));
    const ids = new Set(list.map(c => c.id)); for (const c of keep) if (!ids.has(c.id)) list.push(c);
  }
  // Collapse actual duplicates by platform/external ID, never by platform and time.
  list = [...new Map(list.map(contest => [contest.id, contest])).values()];
  list.sort((a,b)=>a.startTime.localeCompare(b.startTime));
  const totalFailure = !aggregateOk && !cfOk && gfg.status !== 'fulfilled';
  const result:ContestResponse = {contests:list,failed,fetchedAt:totalFailure && old ? old.fetchedAt : new Date().toISOString(),stale:totalFailure && !!old,notes};
  if (!totalFailure) { memory = result; if (dbConfigured()) { try { await dbFetch('contest_snapshots?on_conflict=id', {method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:'latest',payload:result})}); } catch (e) { console.error('Snapshot not saved',e); } } }
  if (totalFailure) throw new FetchFailure(result);
  return result;
}
const cachedContests = unstable_cache(loadContests, ['contests-v2'], {revalidate:1800});
export async function getContests():Promise<ContestResponse> { try { return await cachedContests(); } catch (e) { if (e instanceof FetchFailure) return e.result; throw e; } }
