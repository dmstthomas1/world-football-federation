"use strict";
// WFF turnover engine: per-attempt interception, near-pick, and fumble chances.
// Approximate targets, not yet validated against a multi-season sample.
const WFF_TURNOVER_TARGETS={interceptionsPerAttempt:.024,fumblesPerScrimmagePlay:.012,fumbleDefenseRecovery:.50};
function wffTurnoverClamp(v,min,max){return Math.max(min,Math.min(max,v))}
function wffTurnoverRoster(l,side){return side===0?l.state.roster:(l.opponentPenaltyRoster||(l.opponentPenaltyRoster=makeRoster(l.opp.id).map((p,i)=>dnaBuild(p,l.opp.id,i,false))))}
function wffTurnoverPick(l,side,positions){const pool=wffTurnoverRoster(l,side).filter(p=>positions.includes(dnaGroup(p.position)));return pool.length?pool[Math.floor(l.r()*pool.length)]:null}
function wffTurnoverQB(l,side){return wffTurnoverRoster(l,side).find(p=>p.position==="QB")||null}
function wffTurnoverDefender(l,side){return wffTurnoverPick(l,side,["CB","S","LB","EDGE"])||{name:"Defender",position:"DB",ratings:{}}}
function wffTurnoverPass(l,side,context={}){
 const qb=wffTurnoverQB(l,side),a=qb?.ratings||{},def=wffTurnoverDefender(l,1-side),d=def.ratings||{};
 const accuracy=(Number(a.mediumAccuracy??qb?.overall??75)+Number(a.shortAccuracy??75)+Number(a.awareness??75))/3;
 const coverage=(Number(d.playRecognition??75)+Number(d.catching??75))/2;
 const pressure=context.pressure?1.28:1,desperate=context.desperate?1.23:1;
 const risk=wffTurnoverClamp(.024*(1+(76-accuracy)*.022)*(1+(coverage-75)*.006)*pressure*desperate,.007,.065);
 const roll=l.r();
 if(roll<risk)return {type:"interception",qb:qb?.name||"Quarterback",defender:def.name,probability:risk};
 if(roll<risk+Math.max(.035,risk*2.4))return {type:"nearPick",qb:qb?.name||"Quarterback",defender:def.name};
 return null;
}
function wffTurnoverFumble(l,side,context={}){
 const ballCarrier=context.pass?wffTurnoverPick(l,side,["WR","TE","HB"]):wffTurnoverPick(l,side,["HB","QB","WR","TE"]);
 const p=ballCarrier||wffTurnoverQB(l,side),ratings=p?.ratings||{},discipline=Number(p?.mentality?.discipline??75);
 const carry=Number(ratings.carrying??p?.overall??75),weather=String(l.weather?.condition||"").toLowerCase();
 const wet=/rain|snow|storm|ice/.test(weather)?1.2:1;
 const risk=wffTurnoverClamp(.012*(1+(75-carry)*.017)*(1+(72-discipline)*.006)*wet*(context.heavyHit?1.2:1),.003,.04);
 if(l.r()>=risk)return null;
 const recoveredByDefense=l.r()<wffTurnoverClamp(.50+(Number(context.heavyHit)||0)*.025,.40,.60);
 const defender=wffTurnoverDefender(l,1-side);
 return {type:recoveredByDefense?"fumbleLost":"fumbleRetained",carrier:p?.name||"Ball carrier",defender:defender.name,recoveredByDefense};
}
function wffTurnoverRecord(l,side,event){
 const offense=l.stats[side],defense=l.stats[1-side];offense.fumbles=(offense.fumbles||0)+(event.type.startsWith("fumble")?1:0);
 if(event.type==="nearPick"){offense.nearInterceptions=(offense.nearInterceptions||0)+1;return "Nearly intercepted! "+event.defender+" gets a hand on the pass, but can't hold on."}
 if(event.type==="fumbleRetained"){offense.fumblesRecovered=(offense.fumblesRecovered||0)+1;return event.carrier+" fumbles! The offense falls on the loose ball and keeps possession."}
 offense.turnovers=(offense.turnovers||0)+1;defense.takeaways=(defense.takeaways||0)+1;
 if(event.type==="interception"){offense.interceptions=(offense.interceptions||0)+1;return "INTERCEPTED! "+event.defender+" picks off "+event.qb+"!"}
 offense.fumblesLost=(offense.fumblesLost||0)+1;return "FUMBLE! "+event.carrier+" loses the ball, recovered by "+event.defender+" for the defense!";
}
function wffTurnoverView(l){
 return '<section class="panel"><h2>Turnovers & Ball Security</h2><div class="grid">'+l.stats.map((s,i)=>'<div class="stat"><strong>'+esc(i===0?l.us.city:l.opp.city)+'</strong><p>'+(s.turnovers||0)+' giveaways • '+(s.interceptions||0)+' INT • '+(s.fumbles||0)+' fumbles ('+(s.fumblesLost||0)+' lost)</p><small>'+(s.nearInterceptions||0)+' near interceptions</small></div>').join("")+'</div></section>';
}
