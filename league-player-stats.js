"use strict";
// League-wide deterministic box-score simulation for fictional WFF fixtures.
// Stats are modeled, not derived from the detailed live play-by-play.
const WFF_STAT_FIELDS=["passAtt","passComp","passYds","passTd","int","rushAtt","rushYds","rushTd","rec","recYds","recTd","tackles","sacks","defInt","forcedFumbles","fgm","fga","punts"];
// Derived rate statistics are calculated from raw totals, never averaged across games.
function wffPlayerMetric(p,key){
 const n=k=>Number(p[k]||0),ratio=(a,b)=>b?(a/b).toFixed(1):"—";
 if(key==="completionPct")return n("passAtt")?((100*n("passComp"))/n("passAtt")).toFixed(1)+"%":"—";
 if(key==="passYpa")return ratio(n("passYds"),n("passAtt"));
 if(key==="passYpc")return ratio(n("passYds"),n("passComp"));
 if(key==="passerRating"){
  const att=n("passAtt");if(!att)return "—";
  const clamp=v=>Math.max(0,Math.min(2.375,v));
  const a=clamp((n("passComp")/att-.3)*5),b=clamp((n("passYds")/att-3)*.25);
  const c=clamp(n("passTd")/att*20),d=clamp(2.375-n("int")/att*25);
  return (((a+b+c+d)/6)*100).toFixed(1);
 }
 if(key==="tdIntRatio")return n("int")?ratio(n("passTd"),n("int")):n("passAtt")?"∞":"—";
 if(key==="rushAvg")return ratio(n("rushYds"),n("rushAtt"));
 if(key==="recAvg")return ratio(n("recYds"),n("rec"));
 if(key==="catchPct")return p.targets==null?"—":n("targets")?((100*n("rec"))/n("targets")).toFixed(1)+"%":"—";
 if(key==="fgPct")return n("fga")?((100*n("fgm"))/n("fga")).toFixed(1)+"%":"—";
 if(key==="tacklesPerGame")return p.gamesPlayed?ratio(n("tackles"),n("gamesPlayed")):"—";
 return p[key]??0;
}
const WFF_PLAYER_STAT_SECTIONS=[
 ["Passing",p=>p.passAtt>0,[["CMP","passComp"],["ATT","passAtt"],["CMP%","completionPct"],["YDS","passYds"],["Y/A","passYpa"],["Y/C","passYpc"],["TD","passTd"],["INT","int"],["RATE","passerRating"]]],
 ["Rushing",p=>p.rushAtt>0,[["ATT","rushAtt"],["YDS","rushYds"],["AVG","rushAvg"],["TD","rushTd"]]],
 ["Receiving",p=>p.rec>0,[["REC","rec"],["YDS","recYds"],["AVG","recAvg"],["TD","recTd"]]],
 ["Defense",p=>(p.tackles||0)+(p.sacks||0)+(p.defInt||0)+(p.forcedFumbles||0)>0,[["TKL","tackles"],["SACK","sacks"],["INT","defInt"],["FF","forcedFumbles"]]],
 ["Kicking & Punting",p=>(p.fga||0)+(p.punts||0)>0,[["FGM","fgm"],["FGA","fga"],["FG%","fgPct"],["PUNTS","punts"]]]
];
const WFF_HOMETOWNS=["Cedar Falls","Lakewood","Riverton","Westhaven","Pine Ridge","Brookfield","Stonebridge","Fairview","Ashford","Northfield"];
const WFF_COLLEGES=["North Valley University","Coastal State","Redwood Tech","Great Lakes College","Prairie State","Summit University","Atlantic Polytechnic","Western Ridge","Central Plains University","Lakeshore State"];
function wffPlayerId(teamId,p){return p.playerId||"wff-"+dnaHash(String(teamId)+"|"+p.name+"|"+p.position).toString(36)}
function wffPlayerRegistry(state){
 if(!state.playerRegistry)state.playerRegistry={};
 return state.playerRegistry;
}
function wffRegisterPlayer(state,teamId,p){
 const id=wffPlayerId(teamId,p),registry=wffPlayerRegistry(state);
 if(!registry[id]){
  const seed=dnaHash(id);
  registry[id]={id,name:p.name,position:p.position,originalTeamId:teamId,teamId,age:p.age??null,height:p.height??null,weight:p.weight??null,college:WFF_COLLEGES[Math.floor(seed/13)%WFF_COLLEGES.length],hometown:WFF_HOMETOWNS[seed%WFF_HOMETOWNS.length],rookie:!!p.rookie,yearsPro:p.yearsPro??p.experience??null,firstSeenYear:state.finance?.year??null,contract:p.contract??null};
 }else{
  const r=registry[id];r.teamId=teamId;
  for(const key of ["age","height","weight","yearsPro","contract"])if(p[key]!=null)r[key]=p[key];
 }
 return registry[id];
}
function wffEnsurePlayerRegistry(state){
 wffPlayerRegistry(state);
 for(const team of teams){
  const roster=wffStatRoster(state,team.id);
  for(const p of roster)wffRegisterPlayer(state,team.id,p);
 }
}
function wffPlayerHistory(state,id){
 const archive=state.playerSeasonHistory||{};
 return Object.values(archive).flatMap(year=>Object.values(year)).filter(p=>p.playerId===id).sort((a,b)=>a.year-b.year);
}
function wffArchivePlayerSeason(state,year){
 if(!state.playerSeasonHistory)state.playerSeasonHistory={};
 if(state.playerSeasonHistory[year])return false;
 const totals=wffSeasonPlayers(state);
 state.playerSeasonHistory[year]={};
 for(const p of totals){
  const record=wffRegisterPlayer(state,p.teamId,p),row={playerId:record.id,teamId:p.teamId,name:p.name,position:p.position,year};
  for(const field of WFF_STAT_FIELDS)row[field]=p[field]||0;
  state.playerSeasonHistory[year][record.id]=row;
 }
 return true;
}
function wffPlayerCareerTotals(state,id){
 const rows=wffPlayerHistory(state,id),total={};
 for(const field of WFF_STAT_FIELDS)total[field]=0;
 for(const p of rows)for(const field of WFF_STAT_FIELDS)total[field]+=p[field]||0;
 return {rows,total};
}
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
 for(const g of Object.values(state.leagueResults||{})){
  if(!state.leagueBoxScores[g.id])state.leagueBoxScores[g.id]=wffSimBox(state,g);
  const live=(state.games||[]).find(x=>x.fixtureId===g.id&&Array.isArray(x.liveSacks));
  if(!live)continue;
  const box=state.leagueBoxScores[g.id];
  // Replace modeled sacks with actual named live sacks, once per fixture.
  if(box._liveSacksApplied)continue;
  for(const p of box)p.sacks=0;
  for(const sack of live.liveSacks){
   let p=box.find(p=>p.teamId===sack.teamId&&p.name===sack.name&&p.position===sack.position);
   if(!p){p={teamId:sack.teamId,name:sack.name,position:sack.position,week:g.week,...Object.fromEntries(WFF_STAT_FIELDS.map(k=>[k,0]))};box.push(p)}
   p.sacks++;
  }
  box._liveSacksApplied=true;
 }
}
function wffSeasonPlayers(state){
 wffEnsureLeagueBoxScores(state);
 const map={};
 for(const box of Object.values(state.leagueBoxScores))for(const p of box){
  const key=p.teamId+"|"+p.name+"|"+p.position;
  if(!map[key])map[key]={...p,playerId:wffPlayerId(p.teamId,p)};else for(const field of WFF_STAT_FIELDS)map[key][field]+=(p[field]||0);
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
