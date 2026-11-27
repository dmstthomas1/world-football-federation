"use strict";
// Alpha 0.4.1: staged CPU-only exhibition viewer. League scores are fictional weekly previews,
// not results from a persistent 32-team season schedule.
let wffLive=null,wffLiveTimer=null;
const WFF_LIVE_SPEED={slow:7500,medium:4000,fast:2000};
function wffLiveStop(){if(wffLive?.halftimeTimer){clearInterval(wffLive.halftimeTimer);wffLive.halftimeTimer=null}if(wffLiveTimer!==null){clearTimeout(wffLiveTimer);wffLiveTimer=null}if(wffLive?.broadcastRevealTimer){clearTimeout(wffLive.broadcastRevealTimer);wffLive.broadcastRevealTimer=null}}
function wffLiveScores(state,opponent){
 const r=wffRandom(state.teamId,"weekly-scores-"+state.week),pool=teams.filter(t=>t.id!==state.teamId&&t.id!==opponent.id);
 const games=[];for(let i=0;i+1<pool.length;i+=2){games.push({home:teamLabel(pool[i]),away:teamLabel(pool[i+1]),homeScore:Math.floor(r()*5)*3+Math.floor(r()*3)*7,awayScore:Math.floor(r()*4)*3+Math.floor(r()*4)*7})}return games;
}
function wffLiveStart(state,redraw){
 wffLiveStop();wffScheduleInit(state);const matchup=wffNextMatch(state);if(!matchup)return;
 const r=wffRandom(state.teamId,"live-game-"+state.finance.year+"-"+state.week);
 const opp=teams[matchup.home===state.teamId?matchup.away:matchup.home];
 const us=teams[state.teamId];
 const weather=wffWeather(us.id,state.week,state.finance?.year||2026);
 const ownPlan={...wffPlan(state)},cpuPlan=wffOpponentPlan(state,opp.id);
 const schemes=[wffTeamScheme(state,us.id),wffTeamScheme(state,opp.id)];
 wffLive={state,redraw,opp,us,weather,r,matchup,plans:[ownPlan,cpuPlan],schemes,clock:wffClockCreate(),score:[0,0],possession:0,field:25,down:1,toGo:10,
 stats:[{plays:0,pass:0,rush:0,yards:0,firstDowns:0,turnovers:0},{plays:0,pass:0,rush:0,yards:0,firstDowns:0,turnovers:0}],
 events:[],formation:null,penaltyLog:[],speed:"medium",paused:false,breakType:null,complete:false,playCount:0,
 adjustments:{offense:"balanced",defense:"balanced",tempo:"normal"},league:(state.leagueSchedule.weeks[state.week-1]||[]).filter(g=>g.id!==matchup.id).slice(0,8).map(g=>({...wffLeagueScore(state,g),home:teamLabel(teams[g.home]),away:teamLabel(teams[g.away])}))};
 wffSpecialTeamsKick(wffLive,"kickoff",1,0);
 wffLiveEvent("Pregame plans: "+us.city+" — "+WFF_OFF_FOCUS[ownPlan.offense].name+" / "+WFF_DEF_FOCUS[ownPlan.defense].name+"; "+opp.city+" — "+WFF_OFF_FOCUS[cpuPlan.offense].name+" / "+WFF_DEF_FOCUS[cpuPlan.defense].name+".",true);
 wffLiveRender();wffLiveSchedule();
}
function wffSpecialTeamsKick(l,type,kickingSide,receivingSide){
 l.snapLineup=null;l.playResult=null;l.moments=[];l.calledPlay=null;l.formation=null;l.broadcastBefore=null;
 const punt=type==="punt",safetyKick=type==="safety",origin=punt?l.field:safetyKick?20:35;
 const puntResult=punt?wffPuntEstimate(wffPunterForTeam(l.state,(kickingSide===0?l.us:l.opp).id),origin,l.weather,l.r):null;
 const distance=puntResult?.distance??(safetyKick?Math.round(45+l.r()*18):Math.round(57+l.r()*16));
 const landing=puntResult?.landing??origin+distance;
 const touchback=puntResult?.touchback??(landing>=100);
 const returnYards=puntResult?.returnYards??(touchback?0:Math.round(5+l.r()*25));
 const receiveSpot=puntResult?.receiveSpot??(touchback?(safetyKick?30:35):Math.max(1,Math.min(99,100-landing+returnYards)));
 const kicking=kickingSide===0?l.us:l.opp;
 l.specialTeams={type,phase:"flight",kickingSide,receivingSide,origin,landing:Math.min(110,landing),distance,returnYards,receiveSpot,touchback,fairCatch:!!puntResult?.fairCatch,outcome:puntResult?.outcome,bounced:!!puntResult?.bounced};
  const kick=punt?(puntResult.sideline?" angles a punt toward the sideline":" punts"):safetyKick?" free-kicks after the safety":" kicks off";
 wffLiveEvent(kicking.city+kick+" — ball traveling "+(puntResult?.airDistance??distance)+" yards.",true);
 wffClockStop(l.clock);
}
function wffLiveSafety(l,offenseSide,reason){
 const defenseSide=1-offenseSide;
 l.score[defenseSide]+=2;
 l.stats[defenseSide].safeties=(l.stats[defenseSide].safeties||0)+1;
 l.field=0;wffClockStop(l.clock);
 wffLiveMoment(l,"safety",defenseSide,reason);
 wffLiveEvent("SAFETY! "+(defenseSide===0?l.us.city:l.opp.city)+" earns two points — "+reason+". The offense must free-kick from its own 20-yard line.",true);
 if(l.overtime){l.overtime.completed[offenseSide]=true;if(wffOvertimeCheck(l))return}
 l.specialTeams={type:"safety",phase:"scoreHold",kickingSide:offenseSide,receivingSide:defenseSide};
}
function wffTryTwoAfterTouchdown(l,side){
 const c=l.clock,diff=l.score[side]-l.score[1-side];
 // NFL-style score chart in the second half; early-game attempts remain uncommon.
 if(c.quarter>=4){
  if([ -2,-5,-10,-13,-18 ].includes(diff))return true;
  if(diff===1&&c.remaining<=240)return true;
  if(diff===-1&&c.remaining<=180)return true;
  if(diff===-8&&c.remaining<=300)return true;
 }
 if(c.quarter===3&&[-2,-5,-10,-13].includes(diff))return l.r()<.65;
 return c.quarter>=2&&l.r()<.018;
}
function wffConversionAdvance(l){
 const k=l.specialTeams;if(!k||k.phase!=="conversion")return false;
 const side=k.kickingSide,team=side===0?l.us:l.opp;
 const two=k.goTwo;
 let made=false;
 if(two){
  const roster=wffTurnoverRoster(l,side);
  const offense=roster.filter(p=>["QB","HB","WR","TE"].includes(p.position));
  const avg=offense.length?offense.reduce((n,p)=>n+(p.overall||72),0)/offense.length:75;
  const pass=l.r()<.58;
  const chance=Math.max(.32,Math.min(.64,.475+(avg-75)*.003));
  made=l.r()<chance;
  if(made)l.score[side]+=2;
  wffLiveEvent(team.city+" goes for two! "+(pass?"Pass":"Run")+" from the two-yard line — "+(made?"CONVERSION GOOD!":"STOPPED! NO CONVERSION."),true);
 }else{
  const kicker=wffKickerForTeam(l.state,team.id);
  const rating=Number(kicker.overall??kicker.ratings?.kickAccuracy??78);
  made=l.r()<Math.max(.90,Math.min(.985,.959+(rating-78)*.0010));
  if(made)l.score[side]++;
  wffLiveEvent(kicker.name+": extra point "+(made?"is GOOD!":"is NO GOOD!"),true);
 }
 k.phase="scoreHold";wffClockStop(l.clock);
 if(l.overtime&&wffOvertimeCheck(l))return true;
 wffLiveRender();wffLiveSchedule();return true;
}
function wffSpecialTeamsAdvance(l){
 if(l.specialTeams?.phase==="touchdown"){
  const side=l.specialTeams.kickingSide;
  const lead=l.score[side]-l.score[1-side];
  if(l.clock.quarter===4&&l.clock.remaining===0&&(lead>0||lead< -2)){
   l.specialTeams=null;wffLiveEndPeriod();return true;
  }
  l.specialTeams.phase="conversion";l.snapLineup=null;l.playResult=null;l.moments=[];
  wffLiveRender();wffLiveSchedule();return true;
 }
 if(l.specialTeams?.phase==="conversion")return wffConversionAdvance(l);
 if(l.specialTeams?.phase==="scoreHold"){
  if(l.overtime&&wffOvertimeCheck(l))return true;
  const k=l.specialTeams;l.specialTeams=null;
  const endOfHalf=l.clock.quarter===2||l.clock.quarter>=4;
  if(wffLiveEndPeriod()&&endOfHalf){wffLiveRender();return true}
  wffSpecialTeamsKick(l,k.type==="safety"?"safety":"kickoff",k.kickingSide,k.receivingSide);
  wffLiveRender();wffLiveSchedule();return true;
 }
 const k=l.specialTeams;if(!k)return false;
 const receiving=k.receivingSide===0?l.us:l.opp;
 if(k.phase==="flight"){
  k.phase=k.touchback?"touchback":k.outcome||"return";
  const spot=receiving.city+" "+(k.outcome==="return"?100-k.landing:k.receiveSpot);
  const result={
   touchback:k.bounced?"The returner lets it bounce into the end zone. Touchback.":"Ball reaches the end zone. Touchback.",
   out_of_bounds:"Punt goes out of bounds at the "+spot+".",
   downed:(k.bounced?"The returner lets it bounce. ":"")+"Punt downed at the "+spot+".",
   fair_catch:"Punt fair-caught at the "+spot+"."
  }[k.phase];
  wffLiveEvent(result||receiving.city+" fields the "+(k.type==="punt"?"punt":"kickoff")+" and starts the return.",true);
 }else{
  if(l.overtime&&l.overtime.current!==k.receivingSide){l.overtime.completed[l.overtime.current]=true;l.overtime.current=k.receivingSide}
  if(k.bounced)wffClockSnap(l.clock,"kick",{duration:2});
  if(!k.touchback&&!k.fairCatch&&k.returnYards>0){
   wffClockSnap(l.clock,"kick",{duration:Math.min(14,4+Math.ceil(k.returnYards/6))});
  }
  l.possession=k.receivingSide;l.field=k.receiveSpot;l.down=1;l.toGo=Math.min(10,100-l.field);
  wffClockStop(l.clock);
  const ending={touchback:"a touchback",out_of_bounds:"the punt went out of bounds",downed:"the punt was downed",fair_catch:"a fair catch"}[k.phase]||"a "+k.returnYards+"-yard return";
  wffLiveEvent(receiving.city+" takes over at its own "+l.field+" after "+ending+".",true);
  l.specialTeams=null;l.snapLineup=null;l.playResult=null;l.moments=[];l.calledPlay=null;l.formation=null;l.broadcastBefore=null;
  if(l.overtime&&wffOvertimeCheck(l))return true;
  if(wffLiveEndPeriod()){wffLiveRender();return true}
 }
 wffLiveRender();wffLiveSchedule();return true;
}
function wffLiveSchedule(){
 // Halftime owns a separate 15-second countdown; do not cancel it when scheduling stops.
 if(wffLive?.breakType==="halftime")return;
 clearTimeout(wffLiveTimer);wffLiveTimer=null;
 if(!wffLive||wffLive.paused||wffLive.breakType||wffLive.complete)return;
 const l=wffLive,delay=l.specialTeams?.phase==="touchdown"?4000:l.specialTeams?.phase==="conversion"?(l.speed==="slow"?5200:l.speed==="medium"?3200:1800):l.specialTeams?.phase==="scoreHold"?(l.speed==="slow"?6500:l.speed==="medium"?4200:2200):WFF_LIVE_SPEED[l.speed];
 wffLiveTimer=setTimeout(()=>{wffLiveTimer=null;if(wffLive.specialTeams)wffSpecialTeamsAdvance(wffLive);else wffLiveStep()},delay);
}
function wffLiveEvent(message,major=false){
 const l=wffLive;
 l.events.unshift({q:l.clock.quarter,time:wffClockTime(l.clock.remaining),message,major});l.events=l.events.slice(0,50);
}
function wffLivePassTarget(l,side){
 const play=l.calledPlay?.play;
 const roles=WFF_FIELD_RECEIVER_ROLES[play?.personnel]||WFF_FIELD_RECEIVER_ROLES["11"];
 const slots=[...roles,play?.variant==="Empty"?"WR":"HB"];
 const roster=wffTurnoverRoster(l,side);
 const preferred=/TE Leak|TE Flat/.test(play?.concept)?"TE":/Texas|Screens/.test(play?.concept)?"HB":"WR";
 const pool=[...new Set(slots)].flatMap(position=>{
  const depth=side===0?l.state.depth?.[position]:null;
  const order=[...(depth||[]).map(i=>roster[i]),...roster.filter(p=>p.position===position).sort((a,b)=>b.overall-a.overall)];
  return [...new Set(order)].filter(p=>p?.name&&p.health?.status!=="Out").slice(0,slots.filter(slot=>slot===position).length).map(player=>({player,weight:position===preferred?4:1}));
 });
 // Target attribution uses a separate seeded draw so presentation does not change play outcomes.
 const teamId=(side===0?l.us:l.opp).id;
 const random=wffRandom(teamId,"live-target-"+l.state.finance.year+"-"+l.state.week+"-"+l.playCount);
 return wffWeightedChoice(pool,random,entry=>entry.weight)?.player;
}
function wffLiveSpotText(l){
 const down=["","1st","2nd","3rd","4th"][l.down];
 return down+" and "+(l.toGo>=100-l.field?"goal":l.toGo)+" at "+wffFieldSpot(l)+".";
}
function wffLiveResult(l,message,ending=""){
 const next=l.specialTeams?.phase==="touchdown"?"Touchdown!":l.field<=0?"Safety!":
  l.possession!==l.snapLineup.possession?(ending||"Change of possession.")+" "+wffLiveSpotText(l):
  (ending?ending+" ":"")+wffLiveSpotText(l);
 l.playResult={message,next};
 return next;
}
function wffLiveLineup(l){
 const before=l.broadcastBefore;
 l.snapLineup={field:before.field,toGo:before.toGo,possession:before.possession,quarter:before.clock.quarter,
  formation:l.formation,variant:l.calledPlay?.play?.variant,quarterback:wffTurnoverQB(l,before.possession)?.name};
}
function wffLiveYards(yards){return Math.abs(yards)+" "+(Math.abs(yards)===1?"yard":"yards")}
function wffLiveChangePossession(spot){
 const l=wffLive,previous=l.possession;wffFieldSwitch(l,spot);
 if(l.overtime&&l.possession!==previous){l.overtime.completed[previous]=true;l.overtime.current=l.possession;wffOvertimeCheck(l)}
}
function wffOvertimeCheck(l){
 const ot=l.overtime;if(!ot||ot.ended||l.complete)return false;
 if(ot.completed[0]&&ot.completed[1]&&l.score[0]!==l.score[1]){ot.ended=true;wffLiveEvent("Overtime decided after both teams had a possession opportunity.",true);wffLiveFinish();return true}
 return false;
}
function wffOvertimeStart(){
 const l=wffLive,c=l.clock,receiver=l.r()<.5?0:1;
 l.overtime={completed:[false,false],current:receiver,ended:false};
 c.quarter=5;c.remaining=600;wffClockStop(c);c.timeouts=[2,2];
 l.breakType=null;l.paused=false;l.broadcastBefore=null;
 wffLiveEvent("OVERTIME! Ten minutes. Both teams get an opportunity to possess; the game can end in a tie.",true);
 wffSpecialTeamsKick(l,"kickoff",1-receiver,receiver);
 wffLiveRender();wffLiveSchedule();
}
function wffLiveEndPeriod(){
 const l=wffLive,c=l.clock;if(c.remaining>0||["conversion","touchdown","scoreHold"].includes(l.specialTeams?.phase))return false;
 if(c.quarter>=5){wffLiveEvent("Overtime expires.",true);wffLiveFinish();return true}
 if(c.quarter===4){if(l.score[0]===l.score[1])wffOvertimeStart();else wffLiveFinish();return true}
 if(c.quarter===2){
  l.breakType="halftime";l.paused=true;l.halftimeRemaining=15;
  wffLiveEvent("Halftime. Review first-half player statistics before continuing.",true);
  wffLiveStartHalftimeCountdown(l);
 }else{
  wffLiveEvent("End of quarter "+c.quarter+".",true);
 }
 if(c.quarter!==2)wffLiveContinue();
 return true;
}
function wffLiveStartHalftimeCountdown(l){
 if(l.halftimeTimer)clearInterval(l.halftimeTimer);
 l.halftimeTimer=setInterval(()=>{
  if(wffLive!==l||l.complete||l.breakType!=="halftime"){clearInterval(l.halftimeTimer);l.halftimeTimer=null;return}
  l.halftimeRemaining=Math.max(0,l.halftimeRemaining-1);
  const counter=document.getElementById("wff-halftime-countdown");
  if(counter)counter.textContent="3rd Quarter starts in "+l.halftimeRemaining+(l.halftimeRemaining===1?" second":" seconds");
  if(l.halftimeRemaining===0){clearInterval(l.halftimeTimer);l.halftimeTimer=null;wffLiveContinue()}
 },1000);
}
function wffLiveContinue(){
 const l=wffLive;if(!l||l.complete)return;
 const halftime=l.clock.quarter===2;
 if(l.halftimeTimer){clearInterval(l.halftimeTimer);l.halftimeTimer=null}
 l.clock.quarter++;l.clock.remaining=WFF_QUARTER_SECONDS;wffClockStop(l.clock);l.clock.warningPending=false;
 if(halftime){
  l.clock.timeouts=[3,3];wffSpecialTeamsKick(l,"kickoff",0,1);
  wffLiveEvent("Second half kickoff. Coaches have applied halftime adjustments.",true);
 }else wffLiveEvent("Quarter "+l.clock.quarter+" begins.",true);
 l.breakType=null;l.paused=false;wffLiveRender();wffLiveSchedule();
}

