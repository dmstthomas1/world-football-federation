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
