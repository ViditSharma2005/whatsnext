import { getQuotes } from '@/lib/quotes';
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json(await getQuotes(), {headers:{'Cache-Control':'no-store'}}); }