// The called defensive concept drives pressure and the box score.
function wffBlitzCall(l,offenseSide){
 const defense=1-offenseSide;
 const called=wffDefensivePressure(l.calledPlay?.defense);
 if(called){
  l.stats[defense].blitzCalls=(l.stats[defense].blitzCalls||0)+1;
  l.stats[offenseSide].blitzFaced=(l.stats[offenseSide].blitzFaced||0)+1;
 }
 return called;
}
function wffPassRushOutcome(l,side,calledBlitz){
 const offense=wffTurnoverRoster(l,side),defense=wffTurnoverRoster(l,1-side);
 const group=(p,g)=>dnaGroup(p.position)===g;
 const score=(p,keys)=>keys.reduce((n,k)=>n+Number(p.ratings?.[k]??p.overall??72),0)/keys.length;
 const rushers=defense.filter(p=>group(p,"EDGE")||group(p,"DT")||group(p,"LB")).map(p=>({
  player:p,skill:group(p,"EDGE")?score(p,["finesseMoves","powerMoves","pursuit"]):group(p,"DT")?score(p,["powerMoves","finesseMoves","blockShedding"]):score(p,["blockShedding","pursuit","playRecognition"])-7
 })).sort((a,b)=>b.skill-a.skill);
 const linemen=offense.filter(p=>group(p,"OL")).map(p=>score(p,["passBlock","passBlockPower","passBlockFinesse"]));
 const blockers=[...linemen,...offense.filter(p=>group(p,"TE")||group(p,"HB")).map(p=>score(p,["passBlock","passProtection"])-6)];
 const qb=wffTurnoverQB(l,side),pocket=Number(qb?.ratings?.pocketPresence??qb?.overall??75);
 const protection=linemen.length?linemen.reduce((a,b)=>a+b,0)/linemen.length:72;
 const rush=rushers.length?rushers.slice(0,4).reduce((a,b)=>a+b.skill,0)/Math.min(4,rushers.length):72;
 const edge=rushers.find(p=>group(p.player,"EDGE"));
 const blitz=!!calledBlitz;
 const longDown=l.toGo>=8&&l.down>=3;
 // Recognition and protection are independent of pass rush talent.
 const recognition=Math.max(.08,Math.min(.88,.43+(pocket-75)*.011+(protection-75)*.007+(blockers.length-5)*.018));
 const pickup=blitz&&l.r()<recognition;
 const quickThrow=blitz&&!pickup&&l.r()<Math.max(.08,Math.min(.65,.27+(pocket-75)*.008));
 const edgeBoost=edge?Math.max(0,edge.skill-protection)*.0012:0;
 let chance=.034+(rush-protection)*.0035+edgeBoost+(longDown?.010:0)-(pocket-75)*.0008;
 if(blitz)chance+=pickup?-.027:quickThrow?-.036:.027;
 if(blockers.length>=7)chance-=.012;
 if(protection>=rush+12)chance-=.023;
 if(rush>=protection+12)chance+=.025;
 chance=Math.max(.001,Math.min(.18,chance));
 const result={blitz,pickup,quickThrow,chance,sack:false};
 if(l.r()>=chance)return result;
 const candidates=rushers.slice(0,5),weights=candidates.map(p=>Math.max(1,p.skill-50)*(group(p.player,"EDGE")?1.4:1));
 let roll=l.r()*weights.reduce((a,b)=>a+b,0),winner=candidates[0]?.player;
 for(let i=0;i<candidates.length;i++){roll-=weights[i];if(roll<=0){winner=candidates[i].player;break}}
 return {...result,sack:true,defender:winner,quarterback:qb,yards:2+Math.floor(l.r()*8)};
}
function wffLiveMoment(l,kind,side,detail=""){
 (l.moments??=[]).push({kind,team:teamLabel(side===0?l.us:l.opp),detail});
}
function wffLiveFieldGoal(l,kicker,kick){
 const side=l.possession,made=l.r()<kick.probability,distance=Math.round(kick.distance);
 wffClockSnap(l.clock,"score",{duration:5});
 const message=kicker.name+": "+distance+"-yard field goal "+(made?"is good!":"is no good.");
 wffLiveMoment(l,made?"field-goal":"missed-field-goal",side,distance+" yards · "+kicker.name);
 wffLiveEvent(message,true);
 if(made){
  l.score[side]+=3;
  l.specialTeams={type:"kickoff",phase:"scoreHold",kickingSide:side,receivingSide:1-side};
  if(l.overtime){l.overtime.completed[side]=true;if(wffOvertimeCheck(l))return}
 }else{
  wffLiveChangePossession(l.field);
  l.playResult={message,next:wffLiveSpotText(l)};
 }
 if(!l.complete){wffLiveEndPeriod();wffLiveRender();wffLiveSchedule()}
}
function wffLiveStep(){
 const l=wffLive;if(!l||l.paused||l.breakType||l.complete)return;
 l.snapLineup=null;l.playResult=null;l.moments=[];l.broadcastBefore=null;
 const c=l.clock,side=l.possession,defenseSide=1-side,lead=l.score[side]-l.score[defenseSide];
 const lateHalf=c.quarter===2||c.quarter===4;
 const kicker=wffKickerForTeam(l.state,(side===0?l.us:l.opp).id);
 const kick=()=>wffKickDecision(kicker,l.field,{...l.weather,endHalf:lateHalf&&c.remaining<=12});
 if(c.warningPending||(wffClockWarningDue(c)&&c.remaining===120)){
  wffClockWarning(c);wffLiveEvent("Two-minute warning. Official timeout.",true);
  wffLiveRender();wffLiveSchedule();return;
 }
 const urgency=lateHalf&&c.remaining<=150&&(c.quarter===2||lead<=0);
 const needKick=lateHalf&&(c.quarter===2||lead>=-3&&lead<=0);
 const lateKick=needKick&&c.remaining<=35?kick():null;
 const spike=c.running&&urgency&&c.timeouts[side]===0&&l.down<=2&&c.remaining>=10&&c.remaining<=27&&
  (lateKick?.advisable||l.field>=70&&c.remaining>=17);
 if(c.running){
  const tempo=side===0?l.adjustments.tempo:"normal";
  const wait=Math.min(c.playClock-1,wffClockSnapWait({quarter:c.quarter,seconds:c.remaining,lead,tempo,random:l.r}));
  const context={quarter:c.quarter,seconds:c.remaining,clockRunning:true,down:l.down,toGo:l.toGo,field:l.field,warningAvailable:wffClockWarningDue(c),wait};
  const defenseTimeout=wffClockTimeoutDecision({...context,lead:-lead,ownTimeouts:c.timeouts[defenseSide],opponentHasBall:true});
  const offenseTimeout=!defenseTimeout&&wffClockTimeoutDecision({...context,lead,ownTimeouts:c.timeouts[side],opponentHasBall:false,inKickRange:urgency&&kick().advisable});
  if(defenseTimeout||offenseTimeout){
   const callingSide=defenseTimeout?defenseSide:side;
   c.timeouts[callingSide]--;wffClockStop(c);
   wffLiveEvent((callingSide===0?l.us.city:l.opp.city)+" calls "+(defenseTimeout?"a defensive":"an offensive")+" timeout. "+c.timeouts[callingSide]+" remaining.",true);
   wffLiveRender();wffLiveSchedule();return;
  }
  if(wffClockWarningDue(c)&&c.remaining>120&&c.remaining-wait<=120){
   wffClockRunoff(c,c.remaining-120);wffClockWarning(c);wffLiveEvent("Two-minute warning. Official timeout.",true);
   wffLiveRender();wffLiveSchedule();return;
  }
  const runoff=spike?Math.min(wait,5):wait;
  wffClockRunoff(c,runoff);c.playClock=Math.max(1,c.playClock-runoff);
  if(wffLiveEndPeriod()){wffLiveRender();return}
 }
 l.broadcastBefore={field:l.field,down:l.down,toGo:l.toGo,possession:l.possession,score:l.score.slice(),clock:{...c,timeouts:c.timeouts.slice()},specialTeams:null};
 l.calledPlay=wffCallPlay(l,side);
 l.formation={formation:l.calledPlay.formation,personnel:l.calledPlay.personnel,defense:l.calledPlay.defenseFormation};
 if(wffClockCanKneel({...c,down:l.down},lead,c.timeouts[defenseSide])){
  l.calledPlay=null;
  l.formation={formation:"Victory",personnel:"12",defense:l.formation.defense};
  wffLiveLineup(l);
  const offense=side===0?l.us:l.opp;
  l.stats[side].plays++;l.stats[side].rush++;l.stats[side].yards--;
  l.playCount++;l.field=Math.max(1,l.field-1);l.down++;l.toGo++;
  wffClockSnap(c,"kneel");
  wffLiveResult(l,"Quarterback kneels. Loss of 1 yard.");
  wffLiveEvent(offense.city+" takes a knee in victory formation.",true);
  wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return;
 }
 if(lateKick?.advisable&&c.remaining<=9){wffLiveFieldGoal(l,kicker,kick());return}
 if(spike){
  wffLiveLineup(l);wffClockSnap(c,"spike");l.down++;
  l.stats[side].plays++;l.stats[side].pass++;l.playCount++;
  const message="Quarterback spikes the ball to stop the clock.";
  wffLiveResult(l,message);wffLiveEvent(message,true);
  wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return;
 }
 const prePenalty=wffPenaltyRoll(l,side,false,"pre");
 if(prePenalty){
  wffLiveLineup(l);const message=wffPenaltyApply(l,prePenalty);
  wffLiveResult(l,message);wffLiveEvent(message,true);wffClockStop(c);
  wffLiveRender();wffLiveSchedule();return;
 }
 if(l.down===4){
  const profile=side===0?l.state.staff.hc.tendencies:wffCoachProfile(l.opp.id);
  const decision=wffCoachFourthCall({yard:l.field,toGo:l.toGo,quarter:c.quarter,seconds:c.remaining,lead,timeouts:c.timeouts[side],aggression:profile.aggression,judgment:profile.judgment,seed:l.state.week+"-"+l.playCount+"-"+side,wind:l.weather.wind,weather:l.weather.condition,kickerProfile:kicker,weatherDetails:l.weather});
  if(decision.call==="punt"){
   wffClockSnap(c,"kick",{duration:7});wffSpecialTeamsKick(l,"punt",side,1-side);
   wffLiveRender();wffLiveSchedule();return;
  }
  if(decision.call==="field_goal"){wffLiveFieldGoal(l,kicker,decision.kick);return}
  wffLiveEvent((side===0?l.us.city:l.opp.city)+" goes for it on fourth and "+l.toGo+".",true);
 }
 const selected=l.calledPlay.play;
 wffLiveLineup(l);
 const pass=selected?.kind==="pass";
 const defenseFocus=l.plans[1-side].defense,mods=wffPlanModifiers(l,side,pass,selected||{});
 const talent=side===0?l.state.roster.reduce((n,p)=>n+p.overall,0)/Math.max(1,l.state.roster.length):rating(l.opp.id,12);
 const opposingTalent=side===0?rating(l.opp.id,12):l.state.roster.reduce((n,p)=>n+p.overall,0)/Math.max(1,l.state.roster.length);
 const talentDelta=Math.max(-.06,Math.min(.06,(talent-opposingTalent)*.004));
 const blitzCalled=wffBlitzCall(l,side);
 const closing=wffClosingDrive(l,side);
 const rushOutcome=pass?wffPassRushOutcome(l,side,blitzCalled):null;
 const completionChance=Math.max(.28,Math.min(.84,.64+mods.completion+talentDelta+(rushOutcome?.pickup ? .035 : 0)+(rushOutcome?.quickThrow ? .025 : 0)-(rushOutcome?.blitz&&!rushOutcome.pickup&&!rushOutcome.quickThrow ? .045 : 0)));
 // A rare, pressure-driven throwaway: never count as a completion or interception.
 const throwAway=pass&&!rushOutcome?.sack&&!!rushOutcome?.blitz&&!rushOutcome?.pickup&&!rushOutcome?.quickThrow&&l.r()<.075;
 const complete=pass&&!throwAway&&l.r()<completionChance;
 const rawGain=pass?(complete?Math.floor((rushOutcome?.quickThrow?2+l.r()*7:3+l.r()*18)+mods.passYards):0):Math.floor(-2+l.r()*12+mods.runYards+talentDelta*12);
 const gain=Math.max(-8,rawGain);
 const livePenalty=wffPenaltyRoll(l,side,pass,"live");
 if(livePenalty){wffClockSnap(c,"penalty",{duration:5});l.playCount++;const message=wffPenaltyApply(l,livePenalty);wffLiveResult(l,message);wffLiveEvent(message,true);wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return}
 const sack=rushOutcome?.sack?rushOutcome:null;
 if(sack){
  const st=l.stats[side],dst=l.stats[1-side],loss=sack.yards;
  st.plays++;st.pass++;st.sacksAllowed=(st.sacksAllowed||0)+1;st.sackYardsLost=(st.sackYardsLost||0)+loss;st.yards-=loss;
  dst.sacks=(dst.sacks||0)+1;dst.sackYards=(dst.sackYards||0)+loss;
  l.playCount++;wffClockSnap(c,"run",{duration:7});
  l.field-=loss;l.down++;l.toGo+=loss;
  if(!l.liveSacks)l.liveSacks=[];
  l.liveSacks.push({teamId:side===0?l.opp.id:l.us.id,name:sack.defender?.name||"Defender",position:sack.defender?.position||"EDGE",yards:loss});

  const message=(sack.quarterback?.name||"Quarterback")+" sacked by "+(sack.defender?.name||"a defender")+" for a loss of "+wffLiveYards(loss)+".";
  wffLiveMoment(l,"sack",defenseSide,sack.defender?.name||"");
  wffLiveEvent(message,true);
  if(l.field<=0){wffLiveSafety(l,side,"quarterback sacked in his own end zone")}
  else if(l.down>4){st.turnovers++;wffLiveEvent("Turnover on downs after the sack.",true);wffLiveChangePossession(l.field)}
  wffLiveResult(l,message,l.possession!==side?"Turnover on downs.":"");
  wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return;
 }
 if(rushOutcome?.blitz){const st=l.stats[side];if(rushOutcome.pickup){st.blitzPickedUp=(st.blitzPickedUp||0)+1;wffLiveEvent("Blitz recognized and picked up — quarterback has time to throw.")}else if(rushOutcome.quickThrow){st.quickThrows=(st.quickThrows||0)+1;wffLiveEvent("Quarterback reads the blitz and releases a quick pass.")}}
 const target=pass&&!throwAway?wffLivePassTarget(l,side):null;
 const turnoverPass=pass&&!throwAway?wffTurnoverPass(l,side,{pressure:blitzCalled&&!rushOutcome?.pickup,desperate:urgency}):null;
 if(turnoverPass?.type==="interception"){
  wffClockSnap(c,"turnover",{duration:6});const st=l.stats[side];st.plays++;st.pass++;l.playCount++;
  const message=wffTurnoverRecord(l,side,turnoverPass);
  wffLiveMoment(l,"interception",defenseSide,turnoverPass.defender);
  wffLiveEvent(message,true);
  wffLiveChangePossession();wffLiveResult(l,message);wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return;
 }
 if(turnoverPass?.type==="nearPick"){
  wffClockSnap(c,"pass_incomplete",{duration:6});const st=l.stats[side];st.plays++;st.pass++;l.playCount++;
  const message="Pass incomplete."+(target?" Intended for "+target.name+".":"")+" "+wffTurnoverRecord(l,side,turnoverPass);
  wffLiveEvent(message,true);l.down++;if(l.down>4){st.turnovers++;wffLiveEvent("Turnover on downs.",true);wffLiveChangePossession(l.field)}
  wffLiveResult(l,message,l.possession!==side?"Turnover on downs.":"");
  wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return;
 }
 const fumble=!throwAway&&(!pass||complete)?wffTurnoverFumble(l,side,{pass,heavyHit:defenseFocus==="run"}):null;
 if(fumble){
  wffClockSnap(c,"run",{duration:7});const st=l.stats[side];st.plays++;if(pass)st.pass++;else st.rush++;l.playCount++;
  const message=wffTurnoverRecord(l,side,fumble);wffLiveEvent(message,true);
  wffLiveMoment(l,"fumble",fumble.recoveredByDefense?defenseSide:side,fumble.recoveredByDefense?fumble.defender:"Offense keeps possession");
  if(l.field<=2&&!fumble.recoveredByDefense&&l.r()<.25){wffLiveSafety(l,side,"offense recovered its own fumble in its end zone")}
  else if(fumble.recoveredByDefense){wffLiveChangePossession()}
  else{l.down++;if(l.down>4){st.turnovers++;wffLiveEvent("Turnover on downs after recovered fumble.",true);wffLiveChangePossession(l.field)}}
  wffLiveResult(l,message,!fumble.recoveredByDefense&&l.possession!==side?"Turnover on downs.":"");
  wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return;
 }
 if(selected)wffLiveEvent((side===0?l.us.city:l.opp.city)+" calls "+selected.formation+" "+selected.variant+" — "+selected.concept+" against "+l.calledPlay.defenseFormation+" "+l.calledPlay.defense.concept+".");
 const kind=pass?(complete?"pass_complete":"pass_incomplete"):"run";
 const outsideChance=closing?(pass?.03:.015):urgency?(pass?.22:.13):(pass?.12:.07);
 const outOfBounds=(!pass||complete)&&gain>0&&l.field+gain<100&&l.r()<outsideChance;
 const duration=kind==="pass_incomplete"?3+Math.floor(l.r()*5):Math.min(12,4+Math.floor(Math.max(0,gain)/5)+Math.floor(l.r()*3));
 wffClockSnap(c,kind,{duration,outOfBounds});
 const st=l.stats[side];st.plays++;l.playCount++;if(pass)st.pass++;else st.rush++;st.yards+=gain;
 const name=side===0?l.us.city:l.opp.city;
 const netYards=Math.max(-l.field,Math.min(100-l.field,gain));
 const runResult=netYards>0?"Run +"+wffLiveYards(netYards)+".":netYards<0?"Run for a loss of "+wffLiveYards(netYards)+".":"Run. No gain.";
 const passResult=throwAway?"Pass incomplete. Quarterback throws it away.":complete?
  "Pass complete"+(target?" to "+target.name:"")+(netYards<0?" for a loss of ":" for ")+wffLiveYards(netYards)+".":
  "Pass incomplete"+(target?". Intended for "+target.name:"")+".";
 const message=(pass?passResult:runResult)+(outOfBounds?" Out of bounds.":"");
 const firstDown=gain>=l.toGo&&l.field+gain<100;



 l.field+=gain;
 if(l.field<=0){wffLiveSafety(l,side,"ball carrier tackled in his own end zone")}
 else if(l.field>=100){l.score[side]+=6;wffLiveMoment(l,"touchdown",side,target?.name||"");wffLiveEvent(name+" scores a touchdown!",true);l.specialTeams={type:"kickoff",phase:"touchdown",goTwo:wffTryTwoAfterTouchdown(l,side),kickingSide:side,receivingSide:1-side};wffClockStop(l.clock);
  if(l.overtime){l.overtime.completed[side]=true;}
 }
 else if(gain>=l.toGo){st.firstDowns++;l.down=1;l.toGo=Math.min(10,100-l.field)}
 else{l.down++;l.toGo=Math.max(1,l.toGo-gain);if(l.down>4){st.turnovers++;wffLiveEvent("Turnover on downs.",true);wffLiveChangePossession()}}
 const next=wffLiveResult(l,message,firstDown?"First down!":l.possession!==side?"Turnover on downs.":"");
 wffLiveEvent(name+" — "+message+" "+next);
 wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();
}
function wffLiveFinish(){
 const l=wffLive;if(!l||l.complete)return;l.complete=true;l.breakType=null;wffLiveStop();
 const state=l.state;const homeScore=l.score[0],awayScore=l.score[1];
 if(homeScore>awayScore)state.wins++;else if(homeScore<awayScore)state.losses++;else state.ties=(state.ties||0)+1;
 const game={week:state.week,home:teamLabel(l.us),away:teamLabel(l.opp),homeScore,awayScore,totalPlays:l.playCount,penalties:l.penaltyLog,turnovers:l.stats.map(x=>({interceptions:x.interceptions||0,fumbles:x.fumbles||0,fumblesLost:x.fumblesLost||0,nearInterceptions:x.nearInterceptions||0})),log:l.events.slice(0,16).map(x=>x.message),stats:l.stats};
 game.fixtureId=l.matchup.id;game.teamIds=[l.us.id,l.opp.id];game.year=state.finance.year;game.liveSacks=l.liveSacks||[];
 state.games.push(game);wffBusinessRecordGame(state,game);
 const medical=wffPlayWorkload(state,l.weather,"week-"+state.week);
 if(medical.injuries.length)wffLiveEvent("Medical report: "+medical.injuries.length+" injuries recorded.",true);
 wffLeagueCompleteWeek(state,{homeScore:l.matchup.home===state.teamId?homeScore:awayScore,awayScore:l.matchup.home===state.teamId?awayScore:homeScore});wffMedicalAdvance(state);l.finalGame=game;save();wffLiveEvent("Final score. Game saved to franchise history.",true);wffLiveRender();
}
function wffHalftimeView(l){
 const panel=side=>{
  const roster=wffTurnoverRoster(l,side);
  const qb=roster.find(p=>p.position==="QB"),hb=roster.find(p=>p.position==="HB"),wr=roster.find(p=>p.position==="WR");
  const team=l.stats[side],plays=team.plays||0;
  const entries=[
   {p:qb,stat:(team.pass||0)+" team pass plays • "+(team.yards||0)+" team total yards"},
   {p:hb,stat:(team.rush||0)+" team rushing plays"},
   {p:wr,stat:(team.firstDowns||0)+" team first downs"}
  ];
  return '<div class="wff-half-team"><h3>'+esc(teamLabel(side===0?l.us:l.opp))+'</h3>'+entries.filter(x=>x.p).map(x=>'<div class="wff-half-player"><strong>'+esc(x.p.name)+' ('+esc(x.p.position)+')</strong><span>'+esc(x.stat)+'</span></div>').join("")+'</div>';
 };
 return '<div class="wff-halftime-graphic"><h2>HALFTIME</h2><div class="wff-half-scoreboard">'+[0,1].map(side=>{const team=side===0?l.us:l.opp;return '<div class="wff-half-score-team"><div class="wff-half-score-logo">'+wffLogo(team,128)+'</div><strong class="wff-half-score-name">'+esc(teamLabel(team))+'</strong><span class="wff-half-score-number">'+l.score[side]+'</span></div>'}).join('<span class="wff-half-score-divider">—</span>')+'</div><div class="wff-half-grid">'+panel(0)+panel(1)+'</div><small>Team first-half totals shown alongside featured players; individual player statistics are not yet tracked.</small></div>';
}
function wffLiveRender(){
 const l=wffLive;if(!l)return;
 clearTimeout(l.broadcastRevealTimer);l.broadcastRevealTimer=null;
 const stats=l.stats.map((x,i)=>'<div class="stat"><strong>'+esc(i===0?l.us.city:l.opp.city)+'</strong><p>'+x.plays+' plays • '+x.yards+' yards</p><small>'+x.pass+' passes • '+x.rush+' rushes • '+x.firstDowns+' first downs</small></div>').join("");
 const ticker=l.league.slice(0,8).map(x=>'<div class="line"><span>'+esc(x.away)+' '+x.awayScore+'</span><span>'+esc(x.home)+' '+x.homeScore+'</span></div>').join("");
 const planSummary='<p class="muted">Game plans • '+esc(l.us.city)+': '+esc(WFF_OFF_FOCUS[l.plans[0].offense].name)+' / '+esc(WFF_DEF_FOCUS[l.plans[0].defense].name)+' • '+esc(l.opp.city)+': '+esc(WFF_OFF_FOCUS[l.plans[1].offense].name)+' / '+esc(WFF_DEF_FOCUS[l.plans[1].defense].name)+'</p>';
 const buttons=l.breakType==="halftime"?'<span id="wff-halftime-countdown" role="timer">3rd Quarter starts in '+(l.halftimeRemaining??15)+' seconds</span>':l.complete?'<button class="btn" id="live-box-score">View Box Score</button> <button class="btn secondary" id="live-return">Return to Game Day</button>':'<button class="btn secondary" id="live-pause">'+(l.paused?"Resume":"Pause")+'</button>';
 const before=l.broadcastBefore;
 l.broadcastBefore=null;
 const preview=before&&l.snapLineup&&l.playResult&&!l.complete&&!l.paused&&!l.breakType;
 const board=preview?{...l,...before,playResult:{message:"Teams are set."},moments:[]}:l;
 const c=board.clock,broadcastDown=wffFieldStatus(board);
 const halftime=l.breakType==="halftime"?wffHalftimeView(l):"";
 const html='<section class="panel wff-live-controls"><h2>WFF Live Game • CPU vs CPU</h2><p class="muted">'+esc(broadcastDown)+' • Play clock '+c.playClock+'s • Timeouts '+c.timeouts.join(' / ')+'</p>'+planSummary+'<div class="toolbar"><label>Viewing speed <select id="live-speed">'+[["slow","Slow • 6–9 sec"],["medium","Medium • 3–5 sec"],["fast","Fast • 2 sec"]].map(([key,label])=>'<option value="'+key+'" '+(l.speed===key?"selected":"")+'>'+label+'</option>').join("")+'</select></label>'+buttons+'</div><p class="muted">Timing and scores are simulated. Viewing speed never changes the game model.</p></section>'+(l.breakType==="halftime"?halftime:wffFieldView(board))+'<section class="panel"><h2>Game Statistics</h2><div class="grid">'+stats+'</div></section>'+wffPenaltySummary(l)+wffTurnoverView(l)+'<section class="panel"><h2>Scores Around the League</h2><p class="muted">Simulated scheduled league results for Week '+l.state.week+'; other games are generated deterministically and recorded after your game finishes.</p>'+ticker+'</section>';
 const v=document.getElementById("view");if(!v)return;v.innerHTML=html;
 if(preview){
  const delay=Math.min(1100,WFF_LIVE_SPEED[l.speed]/4);
  l.broadcastRevealTimer=setTimeout(()=>{if(wffLive===l)wffLiveRender()},delay);
 }
 document.getElementById("live-speed").onchange=e=>{l.speed=e.target.value;wffLiveRender();wffLiveSchedule()};
 const pause=document.getElementById("live-pause");if(pause)pause.onclick=()=>{l.paused=!l.paused;wffLiveRender();wffLiveSchedule()};
 const next=document.getElementById("live-continue");if(next)next.onclick=wffLiveContinue;
 const box=document.getElementById("live-box-score");if(box)box.onclick=()=>{const v=document.getElementById("view");v.innerHTML=wffGameBoxScoreView(l.state,l.finalGame||l.state.games.at(-1))+'<button class="btn secondary" id="box-return">Return to Game Day</button>';document.getElementById("box-return").onclick=()=>{wffLive=null;l.redraw()}};
 const back=document.getElementById("live-return");if(back)back.onclick=()=>{wffLive=null;l.redraw()};
 document.querySelectorAll("[data-live-adjust]").forEach(el=>el.onchange=()=>{l.adjustments[el.dataset.liveAdjust]=el.value});
}
