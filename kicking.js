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
 const distance=117-fieldPosition,wind=Number(weather.wind)||0;
 const penalty=Math.max(0,wind-10)*.18+(/snow/i.test(weather.condition||"")?3:0)+(/heavy rain/i.test(weather.condition||"")?2:0);
 const maximum=Math.max(38,Math.min(65,Math.round(45+(k.power-65)*.40-penalty)));
 const reachable=distance<=maximum;
 const accuracyBase=.95-(100-k.accuracy)*.0032;
 const distanceLoss=Math.max(0,distance-30)*(.011+(100-k.accuracy)*.00008);
 const pressure=weather.pressure?Math.max(0,(80-k.composure)*.002):0;
 const probability=reachable?Math.max(.04,Math.min(.98,accuracyBase-distanceLoss-pressure-penalty*.007)):0;
 return {distance,maximum,reachable,probability};
}
function wffKickDecision(k,fieldPosition,weather={}){
 const e=wffKickEstimate(k,fieldPosition,weather);
 // Even exceptional long attempts require a compelling situation.
 // A 52-yard attempt from the opponent's 35 is a normal professional FG choice
 // if the kicker can reach it. Do not punt solely due to an arbitrary 38% cutoff.
 const ordinary=e.reachable&&e.distance<=55&&e.probability>=.18;
 const longRange=e.reachable&&e.distance<=58&&e.probability>=.28;
 const exceptional=e.reachable&&e.distance<=62&&e.probability>=.20&&weather.endHalf===true;
 return {...e,advisable:ordinary||longRange||exceptional};
}

/* NFL-calibrated punt model: ~47 gross / ~41 net in neutral conditions.
   Strength affects carry modestly; directional placement trades yards for control. */
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
 // Wind direction changes by quarter/end; not every kick gets a tailwind.
 const windDirection=indoor?0:(random()<.5?-1:1);
 const windImpact=indoor?0:Math.min(7,wind*.27)*windDirection;
 const power=Math.max(50,Math.min(99,Number(punter.power)||78));
 const accuracy=Math.max(50,Math.min(99,Number(punter.accuracy)||78));
 const directional=origin>=55;
 const target=47.1+(power-80)*.16+windImpact-(directional?Math.min(15,(origin-55)*.36):0);
 const variation=(random()+random()+random()-1.5)*(7.5+(100-accuracy)*.065);
 const weatherLoss=/snow|heavy rain/i.test(condition)?2.5:0;
 const distance=Math.max(24,Math.min(70,Math.round(target+variation-weatherLoss)));
 const landing=origin+distance;
 // Returnable punts average roughly ten yards per actual return, but many are
 // fair-caught or downed. Touchbacks are uncommon for normal midfield punts.
 const touchback=landing>=100&&(random()<(directional?Math.max(.12,Math.min(.55,.40-(accuracy-75)*.006)):.90));
 const fairCatch=!touchback&&random()<(directional?.55:.31);
 const returnYards=touchback||fairCatch?0:Math.max(0,Math.round(5+random()*10+random()*5));
 const receiveSpot=touchback?20:Math.max(1,Math.min(99,100-landing+returnYards));
 return {distance,landing,touchback,fairCatch,returnYards,receiveSpot,windImpact,punterName:punter.name};
}
