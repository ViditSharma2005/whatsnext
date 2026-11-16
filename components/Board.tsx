'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, CalendarDays, Clock3, Globe2, Radio } from 'lucide-react';
import { Contest, ContestResponse, Platform, Quote } from '@/lib/types';
import { platformList, platforms } from '@/lib/platforms';

type QuoteData = { quotes: Quote[]; votingEnabled: boolean };
const fmt = (d: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, options).format(d);
const time = (d: Date) => fmt(d, { hour: 'numeric', minute: '2-digit', hour12: true });
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
function countdown(ms: number) { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`; }
function duration(min: number) { if (min % 60 === 0) return `${min / 60} ${min === 60 ? 'hr' : 'hrs'}`; if (min > 60) return `${Math.floor(min / 60)}h ${min % 60}m`; return `${min} min`; }
function dateRange(a: Date, b: Date) { const monthA = fmt(a, { month: 'short' }), monthB = fmt(b, { month: 'short' }); return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? `${a.getDate()} – ${b.getDate()} ${monthB}` : `${a.getDate()} ${monthA} – ${b.getDate()} ${monthB}${a.getFullYear() !== b.getFullYear() ? ` ${b.getFullYear()}` : ''}`; }
function relative(s: string, now: Date) { const min = Math.max(0, Math.floor((now.getTime() - Date.parse(s)) / 60000)); return min < 1 ? 'just now' : min < 60 ? `${min} min ago` : min < 1440 ? `${Math.floor(min / 60)} hr ago` : `${Math.floor(min / 1440)}d ago`; }
function weekDays(now: Date) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x; }); }
const label = 'text-[10px] font-medium uppercase tracking-[0.14em] text-[#929aa4]';
function contestLink(contest: Contest, now: Date) {
  if (contest.platform !== 'codeforces') return contest.url;
  try {
    const url = new URL(contest.url);
    const match = url.pathname.match(/^\/contests?\/(\d+)\/?$/);
    if (!['codeforces.com', 'www.codeforces.com'].includes(url.hostname) || !match) return contest.url;
    // Codeforces redirects /contest/<id> to its homepage before the round starts.
    // Its public /contests/<id> detail page is available in advance.
    return `https://codeforces.com/${Date.parse(contest.startTime) > now.getTime() ? 'contests' : 'contest'}/${match[1]}`;
  } catch { return contest.url; }
}
function Chip({ contest, now, mobile = false }: { contest: Contest; now: Date; mobile?: boolean }) {
  const p = platforms[contest.platform];
  const suffix = contest.platform === 'leetcode' ? (/biweekly/i.test(contest.name) ? ' Biweekly' : /weekly/i.test(contest.name) ? ' Weekly' : '') : '';
  const division = contest.platform === 'codeforces' ? contest.name.match(/Div\.?\s*\d+(?:\s*\+\s*Div\.?\s*\d+)*/i)?.[0] : undefined;
  return <a title={contest.name} aria-label={`${contest.name}, ${time(new Date(contest.startTime))}`} href={contestLink(contest, now)} target="_blank" rel="noopener noreferrer" className={`group flex min-w-0 ${mobile ? 'items-center gap-2' : 'flex-col gap-1'} rounded-md border px-2.5 py-2 text-xs leading-tight transition-colors hover:brightness-125 ${p.color}`}><span className="min-w-0 font-medium">{p.name}{division ? ` ${division}` : mobile ? suffix : ''}</span><span className={`${mobile ? 'ml-auto whitespace-nowrap' : 'whitespace-nowrap'} opacity-90`}>{time(new Date(contest.startTime))}</span></a>;
}
function Skeleton() {
  return <div aria-label="Loading contest calendar" className="mx-auto max-w-[1280px] px-4 py-5 sm:px-8 lg:px-12"><div className="h-14 animate-pulse rounded-lg bg-[#252526]"/><div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3"><div className="h-48 animate-pulse rounded-xl bg-[#252526]"/><div className="h-48 animate-pulse rounded-xl bg-[#252526]"/></div><div className="mt-3 h-24 animate-pulse rounded-xl bg-[#252526]"/><div className="mt-8 h-64 animate-pulse rounded-xl bg-[#252526]"/></div>;
}
export default function Board({ initialContests, initialQuotes }: { initialContests: ContestResponse; initialQuotes: QuoteData }) {
  const [now, setNow] = useState<Date | null>(null);
  const [data, setData] = useState(initialContests);
  const [quoteData, setQuoteData] = useState(initialQuotes);
  const [quoteId, setQuoteId] = useState('');
  const [filter, setFilter] = useState<Platform | 'all'>('all');
  const [selected, setSelected] = useState<1 | -1 | 0>(0);
  const [saving, setSaving] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    setNow(new Date());
    const p = new URLSearchParams(window.location.search).get('platform');
    if (platformList.includes(p as Platform)) setFilter(p as Platform);
    if (initialQuotes.quotes.length) setQuoteId(initialQuotes.quotes[Math.floor(Math.random() * initialQuotes.quotes.length)].id);
    const clock = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(async () => { try { const r = await fetch('/api/contests'); if (r.ok) setData(await r.json()); } catch {} }, 300000);
    const qr = setInterval(async () => { try { const r = await fetch('/api/quotes'); if (r.ok) setQuoteData(await r.json()); } catch {} }, 60000);
    const pop = () => { const x = new URLSearchParams(window.location.search).get('platform'); setFilter(platformList.includes(x as Platform) ? x as Platform : 'all'); };
    window.addEventListener('popstate', pop);
    return () => { clearInterval(clock); clearInterval(refresh); clearInterval(qr); window.removeEventListener('popstate', pop); };
  }, [initialQuotes]);
  useEffect(() => { if (quoteId) { try { const n = Number(localStorage.getItem(`wn-vote-${quoteId}`)); setSelected(n === 1 ? 1 : n === -1 ? -1 : 0); } catch {} } }, [quoteId]);
  const filtered = useMemo(() => data.contests.filter(c => filter === 'all' || c.platform === filter), [data.contests, filter]);
  if (!now) return <Skeleton/>;
  const days = weekDays(now);
  const live = filtered.filter(c => Date.parse(c.startTime) <= now.getTime() && now.getTime() < Date.parse(c.endTime)).sort((a, b) => a.endTime.localeCompare(b.endTime))[0];
  const laterToday = filtered.find(c => Date.parse(c.startTime) > now.getTime() && sameDay(new Date(c.startTime), now));
  const next = filtered.find(c => Date.parse(c.startTime) > now.getTime());
  const quote = quoteData.quotes.find(q => q.id === quoteId) || quoteData.quotes[0];
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zoneShort = fmt(now, { timeZoneName: 'short' }).split(' ').pop() || zone;
  const weekCount = filtered.filter(c => days.some(d => sameDay(d, new Date(c.startTime)))).length;
  const totalFailure = data.failed.includes('leetcode') && data.failed.includes('codechef') && data.failed.includes('codeforces') && !data.contests.length;
  const filteredUnavailable = filter !== 'all' && data.failed.includes(filter);
  const otherFailures = data.failed.filter(p => p !== 'gfg');
  function changeFilter(p: Platform | 'all') { setFilter(p); const url = new URL(window.location.href); if (p === 'all') url.searchParams.delete('platform'); else url.searchParams.set('platform', p); window.history.replaceState({}, '', url); }
  async function refreshNow() { setRefreshing(true); try { const r = await fetch('/api/contests', { cache: 'no-store' }); if (r.ok) setData(await r.json()); } catch {} finally { setRefreshing(false); } }
  async function vote(v: 1 | -1) {
    if (!quote || saving || !quoteData.votingEnabled) return;
    const target = selected === v ? 0 : v;
    setSaving(true); setVoteError('');
    try {
      const r = await fetch('/api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quoteId: quote.id, vote: target }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.error);
      setSelected(target); try { localStorage.setItem(`wn-vote-${quote.id}`, String(target)); } catch {}
      setQuoteData(q => ({ ...q, quotes: q.quotes.map(item => item.id === quote.id ? { ...item, upvotes: result.upvotes, downvotes: result.downvotes } : item) }));
    } catch (e) { setVoteError(e instanceof Error ? e.message : 'Could not save your vote.'); } finally { setSaving(false); }
  }
  return <main className="min-h-screen bg-[#1e1e1e] text-[#e5e5e5]">
    <div className="mx-auto max-w-[1280px] px-4 pb-6 pt-5 sm:px-8 sm:pt-8 lg:px-12">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-4 border-b border-[#34383d] pb-4 sm:pb-5">
        <a href="/" aria-label="Whats Next home" className="shrink-0"><h1 className="text-[20px] font-medium leading-none tracking-[-0.04em] sm:text-[24px]">Whats Next<span className="text-[#67b9ff]">...</span></h1><span className="mt-1.5 block text-[10px] uppercase tracking-[0.16em] text-[#858c95]">The contest calendar</span></a>
        <div className="flex items-center gap-2 rounded-md border border-[#3c424a] px-2.5 py-2 text-[11px] text-[#b3bdc8] md:order-3" title={zone}><Globe2 size={13} aria-hidden="true"/>{zoneShort}</div>
        <nav aria-label="Filter by platform" className="order-3 flex w-full flex-wrap items-center gap-1 sm:gap-1.5 md:order-2 md:ml-auto md:w-auto"><span className="mr-2 hidden text-[10px] uppercase tracking-[0.15em] text-[#858c95] lg:block">Filter by</span>{(['all', ...platformList] as const).map(p => <button key={p} onClick={() => changeFilter(p)} aria-pressed={filter === p} className={`rounded-md border px-2 py-2 text-[11px] transition-colors sm:px-3.5 sm:text-xs ${filter === p ? 'border-[#3794dc] bg-[#0e639c] text-white' : 'border-[#3c424a] text-[#b9bec6] hover:border-[#569cd6] hover:text-white'}`}>{p === 'all' ? 'All' : platforms[p].name}</button>)}</nav>
      </header>
      {totalFailure && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#6d4232] bg-[#2a1e18] p-4 text-sm text-[#edc4aa]">Couldn&apos;t load contests. Please try again. <button onClick={refreshNow} disabled={refreshing} className="rounded-lg border border-[#8a624c] px-3 py-2 text-xs hover:bg-[#413024]">{refreshing ? 'Trying…' : 'Try again'}</button></div>}
      <section aria-label="Contest overview" className="mt-4 grid grid-cols-2 items-stretch gap-2 sm:mt-5 sm:gap-3">
        <div className="flex min-w-0 flex-col justify-between rounded-xl border border-[#353a40] bg-[#252526] p-3 sm:min-h-[185px] sm:p-6">
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className={label}>Today&apos;s status</p><p className="mt-2 text-[11px] leading-snug text-[#aeb7c1] sm:text-sm">{fmt(now, { weekday: 'short', day: 'numeric', month: 'short' })}</p></div><span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#41474f] text-[#a2adb8] sm:flex"><Radio size={16} aria-hidden="true"/></span></div>
          <div className="mt-5 min-w-0 sm:mt-7" role="status" aria-live="polite">{live ? <><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-md bg-[#18394a] px-2 py-1 text-[10px] font-medium text-[#83cdf5]"><span className="h-1.5 w-1.5 rounded-full bg-[#55baff]"/>Live now</span><span className="break-words text-[14px] font-medium leading-snug sm:text-[18px]">{live.name}</span></div><p className="mt-2 text-[11px] leading-relaxed text-[#aab4bf] sm:text-xs">{platforms[live.platform].name} · Started {time(new Date(live.startTime))} · Ends in {Math.ceil((Date.parse(live.endTime) - now.getTime()) / 60000)}m</p></> : laterToday ? <><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-[#18394a] px-2 py-1 text-[10px] text-[#8dccfa]">Coming today</span><span className="break-words text-[14px] font-medium leading-snug sm:text-[18px]">{laterToday.name}</span></div><p className="mt-2 text-[11px] leading-relaxed text-[#aab4bf] sm:text-xs">{platforms[laterToday.platform].name} · Starts at {time(new Date(laterToday.startTime))}</p></> : <><p className="text-[14px] font-medium leading-snug sm:text-[17px]">{filteredUnavailable ? 'Schedule unavailable' : 'No contests today'}</p><p className="mt-2 text-[11px] leading-relaxed text-[#939ca6] sm:text-xs">{filteredUnavailable ? 'Check back shortly.' : 'A little room to practice, perhaps?'}</p></>}</div>
        </div>
        <div className="flex min-w-0 flex-col justify-between rounded-xl border border-[#353a40] bg-[#252526] p-3 sm:min-h-[185px] sm:p-6">
          <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><p className={label}>Next up</p>{next ? <><div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 sm:mt-3"><h2 className="break-words text-[14px] font-medium leading-snug tracking-[-0.02em] sm:text-[19px]">{next.name}</h2><span className={`text-[11px] font-medium ${platforms[next.platform].text}`}>{platforms[next.platform].name}</span></div><p className="mt-2 text-[11px] leading-relaxed text-[#aab4bf] sm:text-xs">{fmt(new Date(next.startTime), { weekday: 'short', month: 'short', day: 'numeric' })} · {time(new Date(next.startTime))} · {duration(next.durationMin)}</p></> : <p className="mt-3 break-words text-[14px] leading-snug sm:text-[17px]">{filteredUnavailable ? 'Schedule unavailable' : 'No upcoming contests found'}</p>}</div><span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#41474f] text-[#a2adb8] sm:flex"><Clock3 size={16} aria-hidden="true"/></span></div>
          {next && <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div className="min-w-0"><span className="block text-[10px] uppercase tracking-[0.14em] text-[#8b959f]">Starts in</span><span aria-live="off" className="mt-1 block whitespace-nowrap text-[21px] font-medium leading-none tabular-nums tracking-[-0.04em] text-[#e7edf4] sm:text-[28px]">{countdown(Date.parse(next.startTime) - now.getTime())}</span></div><a href={contestLink(next, now)} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[#4d5965] px-2 py-2 text-[11px] text-[#e5edf5] transition-colors hover:border-[#569cd6] hover:text-[#83c7ff] sm:w-auto sm:px-4 sm:py-2.5 sm:text-xs">Open contest <ArrowUpRight size={13} aria-hidden="true"/></a></div>}
        </div>
      </section>
      {quote && <section aria-label="Motivation quote" className="mt-3 flex flex-col gap-3 rounded-xl border border-[#3a424a] bg-transparent p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.15em] text-[#79b7e6]">A little push</p><p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[#e0e4e9] sm:text-[16px]">“{quote.text}”</p></div><div className="flex shrink-0 items-center gap-1 self-end sm:self-center"><span className="mr-2 hidden text-[10px] uppercase tracking-[0.13em] text-[#919ba5] lg:inline">Feel this?</span><button onClick={() => vote(1)} disabled={!quoteData.votingEnabled || saving} aria-label="Upvote quote" aria-pressed={selected === 1} title={quoteData.votingEnabled ? 'Upvote quote' : 'Voting available after database setup'} className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selected === 1 ? 'bg-[#174d70] text-[#9bd5ff]' : 'text-[#aab6c0] hover:bg-[#303b45]'}`}><ArrowUp size={16} aria-hidden="true"/><span className="tabular-nums">{quote.upvotes}</span></button><span className="h-4 w-px bg-[#414a52]"/><button onClick={() => vote(-1)} disabled={!quoteData.votingEnabled || saving} aria-label="Downvote quote" aria-pressed={selected === -1} title={quoteData.votingEnabled ? 'Downvote quote' : 'Voting available after database setup'} className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selected === -1 ? 'bg-[#174d70] text-[#9bd5ff]' : 'text-[#aab6c0] hover:bg-[#303b45]'}`}><ArrowDown size={16} aria-hidden="true"/><span className="tabular-nums">{quote.downvotes}</span></button></div>{voteError && <p role="alert" className="text-xs text-[#ffb8a6]">{voteError}</p>}</section>}
      <section aria-label="This week's contests" className="mt-8 sm:mt-10"><div className="mb-4 flex items-end justify-between gap-3"><div><p className={label}>Plan your next move</p><h2 className="mt-2 text-[20px] font-medium tracking-[-0.035em] sm:text-[23px]">This week <span className="ml-1 hidden text-[12px] font-normal tracking-normal text-[#929aa4] sm:inline">/ Monday to Sunday</span></h2></div><div className="flex items-center gap-2 whitespace-nowrap text-xs text-[#b2bbc5]"><CalendarDays size={15} aria-hidden="true" className="text-[#8e9eac]"/>{dateRange(days[0], days[6])}</div></div>
        <div className="hidden grid-cols-7 gap-2 md:grid">{days.map(day => { const contests = filtered.filter(c => sameDay(new Date(c.startTime), day)); const today = sameDay(day, now); return <div key={day.toISOString()} className={`min-h-[180px] min-w-0 rounded-xl border p-3 lg:min-h-[200px] ${today ? 'border-[#3794dc] bg-[#1c2934]' : 'border-[#363b42] bg-[#222426]'}`}><div className="flex items-start justify-between"><div><p className={`text-xs ${today ? 'text-[#83c7ff]' : 'text-[#a1abb5]'}`}>{fmt(day, { weekday: 'short' })}</p><p className="mt-1 text-[20px] font-medium leading-none">{day.getDate()}</p></div>{today && <span className="h-1.5 w-1.5 rounded-full bg-[#63b8f2]"/>}</div><div className="mt-5 flex flex-col gap-1.5">{contests.length ? contests.map(c => <Chip key={c.id} contest={c} now={now}/>) : <span className="text-xs text-[#89939e]">{filteredUnavailable ? 'Unavailable' : 'None'}</span>}</div></div>; })}</div>
        <div className="md:hidden">{days.map(day => { const contests = filtered.filter(c => sameDay(new Date(c.startTime), day)); const today = sameDay(day, now); return <div key={day.toISOString()} className={`grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 border-b border-[#363b42] px-2 py-3 ${today ? 'my-1 rounded-xl border border-[#3794dc] bg-[#1c2934]' : ''}`}><div><p className={`text-[11px] ${today ? 'text-[#83c7ff]' : 'text-[#a1abb5]'}`}>{fmt(day, { weekday: 'short' })}</p><p className="mt-0.5 text-[18px] font-medium leading-none">{day.getDate()}</p></div><div className="flex min-w-0 flex-col gap-1.5">{contests.length ? contests.map(c => <Chip key={c.id} contest={c} now={now} mobile/>) : <span className="text-xs text-[#939ca6]">{filteredUnavailable ? 'Schedule unavailable' : 'No contests'}</span>}</div></div>; })}</div>
        <div className="mt-4 flex items-center gap-2 text-[11px] text-[#929ba5]"><span className="h-1.5 w-1.5 rounded-full bg-[#569cd6]"/>{weekCount} {weekCount === 1 ? 'contest' : 'contests'} on the calendar this week</div>
      </section>
      <footer className="mt-8 text-[11px] leading-relaxed text-[#929ba5]"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><div><p>Times shown in {zoneShort} <span className="px-1.5 text-[#626c76]">·</span> Updated {relative(data.fetchedAt, now)}{data.stale ? ' · Showing saved data' : ''}</p>{otherFailures.length > 0 && <p className="mt-1 text-[#d5b68e]">{otherFailures.map(p => platforms[p].name).join(', ')} {otherFailures.length === 1 ? 'is' : 'are'} unavailable right now.</p>}{!quoteData.votingEnabled && <p className="mt-1">Quote voting will be available when the database is connected.</p>}</div><span>GFG data: <a href="https://clist.by/" target="_blank" rel="noopener noreferrer" className="underline decoration-[#68737e] underline-offset-2 hover:text-[#83c7ff]">CLIST</a></span></div><div className="mt-6 border-t border-[#41464c] pt-5 text-center text-xs text-[#9ca6b0]">by backspaces</div></footer>
    </div>
  </main>;
}
