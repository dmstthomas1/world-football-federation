"use strict";
// League-wide deterministic box-score simulation for fictional WFF fixtures.
// Stats are modeled, not derived from the detailed live play-by-play.
const WFF_STAT_FIELDS=["passAtt","passComp","passYds","passTd","int","rushAtt","rushYds","rushTd","rec","recYds","recTd","tackles","sacks","defInt","forcedFumbles","fgm","fga","punts"];
function wffStatRoster(state,id){
 if(id===state.teamId)return state.roster;
 return makeRoster(id).map((p,i)=>dnaBuild(p,id,i,false));
}
function wffStatSeed(state,g){return dnaRandom(dnaHash("wff-box-v1|"+state.finance.year+"|"+g.id))}
function wffStatPick(pool,r){return pool[Math.floor(r()*pool.length)]||null}
function wffStatAdd(map,p,teamId,field,value,week){
 if(!p||!value)return;
 const key=teamId+"|"+p.name+"|"+p.position;
 if(!map[key])map[key]={teamId,name:p.name,position:p.position,age:p.age,rookie:!!p.rookie,week,...Object.fromEntries(WFF_STAT_FIELDS.map(x=>[x,0]))};
 map[key][field]+=value;
}
function wffSimBox(state,g){
 const r=wffStatSeed(state,g),players={};
 for(const [teamId,points,oppPoints] of [[g.home,g.homeScore,g.awayScore],[g.away,g.awayScore,g.homeScore]]){
  const roster=wffStatRoster(state,teamId),group=x=>roster.filter(p=>dnaGroup(p.position)===x);
  const qb=group("QB").sort((a,b)=>b.overall-a.overall)[0],backs=group("HB"),receivers=[...group("WR"),...group("TE")],defenders=[...group("LB"),...group("CB"),...group("S"),...group("EDGE"),...group("DT")],k=group("K")[0],p=group("P")[0];
  const attempts=26+Math.floor(r()*20),completions=Math.min(attempts,Math.round(attempts*(.53+r()*.18))),passYds=Math.round(completions*(8.5+r()*4.5)),rushes=19+Math.floor(r()*17),rushYds=Math.round(rushes*(3.4+r()*1.8));
  const touchdowns=Math.max(0,Math.min(6,Math.floor(points/7))),passTd=Math.min(touchdowns,Math.round(touchdowns*(.48+r()*.35))),rushTd=touchdowns-passTd;
  const ints=r()<.25?1:r()<.08?2:0;
  wffStatAdd(players,qb,teamId,"passAtt",attempts,g.week);wffStatAdd(players,qb,teamId,"passComp",completions,g.week);wffStatAdd(players,qb,teamId,"passYds",passYds,g.week);wffStatAdd(players,qb,teamId,"passTd",passTd,g.week);wffStatAdd(players,qb,teamId,"int",ints,g.week);
  let left=completions,yardsLeft=passYds,tdLeft=passTd;
  for(let i=0;i<receivers.length&&left>0;i++){
   const receiver=receivers[i],last=i===receivers.length-1,rec=last?left:Math.min(left,Math.floor(r()*Math.min(10,left+1))),yd=last?yardsLeft:Math.min(yardsLeft,Math.round(rec*(6+r()*9))),td=last?tdLeft:Math.min(tdLeft,rec,Math.floor(r()*3));
   wffStatAdd(players,receiver,teamId,"rec",rec,g.week);wffStatAdd(players,receiver,teamId,"recYds",yd,g.week);wffStatAdd(players,receiver,teamId,"recTd",td,g.week);left-=rec;yardsLeft-=yd;tdLeft-=td;
  }
  let remaining=rushes,rushRemaining=rushYds,rushScores=rushTd;
  for(let i=0;i<backs.length&&remaining>0;i++){
   const last=i===backs.length-1,att=last?remaining:Math.min(remaining,i===0?Math.round(rushes*(.56+r()*.24)):Math.floor(r()*6)),yd=last?rushRemaining:Math.min(rushRemaining,Math.round(att*(3+r()*3))),td=last?rushScores:Math.min(rushScores,Math.floor(r()*2));
   wffStatAdd(players,backs[i],teamId,"rushAtt",att,g.week);wffStatAdd(players,backs[i],teamId,"rushYds",yd,g.week);wffStatAdd(players,backs[i],teamId,"rushTd",td,g.week);remaining-=att;rushRemaining-=yd;rushScores-=td;
  }
  for(let i=0;i<45;i++){const d=wffStatPick(defenders,r);wffStatAdd(players,d,teamId,"tackles",1,g.week)}
  for(let i=0;i<Math.floor(r()*5);i++)wffStatAdd(players,wffStatPick([...group("EDGE"),...group("DT"),...group("LB")],r),teamId,"sacks",1,g.week);
  for(let i=0;i<Math.floor(r()*3);i++)wffStatAdd(players,wffStatPick([...group("CB"),...group("S")],r),teamId,"defInt",1,g.week);
  const fg=Math.max(0,Math.min(5,Math.round((points-7*touchdowns)/3)));
  wffStatAdd(players,k,teamId,"fgm",fg,g.week);wffStatAdd(players,k,teamId,"fga",fg+Math.floor(r()*2),g.week);
  wffStatAdd(players,p,teamId,"punts",2+Math.floor(r()*5),g.week);
 }
 return Object.values(players);
}
function wffEnsureLeagueBoxScores(state){
 if(!state.leagueBoxScores)state.leagueBoxScores={};
 for(const g of Object.values(state.leagueResults||{}))if(!state.leagueBoxScores[g.id])state.leagueBoxScores[g.id]=wffSimBox(state,g);
}
function wffSeasonPlayers(state){
 wffEnsureLeagueBoxScores(state);
 const map={};
 for(const box of Object.values(state.leagueBoxScores))for(const p of box){
  const key=p.teamId+"|"+p.name+"|"+p.position;
  if(!map[key])map[key]={...p};else for(const field of WFF_STAT_FIELDS)map[key][field]+=(p[field]||0);
 }
 return Object.values(map);
}
function wffPlayerValue(p,kind){
 if(kind==="offense")return p.passYds*.035+p.passTd*7-p.int*5+p.rushYds*.08+p.rushTd*6+p.recYds*.1+p.recTd*7+p.rec*.6;
 if(kind==="defense")return p.tackles*.7+p.sacks*7+p.defInt*8+p.forcedFumbles*6;
 return p.fgm*5+p.punts*.35;
}
function wffBestAward(players,kind,conference,rookie,positions){
 return players.filter(p=>(!conference||teams[p.teamId].conference===conference)&&(!rookie||p.rookie)&&(!positions||positions.includes(dnaGroup(p.position)))).sort((a,b)=>wffPlayerValue(b,kind)-wffPlayerValue(a,kind))[0]||null;
}
function wffAwardEntry(p){return p?{playerName:p.name,teamId:p.teamId,position:p.position}:null}
function wffComputeAwards(state){
 wffEnsureLeagueBoxScores(state);
 const year=state.finance.year,weekly={},boxes=Object.entries(state.leagueBoxScores);
 for(let week=1;week<=(state.week-1)&&week<=18;week++){
  const players=boxes.filter(([id])=>state.leagueResults[id]?.week===week).flatMap(([,p])=>p);
  weekly[week]={};
  for(const conf of ["East","West"]){weekly[week][conf]={};for(const kind of ["offense","defense","special"])weekly[week][conf][kind]=wffAwardEntry(wffBestAward(players,kind,conf))}
 }
 const players=wffSeasonPlayers(state),season={};
 if(state.week>18){
  const best=(kind,conf,rookie,positions)=>wffAwardEntry(wffBestAward(players,kind,conf,rookie,positions));
  season.leagueMvp=best("offense");season.eastMvp=best("offense","East");season.westMvp=best("offense","West");
  for(const conf of ["East","West"]){const key=conf.toLowerCase();season[key+"Oroy"]=best("offense",conf,true);season[key+"Droy"]=best("defense",conf,true)}
  season.opoy=best("offense");season.dpoy=best("defense");
  for(const [id,kind,positions] of [["bestQb","offense",["QB"]],["bestRb","offense",["HB"]],["bestWr","offense",["WR"]],["bestTe","offense",["TE"]],["bestOl","offense",["OL"]],["bestEdge","defense",["EDGE"]],["bestDt","defense",["DT"]],["bestLb","defense",["LB"]],["bestCb","defense",["CB"]],["bestS","defense",["S"]],["bestK","special",["K"]],["bestP","special",["P"]]])season[id]=best(kind,null,false,positions);
 }
 state.awardHistory=state.awardHistory||{};state.awardHistory[year]={weekly,season};
}
