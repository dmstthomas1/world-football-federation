"use strict";
// 32-team, eight-division, two-conference NFL-inspired schedule prototype.
const WFF_SEASON_WEEKS=18;
function wffSeasonSchedule(year){
 const games=[],byTeam=Array.from({length:32},()=>[]);
 const add=(a,b)=>{const pair=[Math.min(a,b),Math.max(a,b)];if(!games.some(g=>g.a===pair[0]&&g.b===pair[1]))games.push({a:pair[0],b:pair[1]})};
 // Six divisional games (three rivals twice).
 const fixtures=[];
 for(let d=0;d<8;d++)for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){fixtures.push({a:d*4+i,b:d*4+j,div:true});fixtures.push({a:d*4+j,b:d*4+i,div:true})}
 // Cross-division opponents: 4 from rotating same-conference division,
 // 4 from rotating opposite-conference division, 2 from other same-conference
 // division, and 1 cross-conference placement opponent.
 const confs=[teams.filter(t=>t.conference==="West").map(t=>t.id),teams.filter(t=>t.conference==="East").map(t=>t.id)];
 const divs=[0,1,2,3,4,5,6,7];
 const confDivs=confs.map(ids=>divs.filter(d=>ids.includes(d*4)));
 for(let ci=0;ci<2;ci++){
  const own=confDivs[ci],other=confDivs[1-ci],offset=((year-2026)%3+3)%3,cross=((year-2026)%4+4)%4;
  for(let k=0;k<4;k++){
   const d=own[k],same=own[(k+1+offset)%4],opp=other[(k+cross)%4];
   for(let i=0;i<4;i++)for(let j=0;j<4;j++){
    const a=d*4+i,b=same*4+j;
    if(a<b)fixtures.push({a,b,div:false});
    fixtures.push({a:d*4+i,b:opp*4+j,div:false});
   }
  }
 }
 // Deduplicate and construct 17-game degree-balanced pairing via seeded matching.
 const unique=new Map();for(const g of fixtures){const k=[Math.min(g.a,g.b),Math.max(g.a,g.b)].join(":");if(!unique.has(k))unique.set(k,{a:g.a,b:g.b,div:g.div})}
 const chosen=[...fixtures.filter(g=>g.div)],degree=Array(32).fill(6);
 const pool=[...unique.values()].filter(g=>!g.div);
 const rand=dnaRandom(dnaHash("schedule|"+year));pool.forEach(g=>g.sort=rand());
 pool.sort((a,b)=>a.sort-b.sort);
 for(const g of pool){if(degree[g.a]<17&&degree[g.b]<17){chosen.push(g);degree[g.a]++;degree[g.b]++}}
 // Fill any remaining slots with non-division matchups not already selected.
 const keys=new Set(chosen.map(g=>[Math.min(g.a,g.b),Math.max(g.a,g.b)].join(":")));
 for(let pass=0;pass<40&&degree.some(n=>n<17);pass++){
  let changed=false;
  for(let a=0;a<32;a++)if(degree[a]<17){
   const eligible=teams.map(t=>t.id).filter(b=>b!==a&&Math.floor(a/4)!==Math.floor(b/4)&&degree[b]<17&&!keys.has([Math.min(a,b),Math.max(a,b)].join(":")));
   if(!eligible.length)continue;eligible.sort((x,y)=>degree[x]-degree[y]||x-y);
   const b=eligible[0],k=[Math.min(a,b),Math.max(a,b)].join(":");
   chosen.push({a,b,div:false});keys.add(k);degree[a]++;degree[b]++;changed=true;
  }
  if(!changed)break;
 }
 // Place fixtures in 18 weeks using a rotating bye and no team playing twice in a week.
 const schedule=Array.from({length:18},()=>[]);
 const byeWeek=Array.from({length:32},(_,id)=>5+(id%9));
 const ordered=chosen.map((g,i)=>({...g,sort:rand()+ (g.div?0:.2)})).sort((a,b)=>a.sort-b.sort);
 for(const g of ordered){
  const candidates=Array.from({length:18},(_,i)=>i).filter(w=>w+1!==byeWeek[g.a]&&w+1!==byeWeek[g.b]&&!schedule[w].some(x=>x.a===g.a||x.b===g.a||x.a===g.b||x.b===g.b));
  if(!candidates.length)continue;
  candidates.sort((a,b)=>schedule[a].length-schedule[b].length||a-b);
  const w=candidates[0];schedule[w].push({week:w+1,home:(g.div?g.a:(rand()<.5?g.a:g.b)),away:null,division:g.div});
  schedule[w][schedule[w].length-1].away=schedule[w][schedule[w].length-1].home===g.a?g.b:g.a;
 }
 return {year,weeks:schedule,byeWeek,scheduled:chosen.length,placed:schedule.reduce((n,w)=>n+w.length,0),degree};
}
function wffScheduleInit(state){if(state.leagueSchedule?.year===state.finance.year)return false;state.leagueSchedule=wffSeasonSchedule(state.finance.year);return true}
function wffNextMatch(state){wffScheduleInit(state);return (state.leagueSchedule.weeks[state.week-1]||[]).find(g=>g.home===state.teamId||g.away===state.teamId)||null}
function wffScheduleView(state){
 wffScheduleInit(state);const s=state.leagueSchedule;
 const fixtures=s.weeks.map((games,i)=>{const g=games.find(g=>g.home===state.teamId||g.away===state.teamId);
 return '<div class="line"><strong>Week '+(i+1)+'</strong><span>'+(g?(g.home===state.teamId?'vs ':'at ')+esc(teamLabel(teams[g.home===state.teamId?g.away:g.home])):'BYE')+'</span></div>'}).join("");
 return '<section class="panel"><h2>League Schedule • '+s.year+'</h2><p class="muted">17 games / 18 weeks intended. Divisional home-and-away games and rotating non-division matchups. Schedule-generation integrity checks are still being validated.</p>'+fixtures+'</section><section class="panel"><h2>World Bowl Playoff Format</h2><p>Seven teams qualify per conference: four division winners and three wild cards. The No. 1 seed in each conference receives the only first-round bye.</p><p class="muted">Wild Card: 2 vs 7, 3 vs 6, 4 vs 5. Divisional Round: the No. 1 seed faces the lowest remaining seed. Conference Championships follow, then the WFF World Bowl at a neutral venue.</p><p class="notice">Full league standings, game-result synchronization, and automatic playoff execution are not yet implemented.</p></section>';
}
