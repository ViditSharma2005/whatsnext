import { createHash, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { dbConfigured, dbFetch } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function POST(request:Request) {
  if (!dbConfigured()) return Response.json({error:'Voting is not configured yet.'},{status:503});
  const h = await headers();
  const origin = h.get('origin'); const host = h.get('x-forwarded-host') || h.get('host');
  if (origin && host) { try { if (new URL(origin).host !== host) return Response.json({error:'Invalid request origin.'},{status:403}); } catch { return Response.json({error:'Invalid request origin.'},{status:403}); } }
  let body:any; try { body = await request.json(); } catch { return Response.json({error:'Invalid request.'},{status:400}); }
  if (typeof body.quoteId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.quoteId) || ![-1,0,1].includes(body.vote)) return Response.json({error:'Invalid vote.'},{status:400});
  const jar = await cookies(); let token = jar.get('wn_voter')?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) { token = randomBytes(32).toString('hex'); jar.set('wn_voter', token, {httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'lax', path:'/', maxAge:31536000}); }
  const voter = createHash('sha256').update(token).digest('hex');
  try { const result = await dbFetch('rpc/cast_quote_vote', {method:'POST',body:JSON.stringify({p_quote_id:body.quoteId,p_voter_hash:voter,p_vote:body.vote})}); return Response.json(result, {headers:{'Cache-Control':'no-store'}}); }
  catch (e) { console.error('Vote failed',e); return Response.json({error:'Vote could not be saved. Please try again shortly.'},{status:429}); }
}
