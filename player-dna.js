"use strict";
// WFF Alpha 0.2: deterministic fictional player DNA. Ratings are illustrative,
// not calibrated to real-world performance or to the exhibition game engine.
const DNA_PROFILES={
QB:[72,78,195,245,["Pocket Passer","Field General","Improviser","Dual Threat"],["throwPower","shortAccuracy","mediumAccuracy","deepAccuracy","throwOnRun","pocketPresence"]],
HB:[67,74,185,240,["Power Back","Elusive Back","Receiving Back","One-Cut Runner"],["carrying","vision","breakTackle","elusiveness","catching","passProtection"]],
FB:[70,75,225,270,["Lead Blocker","Power Fullback","Versatile Fullback"],["leadBlock","runBlock","impactBlock","carrying","catching"]],
WR:[68,77,170,235,["Deep Threat","Route Technician","Possession Receiver","Slot Specialist"],["catching","shortRoute","mediumRoute","deepRoute","release","catchInTraffic"]],
TE:[74,79,235,280,["Blocking Tight End","Receiving Tight End","Vertical Threat","Complete Tight End"],["catching","shortRoute","mediumRoute","runBlock","passBlock","catchInTraffic"]],
OL:[74,81,285,365,["Power Blocker","Pass Protector","Agile Blocker","Balanced Lineman"],["runBlock","passBlock","runBlockPower","passBlockPower","runBlockFinesse","passBlockFinesse","impactBlock"]],
EDGE:[73,79,235,295,["Speed Rusher","Power Rusher","Run Defender","Versatile Edge"],["powerMoves","finesseMoves","blockShedding","tackling","pursuit","contain"]],
DT:[72,78,275,365,["Nose Tackle","Gap Penetrator","Power Rusher","Run Stopper"],["powerMoves","finesseMoves","blockShedding","tackling","pursuit","anchor"]],
LB:[71,77,215,265,["Field General","Run Stopper","Coverage Linebacker","Blitzer"],["tackling","blockShedding","pursuit","zoneCoverage","manCoverage","playRecognition"]],
CB:[68,76,175,220,["Man Cover","Zone Cover","Press Corner","Ball Hawk"],["manCoverage","zoneCoverage","press","playRecognition","catching","tackling"]],
S:[70,77,190,235,["Deep Safety","Box Safety","Hybrid Safety","Ball Hawk"],["zoneCoverage","manCoverage","tackling","pursuit","playRecognition","hitPower"]],
K:[69,77,175,235,["Power Kicker","Accurate Kicker"],["kickPower","kickAccuracy"]],
P:[69,77,175,235,["Directional Punter","Power Punter"],["kickPower","kickAccuracy"]]
};
const DNA_COMMON=["speed","acceleration","agility","strength","stamina","awareness","injuryResistance"];
const DNA_MENTAL=["confidence","resilience","discipline","adaptability","aggressiveness","composure","workEthic","competitiveDrive"];
const DNA_TECHNIQUES={
QB:["Pocket Reset","Touch Pass","Quick Release"],HB:["Stiff Arm","Cutback","Pass Protection Pickup"],FB:["Lead Through","Short-Yardage Finish"],WR:["Release Specialist","Sideline Awareness","Contested Catch"],TE:["Seam Finder","Inline Anchor"],OL:["Power Anchor","Pulling Block","Recovery Step"],EDGE:["Swim Move","Bull Rush","Rip Move","Counter Spin"],DT:["Bull Rush","Club Move","Gap Anchor"],LB:["Block Deconstruction","Route Recognition","Blitz Timing"],CB:["Press Jam","Route Jump","Recovery Turn"],S:["Range Read","Secure Angle","Ball Tracking"],K:["Pressure Routine"],P:["Directional Control"]
};
function dnaGroup(pos){if(["LT","LG","C","RG","RT","OL"].includes(pos))return "OL";if(["MLB","OLB","ILB","SAM","WILL"].includes(pos))return "LB";if(["FS","SS","DB"].includes(pos))return "S";if(pos==="DL")return "DT";return DNA_PROFILES[pos]?pos:"LB"}
function dnaHash(str){let h=2166136261;for(const c of String(str)){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0}
function dnaRandom(seed){let x=seed>>>0;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}}
function dnaClamp(v,a=35,b=99){return Math.max(a,Math.min(b,Math.round(v)))}
function dnaArchetype(group,ratings,height,weight){
const a=ratings,score={};
if(group==="QB"){score["Pocket Passer"]=a.pocketPresence*1.2+a.mediumAccuracy+a.shortAccuracy;score["Field General"]=a.awareness*1.3+a.pocketPresence+a.shortAccuracy;score["Improviser"]=a.throwOnRun*1.2+a.agility+a.acceleration;score["Dual Threat"]=a.speed*1.4+a.acceleration*1.1+a.throwOnRun;if(a.speed<78||a.acceleration<77||a.agility<72||(height>=77&&weight<=210))score["Dual Threat"]=-1e3}
if(group==="HB"){score["Power Back"]=a.strength*1.4+a.breakTackle*1.3+(weight-195)*.7;score["Elusive Back"]=a.elusiveness*1.5+a.agility+a.acceleration;score["Receiving Back"]=a.catching*1.6+a.elusiveness+a.passProtection;score["One-Cut Runner"]=a.vision*1.5+a.acceleration+a.carrying}
if(group==="FB"){score["Lead Blocker"]=a.leadBlock*1.5+a.impactBlock+a.strength;score["Power Fullback"]=a.carrying+a.strength*1.4+a.impactBlock;score["Versatile Fullback"]=a.catching+a.runBlock+a.carrying}
if(group==="WR"){score["Deep Threat"]=a.speed*1.4+a.acceleration+a.deepRoute;score["Route Technician"]=a.shortRoute+a.mediumRoute+a.release;score["Possession Receiver"]=a.catching+a.catchInTraffic+a.strength;score["Slot Specialist"]=a.agility+a.shortRoute+a.release}
if(group==="TE"){score["Blocking Tight End"]=a.runBlock+a.passBlock+a.strength;score["Receiving Tight End"]=a.catching+a.shortRoute+a.catchInTraffic;score["Vertical Threat"]=a.speed+a.mediumRoute+a.catching;score["Complete Tight End"]=a.runBlock+a.catching+a.mediumRoute}
if(group==="OL"){score["Power Blocker"]=a.runBlockPower+a.passBlockPower+a.strength;score["Pass Protector"]=a.passBlock*1.4+a.passBlockFinesse+a.awareness;score["Agile Blocker"]=a.runBlockFinesse+a.agility+a.acceleration;score["Balanced Lineman"]=a.runBlock+a.passBlock+a.awareness}
if(group==="EDGE"){score["Speed Rusher"]=a.finesseMoves+a.speed+a.acceleration;score["Power Rusher"]=a.powerMoves+a.strength+a.blockShedding;score["Run Defender"]=a.blockShedding+a.tackling+a.contain;score["Versatile Edge"]=a.powerMoves+a.finesseMoves+a.pursuit}
if(group==="DT"){score["Nose Tackle"]=a.anchor+a.strength+a.blockShedding+(weight-290)*.4;score["Gap Penetrator"]=a.finesseMoves+a.acceleration+a.pursuit;score["Power Rusher"]=a.powerMoves+a.strength+a.blockShedding;score["Run Stopper"]=a.tackling+a.blockShedding+a.anchor}
if(group==="LB"){score["Field General"]=a.playRecognition+a.awareness+a.tackling;score["Run Stopper"]=a.blockShedding+a.tackling+a.pursuit;score["Coverage Linebacker"]=a.zoneCoverage+a.manCoverage+a.speed;score["Blitzer"]=a.acceleration+a.pursuit+a.blockShedding}
if(group==="CB"){score["Man Cover"]=a.manCoverage+a.press+a.agility;score["Zone Cover"]=a.zoneCoverage+a.playRecognition+a.awareness;score["Press Corner"]=a.press+a.strength+a.manCoverage;score["Ball Hawk"]=a.catching+a.zoneCoverage+a.playRecognition}
if(group==="S"){score["Deep Safety"]=a.zoneCoverage+a.speed+a.playRecognition;score["Box Safety"]=a.tackling+a.hitPower+a.strength;score["Hybrid Safety"]=a.manCoverage+a.zoneCoverage+a.tackling;score["Ball Hawk"]=a.catching+a.zoneCoverage+a.playRecognition}
if(group==="K"||group==="P"){score[group==="K"?"Power Kicker":"Power Punter"]=a.kickPower*2+a.strength;score[group==="K"?"Accurate Kicker":"Directional Punter"]=a.kickAccuracy*2+a.awareness}
return Object.entries(score).sort((x,y)=>y[1]-x[1])[0][0];
}
function dnaBuild(player,teamId,index,practice=false){
const group=dnaGroup(player.position),p=DNA_PROFILES[group],r=dnaRandom(dnaHash([teamId,index,player.name,player.position,practice?"PS":"ACTIVE"].join("|")));
const height=p[0]+Math.floor(r()*(p[1]-p[0]+1));
const weight=p[2]+Math.floor(r()*(p[3]-p[2]+1));

const base=practice?60+Math.floor(r()*14):67+Math.floor(r()*23);
const ratings={};for(const key of [...DNA_COMMON,...p[5],"playRecognition","tackling","catching"]){if(ratings[key]!==undefined)continue;ratings[key]=dnaClamp(base+(r()-.5)*27)}
// Physical profiles create meaningful differences, without asserting a validated physics model.
ratings.strength=dnaClamp(base+(weight-220)/10+(r()-.5)*13);
ratings.speed=dnaClamp(base-(weight-200)/12+(r()-.5)*17);
ratings.acceleration=dnaClamp(ratings.speed+(r()-.5)*14);
ratings.agility=dnaClamp(ratings.speed+(r()-.5)*15);
// A minority of quarterbacks are genuine runners; speed must support that label.
if(group==="QB"){const runner=r()<.22;ratings.speed=dnaClamp((runner?78:61)+r()* (runner?17:18));ratings.acceleration=dnaClamp(ratings.speed-4+r()*10);ratings.agility=dnaClamp(ratings.speed-6+r()*11);if(height>=77&&weight<=210){ratings.speed=Math.min(ratings.speed,82);ratings.acceleration=Math.min(ratings.acceleration,82)}}
// Compact backs may be powerful, but larger backs tend to have a strength advantage.
if(group==="HB"){ratings.strength=dnaClamp(60+(weight-185)*.43+(r()-.5)*17);ratings.breakTackle=dnaClamp(base+(weight-205)*.25+(r()-.5)*21)}

ratings.stamina=dnaClamp(66+r()*30);
ratings.injuryResistance=dnaClamp(60+r()*36);
const archetype=dnaArchetype(group,ratings,height,weight);
const mentality={};for(const key of DNA_MENTAL)mentality[key]=dnaClamp(40+r()*58);
const behavior=[];
if(mentality.resilience<54&&mentality.composure<65)behavior.push("Fragile");
if(mentality.competitiveDrive>78&&mentality.adaptability<55)behavior.push("Bull-Headed");
if(mentality.resilience>80&&mentality.composure>75)behavior.push("Short Memory");
if(mentality.aggressiveness>82&&mentality.discipline<60)behavior.push("Hothead");
if(mentality.adaptability>80&&mentality.discipline>68)behavior.push("Adaptive");
if(mentality.composure>82&&mentality.discipline>75)behavior.push("Steady Hand");
const tech=DNA_TECHNIQUES[group],technique=tech[Math.floor(r()*tech.length)];
const skillKeys=p[5],overall=dnaClamp(skillKeys.reduce((sum,k)=>sum+ratings[k],0)/skillKeys.length*.78+ratings.awareness*.12+ratings.stamina*.10,45,99);
return {...player,overall,height,weight,build:weight>(p[2]+(p[3]-p[2])*.67)?"Heavyset":weight<(p[2]+(p[3]-p[2])*.33)?"Lean":"Athletic",archetype,ratings,mentality,behavior,techniques:[{name:technique,status:ratings[skillKeys[0]]>=80?"Developing":"Potential"}],dnaVersion:2};
}
function dnaFormatHeight(inches){return Math.floor(inches/12)+"'"+inches%12+'"'}
function dnaLabel(key){return key.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase())}
function dnaEnsure(state){let changed=false;for(const [key,ps] of [["roster",false],["practiceSquad",true]]){if(!Array.isArray(state[key]))continue;state[key]=state[key].map((p,i)=>{if(p.dnaVersion===2&&p.ratings&&p.mentality)return p;changed=true;return dnaBuild(p,state.teamId,i,ps)})}return changed}
function dnaPlayerCard(p,i,ps){const rid=(ps?"ps":"a")+i;return '<details class="player"><summary><span><strong>'+esc(p.position)+'</strong> '+esc(p.name)+' <small>'+esc(p.archetype)+' • '+dnaFormatHeight(p.height)+' • '+p.weight+' lb</small></span><strong>'+p.overall+' OVR</strong></summary><div class="player-info"><p>Age '+p.age+' • '+esc(p.build)+' build • '+esc(p.archetype)+'</p><h3>Football & physical ratings</h3><div class="dna-grid">'+Object.entries(p.ratings).map(([k,v])=>'<div><span>'+dnaLabel(k)+'</span><b>'+v+'</b></div>').join("")+'</div><h3>Mentality (scouting estimate)</h3><div class="dna-grid">'+Object.entries(p.mentality).map(([k,v])=>'<div><span>'+dnaLabel(k)+'</span><b>'+v+'</b></div>').join("")+'</div><p><strong>Observed tendencies:</strong> '+(p.behavior.length?p.behavior.map(esc).join(", "):"No prominent tendencies identified")+'</p><p><strong>Technique:</strong> '+p.techniques.map(t=>esc(t.name)+' ('+esc(t.status)+')').join(", ")+'</p><p class="muted">Ratings and tendencies are generated prototypes. Scouting uncertainty, trait unlocks, and on-field effects are not yet implemented.</p></div></details>'}
