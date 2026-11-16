import { unstable_cache } from 'next/cache';
import { dbConfigured, dbFetch } from './db';
import { Quote } from './types';
export const fallbackQuotes: Quote[] = [
  {id:'fallback-1', text:'Your excuses have a better streak than your submissions. Change that.', upvotes:0, downvotes:0},
  {id:'fallback-2', text:'The contest starts soon. Your comfort zone can wait.', upvotes:0, downvotes:0},
  {id:'fallback-3', text:'That problem isn’t going to solve itself. Neither is your rating.', upvotes:0, downvotes:0},
  {id:'fallback-4', text:'Less scrolling. More solving. The leaderboard isn’t going to climb itself.', upvotes:0, downvotes:0},
];
async function loadQuotes(): Promise<{quotes:Quote[]; votingEnabled:boolean}> {
  if (dbConfigured()) { try { const data = await dbFetch('quotes?select=id,text,upvotes,downvotes&order=created_at.desc&limit=100'); if (Array.isArray(data) && data.length) return {quotes:data, votingEnabled:true}; } catch (error) { console.error('Quotes unavailable:', error); } }
  return { quotes:fallbackQuotes, votingEnabled:false };
}

export const getQuotes = unstable_cache(loadQuotes, ['quotes-v1'], {revalidate:60});
