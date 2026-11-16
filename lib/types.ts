export type Platform = 'leetcode' | 'codechef' | 'codeforces' | 'gfg';
export type Contest = { id:string; platform:Platform; name:string; url:string; startTime:string; endTime:string; durationMin:number };
export type ContestResponse = { contests:Contest[]; failed:Platform[]; fetchedAt:string; stale:boolean; notes:string[] };
export type Quote = { id:string; text:string; upvotes:number; downvotes:number };
