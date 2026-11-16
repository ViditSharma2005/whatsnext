import Board from '@/components/Board';
import { getContests } from '@/lib/contests';
import { getQuotes } from '@/lib/quotes';
export const dynamic = 'force-dynamic';
export default async function Home() { const [contests, quotes] = await Promise.all([getContests(),getQuotes()]); return <Board initialContests={contests} initialQuotes={quotes}/>; }
