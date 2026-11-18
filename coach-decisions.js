"use strict";
// WFF coaching decisions: probability-weighted, situational, CPU-only.
function wffCoachProfile(teamId,coach){
 const r=wffRandom(teamId,"coach-decision-v1");
 return {aggression:Math.round(25+r()*65),judgment:Math.round(45+r()*50),adaptability:Math.round(40+r()*55),clockManagement:Math.round(40+r()*55)};
}
function wffEnsureCoachTendencies(state){
 if(!state.staff?.hc)return false;
 if(state.staff.hc.tendencies)return false;
 state.staff.hc.tendencies=wffCoachProfile(state.teamId,state.staff.hc);return true;
}
function wffFourthDecision(input){
 const {yard=50,toGo=1,quarter=2,seconds=600,lead=0,timeouts=3,aggression=50,judgment=70,kicker=75,runStrength=75,opponentRunDefense=75,seed=0}=input;
 const r=dnaRandom(dnaHash("fourth|"+seed));
 // yard: 0 is own goal line, 100 is opponent goal line.
 const late=quarter===4&&seconds<=240;
 const desperation=late&&lead<0;
 const clockUrgency=desperation?Math.min(1,(240-seconds)/240):0;
 if(yard<=15&&!desperation)return {call:"punt",probability:0,reason:"Protect field position deep in own territory"};
 if(late&&lead>0&&seconds<=120&&yard<60)return {call:"punt",probability:0,reason:"Protect a late lead and field position"};
 if(desperation&&seconds<90&&lead>=-8)return {call:"go",probability:1,reason:"Late comeback requires possession"};
 const distance=Math.max(0,toGo);
 const distanceScore=distance<=1?.24:distance<=2?.13:distance<=3?.04:distance<=5?-.13:distance<=8?-.35:-.55;
 const fieldScore=yard<25?-.55:yard<40?-.28:yard<50?-.11:yard<65?.10:yard<82?.19:.13;
 const aggressionScore=(aggression-50)*.0055;
 const matchup=(runStrength-opponentRunDefense)*.002;
 const urgency=desperation?.52+clockUrgency*.26:late&&lead<0?.18:late&&lead>0?-.13:0;
 const judgmentAdjustment=(judgment-65)*.001;
 const raw=.36+distanceScore+fieldScore+aggressionScore+matchup+urgency+judgmentAdjustment;
 const goProbability=Math.max(.01,Math.min(.96,raw));
 const fieldGoalRange=yard>=61&&yard<=96&&(100-yard)<=39+(kicker-75)*.17;
 const go=r()<goProbability;
 const call=go?"go":fieldGoalRange?"field_goal":"punt";
 return {call,probability:goProbability,reason:desperation?"Late-game urgency":fieldGoalRange?"Field-goal range and fourth-down risk":"Field position, distance and coach tendencies"};
}
function wffCoachView(state){
 const c=state.staff.hc;wffEnsureCoachTendencies(state);
 const t=c.tendencies;
 return '<section class="panel"><h2>Head Coach Decision Tendencies</h2><p><strong>'+esc(c.name)+'</strong> • '+esc(c.specialty)+'</p><div class="grid">'+[["Fourth-down aggression",t.aggression],["Situational judgment",t.judgment],["Adaptability",t.adaptability],["Clock management",t.clockManagement]].map(([name,n])=>'<div class="stat"><small>'+name+'</small><b>'+n+'/100</b></div>').join("")+'</div><p class="muted">Fourth-down calls use field position, yards to gain, score, time remaining, kicker range, and matchup. Aggression changes the likelihood of going for it, not an absolute rule. This is a prototype decision model.</p></section>';
}

function wffCoachFieldGoal(input){
 const {yard=50,wind=0,weather="Clear",kicker=75}=input;
 const distance=117-yard;
 const max=53+(kicker-75)*.19-Math.max(0,wind-10)*.22-(weather==="Snow"?4:weather==="Heavy Rain"?3:0);
 const probability=Math.max(.02,Math.min(.99,.91-(distance-32)*.016+(kicker-75)*.003-Math.max(0,wind-10)*.004));
 return {distance,max,probability,inRange:distance<=max&&yard<100};
}
function wffCoachFourthCall(input){
 const kick=wffCoachFieldGoal(input);
 const base=wffFourthDecision({...input,kicker:input.kicker||75});
 const yard=input.yard||0;
 const late=input.quarter===4&&input.seconds<=180;
 const trailing=input.lead<0;
 // Short, urgent fourth downs must preserve possession.
 if(late&&trailing&&input.seconds<=75)return {...base,call:"go",reason:"Must preserve possession late",kick};
 if(base.call==="field_goal"&&!kick.inRange)return {...base,call:yard>=45?"go":"punt",reason:"Outside realistic field-goal range",kick};
 if(base.call==="punt"&&kick.inRange&&!(late&&trailing&&input.lead<=-4&&input.lead>=-8))return {...base,call:"field_goal",reason:"Manage scoring opportunity",kick};
 if(base.call==="punt"&&yard>=55&&input.toGo<=2&&input.quarter!==4&&input.aggression>=65)return {...base,call:"go",reason:"Short yardage in opponent territory",kick};
 return {...base,kick};
}
function wffCoachConversionProbability(toGo,runStrength=75,defense=75,weatherFactor=1){
 return Math.max(.10,Math.min(.90,(toGo<=1?.71:toGo<=2?.61:toGo<=3?.51:toGo<=5?.39:.24)+(runStrength-defense)*.004))*weatherFactor;
}
function wffCoachTimeoutChoice({quarter,seconds,lead,ownTimeouts,opponentHasBall,opponentRunning,down}){
 if(!ownTimeouts)return false;
 if(quarter===4&&lead<0&&opponentHasBall&&opponentRunning&&seconds<=155)return true;
 if((quarter===2||quarter===4)&&lead<0&&!opponentHasBall&&seconds<=45&&down>=3)return true;
 return false;
}
