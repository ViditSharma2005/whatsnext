import { Platform } from './types';
export const platforms: Record<Platform, { name:string; color:string; dot:string; text:string }> = {
  leetcode: { name:'LeetCode', color:'bg-[#34220b] text-[#f3b44d] border-[#513816]', dot:'bg-[#edaa3c]', text:'text-[#f3b44d]' },
  codechef: { name:'CodeChef', color:'bg-[#381a1b] text-[#f29291] border-[#562c2c]', dot:'bg-[#e77f80]', text:'text-[#f29291]' },
  codeforces: { name:'Codeforces', color:'bg-[#14283d] text-[#8bb9f5] border-[#254763]', dot:'bg-[#79aef3]', text:'text-[#8bb9f5]' },
  gfg: { name:'GFG', color:'bg-[#172d1b] text-[#92cc87] border-[#2c4930]', dot:'bg-[#83c178]', text:'text-[#92cc87]' },
};
export const platformList: Platform[] = ['leetcode','codechef','codeforces','gfg'];
