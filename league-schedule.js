"use strict";
// Deterministic 32-team / 18-week schedule, with exactly 17 games and one bye per club.
const WFF_SEASON_WEEKS=18;
function wffRoundRobin(ids){
 const a=ids.slice(),rounds=[];
 for(let r=0;r<a.length-1;r++){
  const pairs=[];for(let i=0;i<a.length/2;i++)pairs.push([a[i],a[a.length-1-i]]);
  rounds.push(pairs);a.splice(1,0,a.pop());
 }return rounds;
}
function wffSeasonSchedule(year){
 const rand=dnaRandom(dnaHash("wff-schedule-v2|"+year)),weeks=Array.from({length:18},()=>[]);
 const divisions=Array.from({length:8},(_,d)=>Array.from({length:4},(_,i)=>d*4+i));
 const divisionRounds=Array.from({length:6},()=>[]);
 for(const members of divisions){
  const rr=wffRoundRobin(members);
  for(let r=0;r<3;r++)for(const [a,b] of rr[r]){
   divisionRounds[r].push({home:a,away:b,division:true});
   divisionRounds[r+3].push({home:b,away:a,division:true});
  }
 }
 const divisionPairs=wffRoundRobin(Array.from({length:8},(_,i)=>i));
 const crossRounds=[];
 for(let r=0;r<11;r++){
  const games=[],shift=r>=7?1:0;
  for(const [da,db] of divisionPairs[r%7])for(let i=0;i<4;i++){
   const a=da*4+i,b=db*4+(i+shift)%4;
   games.push({home:(r+i)%2?a:b,away:(r+i)%2?b:a,division:false});
  }
  crossRounds.push(games);
 }
 const rounds=[...divisionRounds,...crossRounds];
 // All 32 clubs must take exactly one bye in Weeks 7–12. Move a
 // disjoint set of 16 games from those weeks into the full Week 18 slate.
 for(let i=0;i<17;i++)weeks[i]=rounds[i].map(g=>({...g,week:i+1,id:(i+1)+"-"+g.home+"-"+g.away}));
 const candidates=[];
 for(let w=6;w<=11;w++)for(const g of weeks[w])candidates.push({weekIndex:w,game:g});
 // Seeded deterministic search for a perfect matching across the 32 teams.
 const choices=Array.from({length:32},()=>[]);
 for(let i=0;i<candidates.length;i++){
  const {game}=candidates[i];choices[game.home].push(i);choices[game.away].push(i);
 }
 const order=candidates.map((_,i)=>({i,sort:rand()})).sort((a,b)=>a.sort-b.sort);
 const rank=new Map(order.map((o,i)=>[o.i,i]));
 for(const arr of choices)arr.sort((a,b)=>rank.get(a)-rank.get(b));
 const selected=[],used=new Set();
 function findMatching(){
  if(used.size===32)return true;
  let best=null,options=null;
  for(let t=0;t<32;t++)if(!used.has(t)){
   const open=choices[t].filter(i=>!used.has(candidates[i].game.home)&&!used.has(candidates[i].game.away));
   if(!open.length)return false;
   if(!options||open.length<options.length){best=t;options=open}
  }
  for(const i of options){
   const g=candidates[i].game;
   used.add(g.home);used.add(g.away);selected.push(i);
   if(findMatching())return true;
   selected.pop();used.delete(g.home);used.delete(g.away);
  }
  return false;
 }
 if(!findMatching()||selected.length!==16)throw Error("Unable to assign midseason byes");
 for(const i of selected){
  const {weekIndex,game}=candidates[i];
  weeks[weekIndex]=weeks[weekIndex].filter(g=>g!==game);
  weeks[17].push({...game,week:18,id:"18-"+game.home+"-"+game.away});
 }
 const counts=Array(32).fill(0),byes=Array(32).fill(0),byeWeeks=Array(32).fill(null);
 for(let w=0;w<18;w++){
  const seen=new Set();
  for(const g of weeks[w]){
   if(seen.has(g.home)||seen.has(g.away))throw Error("Schedule conflict");
   seen.add(g.home);seen.add(g.away);counts[g.home]++;counts[g.away]++;
  }
  for(let t=0;t<32;t++)if(!seen.has(t)){byes[t]++;byeWeeks[t]=w+1;if(w<6||w>11)throw Error("Bye outside Weeks 7–12")}
 }
 if(counts.some(n=>n!==17)||byes.some(n=>n!==1)||weeks[17].length!==16)throw Error("Invalid season game count");
 return {year,weeks,counts,byes,byeWeeks,version:3};
}
function wffScheduleInit(state){
 if(state.leagueSchedule?.year===state.finance.year&&state.leagueSchedule.version===3)return false;
 const previous=state.leagueSchedule;
 // Do not erase completed season results when migrating an active franchise.
 if(previous?.year===state.finance.year&&Object.keys(state.leagueResults||{}).length){
  // Keep the in-progress schedule intact; the new rule starts next season.
  return false;
 }
 state.leagueSchedule=wffSeasonSchedule(state.finance.year);
 state.leagueResults={};state.leagueBoxScores={};state.postseason=null;return true;
}
function wffNextMatch(state){wffScheduleInit(state);return (state.leagueSchedule.weeks[state.week-1]||[]).find(g=>g.home===state.teamId||g.away===state.teamId)||null}
function wffLeagueScore(state,game){
 const r=dnaRandom(dnaHash("league-game|"+state.finance.year+"|"+game.id));
 const home=10+Math.floor(r()*25),away=10+Math.floor(r()*25);
 return {homeScore:home===away?home+3:home,awayScore:away};
}
function wffLeagueCompleteWeek(state,playerScore){
 wffScheduleInit(state);const games=state.leagueSchedule.weeks[state.week-1]||[];
 for(const g of games){
  if(state.leagueResults[g.id])continue;
  const own=g.home===state.teamId||g.away===state.teamId;
  if(own&&!playerScore)throw Error("Player game must finish before advancing week");
  state.leagueResults[g.id]={...g,...(own?playerScore:wffLeagueScore(state,g))};
 }
 wffEnsureLeagueBoxScores(state);state.week++;
 while(state.week<=18&&!wffNextMatch(state)){const byeGames=state.leagueSchedule.weeks[state.week-1]||[];for(const g of byeGames)if(!state.leagueResults[g.id])state.leagueResults[g.id]={...g,...wffLeagueScore(state,g)};state.week++}
 wffEnsureLeagueBoxScores(state);if(state.week>18)wffArchivePlayerSeason(state,state.finance.year);wffComputeAwards(state);if(state.week>18&&!state.postseason)wffBuildPlayoffs(state);
}
function wffStandings(state){
 const rows=teams.map(t=>({id:t.id,w:0,l:0,t:0,pf:0,pa:0,divisionWins:0,divisionLosses:0}));
 for(const g of Object.values(state.leagueResults||{})){
  const h=rows[g.home],a=rows[g.away];h.pf+=g.homeScore;h.pa+=g.awayScore;a.pf+=g.awayScore;a.pa+=g.homeScore;
  if(g.homeScore===g.awayScore){h.t++;a.t++;continue}
  const win=g.homeScore>g.awayScore?h:a,lose=win===h?a:h;win.w++;lose.l++;
  if(g.division){win.divisionWins++;lose.divisionLosses++}
 }
 return rows;
}
function wffRank(a,b){return (b.w+b.t*.5)/(b.w+b.l+b.t||1)-(a.w+a.t*.5)/(a.w+a.l+a.t||1)||b.divisionWins-a.divisionWins||(b.pf-b.pa)-(a.pf-a.pa)||a.id-b.id}
function wffBuildPlayoffs(state){
 const rows=wffStandings(state),seeds={};
 for(const conf of ["West","East"]){
  const ids=teams.filter(t=>t.conference===conf).map(t=>t.id);
  const winners=Array.from(new Set(ids.map(id=>Math.floor(id/4)))).map(d=>rows.filter(x=>Math.floor(x.id/4)===d).sort(wffRank)[0]).sort(wffRank);
  const other=rows.filter(x=>ids.includes(x.id)&&!winners.some(y=>y.id===x.id)).sort(wffRank);
  seeds[conf]=[...winners,...other.slice(0,3)].map((r,i)=>({id:r.id,seed:i+1}));
 }
 state.postseason={phase:"wildcard",seeds,results:[],champion:null};
}
function wffPostseasonRound(state){
 const p=state.postseason;if(!p||p.champion!==null)return false;
 const results=p.results,round=p.phase;
 const matchups=[];
 for(const conf of ["West","East"]){
  const seeds=p.seeds[conf],prior=results.filter(x=>x.conference===conf&&x.round===({divisional:"wildcard",conference:"divisional"}[round]));
  const alive=round==="wildcard"?seeds:seeds.filter(s=>prior.some(x=>x.winner===s.id)||(round==="divisional"&&s.seed===1));
  if(round==="wildcard")for(const [a,b] of [[1,6],[2,5],[3,4]])matchups.push({home:seeds[a].id,away:seeds[b].id,conference:conf,round});
  if(round==="divisional"){const order=alive.slice().sort((a,b)=>a.seed-b.seed);matchups.push({home:order[0].id,away:order[3].id,conference:conf,round},{home:order[1].id,away:order[2].id,conference:conf,round})}
  if(round==="conference"){const order=alive.slice().sort((a,b)=>a.seed-b.seed);matchups.push({home:order[0].id,away:order[1].id,conference:conf,round})}
 }
 if(round==="worldbowl"){
  const west=results.find(x=>x.round==="conference"&&x.conference==="West"),east=results.find(x=>x.round==="conference"&&x.conference==="East");
  matchups.push({home:west.winner,away:east.winner,conference:"World",round});
 }
 for(const g of matchups){
  const r=dnaRandom(dnaHash("wff-playoff|"+state.finance.year+"|"+round+"|"+g.home+"|"+g.away));
  let hs=14+Math.floor(r()*27),as=14+Math.floor(r()*27);if(hs===as)hs+=3;
  results.push({...g,homeScore:hs,awayScore:as,winner:hs>as?g.home:g.away});
 }
 p.phase=({wildcard:"divisional",divisional:"conference",conference:"worldbowl",worldbowl:"complete"})[round];
 if(p.phase==="complete")p.champion=results.at(-1).winner;
 return true;
}
function wffScheduleView(state){
 wffScheduleInit(state);const s=state.leagueSchedule,rows=wffStandings(state);
 let html='<section class="panel"><h2>'+s.year+' Regular Season Schedule</h2><p>17 games across 18 weeks • Six divisional games • One bye in Weeks 7–12</p>';
 for(let i=0;i<18;i++){
  const g=s.weeks[i].find(g=>g.home===state.teamId||g.away===state.teamId);
  const result=g&&state.leagueResults[g.id],opponent=g?teams[g.home===state.teamId?g.away:g.home]:null;
  html+='<div class="line"><strong>Week '+(i+1)+'</strong><span>'+(g?(g.home===state.teamId?'vs ':'at ')+esc(teamLabel(opponent)):'BYE')+(result?' • '+result.homeScore+'–'+result.awayScore:'')+'</span></div>';
 }
 html+='</section>';
 for(const conf of ["West","East"]){
  html+='<section class="panel"><h2>'+conf+' Conference Standings</h2>';
  for(const d of [...new Set(teams.filter(t=>t.conference===conf).map(t=>t.region))]){
   html+='<h3>'+esc(d)+'</h3>';
   for(const row of rows.filter(x=>teams[x.id].region===d).sort(wffRank))html+='<div class="line"><span>'+esc(teamLabel(teams[row.id]))+'</span><strong>'+row.w+'–'+row.l+(row.t?'–'+row.t:'')+'</strong></div>';
  }html+='</section>';
 }
 const p=state.postseason;
 html+='<section class="panel"><h2>World Bowl Playoffs</h2><p>Seven teams per conference. Only each conference’s No. 1 seed has a Wild Card bye.</p>';
 if(p){html+='<h3>Round: '+esc(p.phase)+'</h3>';
  for(const g of p.results)html+='<div class="line"><span>'+esc(g.round)+' • '+esc(teamLabel(teams[g.home]))+' vs '+esc(teamLabel(teams[g.away]))+'</span><strong>'+g.homeScore+'–'+g.awayScore+'</strong></div>';
  if(p.champion!==null)html+='<h2>World Bowl Champion: '+esc(teamLabel(teams[p.champion]))+'</h2>';
  else html+='<button class="btn" id="playoff-advance">Simulate Next Playoff Round</button>';
 }else html+='<p class="muted">Playoff seeds will be determined after Week 18.</p>';
 return html+'</section>';
}
function wffScheduleBind(state,redraw){const b=document.getElementById("playoff-advance");if(b)b.onclick=()=>{if(wffPostseasonRound(state)){save();redraw()}}}
