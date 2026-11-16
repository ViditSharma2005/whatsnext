import { getContests } from '@/lib/contests';
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json(await getContests(), {headers:{'Cache-Control':'no-store'}}); }
