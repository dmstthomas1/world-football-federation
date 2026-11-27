"use strict";
// WFF kicking model. Distance = 17 + yards to opponent goal.
function wffKickerForTeam(state,teamId){
 const own=state&&state.teamId===teamId;
 const p=own&&state.roster?.find(p=>p.position==="K"&&p.ratings);
 if(p)return {name:p.name,power:p.ratings.kickPower,accuracy:p.ratings.kickAccuracy,composure:p.mentality?.composure||75,archetype:p.archetype};
 const r=dnaRandom(dnaHash("kicker|"+teamId));const type=Math.floor(r()*4);
 const profiles=[["Power Kicker",91,72],["Precision Kicker",73,91],["Balanced Kicker",83,82],["Developmental Kicker",76,70]];
 const [archetype,power,accuracy]=profiles[type];return {name:"Team Kicker",archetype,power:Math.round(power+(r()-.5)*12),accuracy:Math.round(accuracy+(r()-.5)*12),composure:65+Math.floor(r()*30)};
}
function wffKickEstimate(k,fieldPosition,weather={}){
 const distance=117-fieldPosition;
 const wind=Math.max(0,Number(weather.wind)||0);
 const condition=String(weather.condition||"");
 const severe=/snow|heavy rain/i.test(condition);
 const windPenalty=Math.max(0,wind-12)*.12;
 const power=Math.max(50,Math.min(99,Number(k.power)||78));
 const accuracy=Math.max(50,Math.min(99,Number(k.accuracy)||78));
 // NFL kickers routinely attempt kicks from 45-55 yards. Strength and
 // adverse conditions modify the upper range, not routine 47-yard tries.
 const maximum=Math.max(50,Math.min(67,Math.round(59+(power-80)*.25-windPenalty-(severe?2:0))));
 const reachable=distance<=maximum;
 const bands=[[0,.985],[30,.965],[40,.915],[45,.86],[50,.76],[55,.67],[60,.49],[65,.23],[70,.06]];
 let base=bands[bands.length-1][1];
 for(let i=1;i<bands.length;i++)if(distance<bands[i][0]){const [d0,p0]=bands[i-1],[d1,p1]=bands[i];base=p0+(p1-p0)*(distance-d0)/(d1-d0);break}
 const weatherLoss=Math.max(0,wind-10)*.0025+(severe?.035:0);
 const probability=reachable?Math.max(.02,Math.min(.995,base+(accuracy-80)*.0025+(power-80)*.0008-weatherLoss)):0;
 return {distance,maximum,reachable,probability};
}
function wffKickDecision(k,fieldPosition,weather={}){
 const e=wffKickEstimate(k,fieldPosition,weather);
 // Even exceptional long attempts require a compelling situation.
 // A 52-yard attempt from the opponent's 35 is a normal professional FG choice
 // if the kicker can reach it. Do not punt solely due to an arbitrary 38% cutoff.
 const ordinary=e.reachable&&e.distance<=55&&e.probability>=.35;
 const longRange=e.reachable&&e.distance<=59&&e.probability>=.45;
 const exceptional=e.reachable&&e.distance<=62&&e.probability>=.20&&weather.endHalf===true;
 return {...e,advisable:ordinary||longRange||exceptional};
}

// Directional placement trades distance for a chance to pin the receiving team.
function wffPunterForTeam(state,teamId){
 const own=state&&state.teamId===teamId;
 const p=own&&state.roster?.find(p=>p.position==="P");
 if(p){
  const ratings=p.ratings||{};
  return {name:p.name||"Team Punter",power:Number(ratings.kickPower??ratings.puntPower??p.overall??78),accuracy:Number(ratings.kickAccuracy??ratings.puntAccuracy??p.overall??78)};
 }
 const r=dnaRandom(dnaHash("punter|"+teamId));
 return {name:"Team Punter",power:Math.round(72+r()*21),accuracy:Math.round(70+r()*24)};
}
function wffPuntEstimate(punter,origin,weather,r){
 const random=typeof r==="function"?r:Math.random;
 const wind=Math.max(0,Number(weather?.wind)||0);
 const condition=String(weather?.condition||"");
 const indoor=/indoor|dome|roof closed/i.test(condition);
 const windImpact=indoor?0:Math.min(7,wind*.27)*(random()<.5?-1:1);
 const power=Math.max(50,Math.min(99,Number(punter.power)||78));
 const accuracy=Math.max(50,Math.min(99,Number(punter.accuracy)||78));
 const toGoal=100-origin;
 // nflverse 2022–25 regular-season punts from either 45 to midfield, excluding
 // penalties and blocks: 40.7% at the 10 or deeper, 14.7% touchbacks, 4.5% deep OOB.
 // Play-by-play records where a punt ended, so the sideline aim rate is a model input.
 const placement=origin>=45;
 const sideline=random()<(placement?.24:.20);
 const weatherLoss=/snow|heavy rain/i.test(condition)?2.5:0;
 const fullKick=47.1+(power-80)*.16+Math.max(0,Math.min(1,(origin-28)/12))*3.6;
 const aim=placement?Math.min(fullKick,toGoal-(sideline?11.6:9.0)+Math.max(0,origin-55)*.15):fullKick-(sideline?2:0);
 const spread=(placement?(sideline?10.4:7.8):11)+(80-accuracy)*.14;
 const variation=(random()+random()+random()-1.5)*spread;
 const airDistance=Math.max(8,Math.min(70,Math.round(aim+windImpact+variation-weatherLoss)));
 const landing=origin+airDistance;
 const landingSpot=100-landing;
 const settled=(outcome,kickSpot,returnYards=0,bounced=false)=>({
  outcome,placement,sideline,bounced,distance:toGoal-kickSpot,airDistance,landing,
  touchback:outcome==="touchback",fairCatch:outcome==="fair_catch",returnYards,
  receiveSpot:outcome==="touchback"?20:Math.min(99,kickSpot+returnYards),
  windImpact,punterName:punter.name
 });
 if(landingSpot<=0)return settled("touchback",0);
 const control=Math.max(.20,Math.min(.72,.46+(accuracy-80)*.007-Math.abs(windImpact)*.015));
 if(sideline&&random()<control)return settled("out_of_bounds",landingSpot);
 // WFF returners stay away at their own five or deeper. From six through ten,
 // the chance of letting the ball bounce falls quickly as fielding becomes safer.
 const letBounce=landingSpot<=5||random()<(placement?Math.max(.12,.43-(landingSpot-5)*.052):.16);
 if(letBounce){
  const touchbackChance=landingSpot<=5?.84-(landingSpot-1)*.025:Math.max(0,.40-landingSpot*.035);
  if(touchbackChance>0&&random()<touchbackChance)return settled("touchback",0,0,true);
  const hop=Math.round(random()*7)-2;
  const stop=Math.max(1,Math.min(99,landingSpot-hop));
  return settled("downed",stop,0,true);
 }
 const fairChance=placement?(landingSpot<=12?.86:.75):.39;
 if(random()<fairChance)return settled("fair_catch",landingSpot);
 return settled("return",landingSpot,Math.round(2+random()*9+random()*7));
}
