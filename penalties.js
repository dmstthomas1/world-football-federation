"use strict";
// WFF penalty model: common NFL-style fouls with player-specific discipline,
// team tendencies, realistic rarity, and simplified enforcement.
// Distinct rare fouls are represented in the catalog but not all NFL rulebook
// exceptions (spot fouls, runoff, half-distance, offsetting) are modeled.
const WFF_PENALTIES={
 falseStart:{name:"False start",yards:5,side:"offense",phase:"pre",positions:["OL","TE","WR","QB"],weight:28},
 offside:{name:"Offside",yards:5,side:"defense",phase:"pre",positions:["EDGE","DT","LB"],weight:10},
 neutralZone:{name:"Neutral zone infraction",yards:5,side:"defense",phase:"pre",positions:["EDGE","DT"],weight:4},
 encroachment:{name:"Encroachment",yards:5,side:"defense",phase:"pre",positions:["EDGE","DT"],weight:2},
 holdingOff:{name:"Offensive holding",yards:10,side:"offense",phase:"live",positions:["OL","TE","WR"],weight:29},
 holdingDef:{name:"Defensive holding",yards:5,side:"defense",phase:"live",autoFirst:true,positions:["CB","S","LB"],weight:7},
 dpi:{name:"Defensive pass interference",yards:15,side:"defense",phase:"pass",spot:true,autoFirst:true,positions:["CB","S","LB"],weight:13},
 opi:{name:"Offensive pass interference",yards:10,side:"offense",phase:"pass",positions:["WR","TE"],weight:3},
 illegalContact:{name:"Illegal contact",yards:5,side:"defense",phase:"pass",autoFirst:true,positions:["CB","S","LB"],weight:3},
 roughingPasser:{name:"Roughing the passer",yards:15,side:"defense",phase:"pass",autoFirst:true,positions:["EDGE","DT","LB"],weight:2},
 unnecessaryRoughness:{name:"Unnecessary roughness",yards:15,side:"either",phase:"live",autoFirst:true,positions:["EDGE","DT","LB","S","OL","TE"],weight:2},
 facemask:{name:"Face mask",yards:15,side:"either",phase:"live",autoFirst:true,positions:["EDGE","DT","LB","S","CB","OL"],weight:3},
 illegalBlock:{name:"Illegal block in the back",yards:10,side:"offense",phase:"live",positions:["WR","TE","OL"],weight:2},
 illegalFormation:{name:"Illegal formation",yards:5,side:"offense",phase:"pre",positions:["OL","WR","TE"],weight:3},
 illegalShift:{name:"Illegal shift",yards:5,side:"offense",phase:"pre",positions:["WR","TE","QB"],weight:2},
 illegalMotion:{name:"Illegal motion",yards:5,side:"offense",phase:"pre",positions:["WR","TE","HB"],weight:2},
 delayGame:{name:"Delay of game",yards:5,side:"offense",phase:"pre",positions:["QB"],weight:3},
 intentionalGrounding:{name:"Intentional grounding",yards:10,side:"offense",phase:"pass",lossDown:true,positions:["QB"],weight:1},
 illegalHands:{name:"Illegal use of hands",yards:5,side:"defense",phase:"live",autoFirst:true,positions:["CB","S","LB","EDGE"],weight:2},
 ineligibleDownfield:{name:"Ineligible receiver downfield",yards:5,side:"offense",phase:"pass",positions:["OL"],weight:2},
 illegalForwardPass:{name:"Illegal forward pass",yards:5,side:"offense",phase:"pass",lossDown:true,positions:["QB"],weight:.3},
 roughingKicker:{name:"Roughing the kicker",yards:15,side:"defense",phase:"kick",autoFirst:true,positions:["EDGE","LB"],weight:.2},
 runningKicker:{name:"Running into the kicker",yards:5,side:"defense",phase:"kick",positions:["EDGE","LB"],weight:.4},
 kickCatch:{name:"Kick-catch interference",yards:15,side:"defense",phase:"kick",positions:["CB","S"],weight:.15},
 illegalSubstitution:{name:"Illegal substitution",yards:5,side:"either",phase:"pre",positions:["LB","WR","OL"],weight:.5},
 taunting:{name:"Taunting",yards:15,side:"either",phase:"live",positions:["WR","CB","S","EDGE"],weight:.5},
 unsportsmanlike:{name:"Unsportsmanlike conduct",yards:15,side:"either",phase:"live",positions:["QB","WR","CB","LB"],weight:.5},
 horseCollar:{name:"Horse-collar tackle",yards:15,side:"defense",phase:"live",autoFirst:true,positions:["LB","S","CB"],weight:.6},
 tripping:{name:"Tripping",yards:15,side:"either",phase:"live",positions:["OL","LB"],weight:.2},
 lowBlock:{name:"Illegal low block",yards:15,side:"offense",phase:"live",positions:["OL","TE"],weight:.3}
};
function wffPenaltyGroup(p){return dnaGroup(p.position)}
function wffPenaltyDiscipline(p){return Math.max(25,Math.min(99,Number(p.mentality?.discipline??p.ratings?.awareness??70)))}
function wffTeamDiscipline(l,side){
 if(side===0){const roster=l.state.roster||[];return roster.length?roster.reduce((n,p)=>n+wffPenaltyDiscipline(p),0)/roster.length:70}
 const roster=wffPenaltyRoster(l,side);return roster.reduce((n,p)=>n+wffPenaltyDiscipline(p),0)/(roster.length||1);
}
function wffPenaltyRoster(l,side){return side===0?(l.state.roster||[]):(l.opponentPenaltyRoster||(l.opponentPenaltyRoster=makeRoster(l.opp.id).map((p,i)=>dnaBuild(p,l.opp.id,i,false))))}
function wffPenaltyPlayer(l,side,rule){
 const roster=wffPenaltyRoster(l,side),eligible=roster.filter(p=>rule.positions.includes(wffPenaltyGroup(p)));
 if(!eligible.length)return {name:side===0?"Unknown player":"CPU defender",position:""};
 const weights=eligible.map(p=>Math.max(.12,(105-wffPenaltyDiscipline(p))/30));
 const total=weights.reduce((a,b)=>a+b,0);let pick=l.r()*total;
 for(let i=0;i<eligible.length;i++){pick-=weights[i];if(pick<=0)return eligible[i]}
 return eligible.at(-1);
}
function wffPenaltyRoll(l,offenseSide,pass,phase){
 // Target roughly 12-13 accepted penalties per game across both clubs, modulated
 // by discipline. Pre-snap checks are exclusive with live-ball checks.
 const base=phase==="pre"?.013:phase==="kick"?.012:.034;
 const potential=[offenseSide,1-offenseSide].map(side=>{
  const discipline=wffTeamDiscipline(l,side);
  const multiplier=Math.max(.65,Math.min(1.55,1+(72-discipline)*.022));
  return {side,prob:base*multiplier};
 });
 const total=potential.reduce((a,b)=>a+b.prob,0);
 if(l.r()>=total)return null;
 let x=l.r()*total,side=offenseSide;
 for(const p of potential){x-=p.prob;if(x<=0){side=p.side;break}}
 const defending=side!==offenseSide;
 const choices=Object.entries(WFF_PENALTIES).filter(([key,rule])=>{
  if(rule.phase!==phase&&!(phase==="live"&&rule.phase==="pass"&&pass))return false;
  if(rule.side==="offense"&&defending||rule.side==="defense"&&!defending)return false;
  if(phase==="live"&&rule.phase==="pass"&&!pass)return false;
  return true;
 });
 if(!choices.length)return null;
 const sum=choices.reduce((n,[,r])=>n+r.weight,0);let roll=l.r()*sum;
 let selected=choices.at(-1);
 for(const option of choices){roll-=option[1].weight;if(roll<=0){selected=option;break}}
 const [key,rule]=selected,player=wffPenaltyPlayer(l,side,rule);
 return {key,rule,side,player:player.name,position:player.position||"",yards:rule.yards,offenseSide};
}
function wffPenaltyApply(l,penalty,original={down:l.down,toGo:l.toGo,field:l.field}){
 const p=penalty,againstOffense=p.side===p.offenseSide;
 const distance=p.rule.spot?Math.max(p.yards,Math.min(30,original.toGo+7)):p.yards;
 const moved=againstOffense?-distance:distance;
 l.field=Math.max(1,Math.min(99,original.field+moved));
 if(againstOffense){
  l.down=Math.min(4,original.down+(p.rule.lossDown?1:0));
  l.toGo=Math.max(1,original.toGo+(original.field-l.field));
 }else{
  if(p.rule.autoFirst||distance>=original.toGo){l.down=1;l.toGo=Math.min(10,100-l.field)}
  else{l.down=original.down;l.toGo=Math.max(1,original.toGo-distance)}
 }
 const st=l.stats[p.side];st.penalties=(st.penalties||0)+1;st.penaltyYards=(st.penaltyYards||0)+Math.abs(l.field-original.field);
 l.penaltyLog=l.penaltyLog||[];l.penaltyLog.push({team:p.side,player:p.player,position:p.position,penalty:p.rule.name,yards:Math.abs(l.field-original.field),quarter:l.clock.quarter,clock:wffClockTime(l.clock.remaining)});
 return "Penalty on "+(p.side===0?l.us.city:l.opp.city)+": "+p.rule.name+" — "+p.player+" ("+p.position+"), "+p.yards+" yards"+(p.rule.autoFirst&&!againstOffense?", automatic first down":"")+".";
}
function wffPenaltySummary(l){
 return '<section class="panel"><h2>Penalties</h2><div class="grid">'+l.stats.map((s,i)=>'<div class="stat"><strong>'+esc(i===0?l.us.city:l.opp.city)+'</strong><p>'+(s.penalties||0)+' penalties • '+(s.penaltyYards||0)+' yards</p></div>').join("")+'</div>'+(l.penaltyLog||[]).slice(-8).reverse().map(p=>'<div class="line"><span>'+esc(p.player)+' — '+esc(p.penalty)+'</span><strong>'+p.yards+' yd</strong></div>').join("")+'</section>';
}
