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
