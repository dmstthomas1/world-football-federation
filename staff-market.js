"use strict";
// Staff market: offseason-only transactions; owner is never a staff position.
const WFF_STAFF_FIRST=["Avery","Marcus","Darius","Caleb","Julian","Andre","Thomas","Victor","Elijah","Nolan","Isaiah","Adrian"];
const WFF_STAFF_LAST=["Carter","Hayes","Bennett","Reed","Walker","Morales","Cole","Santos","Morgan","Price","Turner","Fischer"];
const WFF_STAFF_STYLES={
 gm:["Draft Builder","Contract Strategist","Trade Specialist","Analytics Evaluator"],
 hc:["Conservative Strategist","Balanced Leader","Aggressive Playcaller","Development Mentor"],
 oc:["West Coast Passing","Power Running","Vertical Passing","Spread Offense","Balanced Multiple","Wide Zone"],
 dc:["4-3 Run Defense","3-4 Pressure","Coverage Specialist","Aggressive Blitz","Balanced Defense"],
 trainer:["Injury Prevention","Rehabilitation","Conditioning","Recovery"],
 scout:["Quarterback Evaluation","Offensive Line","Defensive Front","Secondary","Best Player Available"]
};
const WFF_STAFF_ABILITIES={
 gm:["Contract Value","Draft Board Discipline","Trade Evaluation"],hc:["Situational Football","Clock Management","Player Development"],
 oc:["Short Passing","Run Blocking","Deep Passing","Quarterback Development"],
 dc:["Run Fits","Coverage Communication","Pass Rush Design"],
 trainer:["Recovery Planning","Fatigue Management","Injury Prevention"],scout:["Regional Scouting","Prospect Evaluation","Hidden Talent"]
};
function wffStaffCandidate(teamId,year,key,index){
 const r=dnaRandom(dnaHash(["staff-market",teamId,year,key,index].join("|")));
 const style=WFF_STAFF_STYLES[key][Math.floor(r()*WFF_STAFF_STYLES[key].length)];
 const abilities=WFF_STAFF_ABILITIES[key];
 const skill={leadership:50+Math.floor(r()*46),development:50+Math.floor(r()*46),evaluation:50+Math.floor(r()*46)};
 return {id:key+"-"+year+"-"+index,name:WFF_STAFF_FIRST[Math.floor(r()*WFF_STAFF_FIRST.length)]+" "+WFF_STAFF_LAST[Math.floor(r()*WFF_STAFF_LAST.length)],role:WFF_STAFF_ROLES.find(x=>x[0]===key)[1],age:32+Math.floor(r()*31),specialty:style,style,abilities:[abilities[Math.floor(r()*abilities.length)]],...skill,contractYears:2+Math.floor(r()*4),annualSalary:Math.round((.6+r()*2.7+(key==="hc"||key==="gm"?1.2:0))*100)/100};
}
function wffStaffFit(state,key,person){
 const style=person.style||person.specialty||"";
 const offense=state.offense||"Balanced Multiple",front=state.front||"4-3";
 if(key==="oc")return style.includes("West Coast")&&offense==="West Coast"||style.includes("Power")&&offense==="Power Run"||style.includes("Vertical")&&offense==="Vertical Passing"||style.includes("Spread")&&offense==="Spread"||style.includes("Wide Zone")&&offense==="Wide Zone"||style.includes("Balanced")&&offense==="Balanced Multiple"?95:style.includes("Balanced")?75:55;
 if(key==="dc")return style.includes(front)?95:style.includes("Balanced")?75:55;
 return 70;
}
function wffStaffMarketInit(state){
 if(state.staffMarket)return false;
 state.staffMarket={phase:"season",year:state.finance?.year||2026,available:{},history:[]};return true;
}
function wffStaffOffseason(state){return state.staffMarket?.phase==="offseason"}
function wffStaffBeginOffseason(state){
 wffStaffMarketInit(state);
 if(state.week<19||wffStaffOffseason(state))return false;
 const m=state.staffMarket;m.phase="offseason";m.year=state.finance?.year||2026;m.available={};
 for(const [key] of WFF_STAFF_ROLES)m.available[key]=Array.from({length:6},(_,i)=>wffStaffCandidate(state.teamId,m.year,key,i));
 m.history.unshift("Entered "+m.year+" offseason; staff market opened.");return true;
}
function wffStaffFire(state,key){
 if(!wffStaffOffseason(state)||!WFF_STAFF_STYLES[key]||!state.staff[key])return false;
 const old=state.staff[key];state.staff[key]=null;
 state.staffMarket.history.unshift("Released "+old.name+" ("+old.role+").");
 return true;
}
function wffStaffHire(state,key,id){
 if(!wffStaffOffseason(state)||!WFF_STAFF_STYLES[key])return false;
 const pool=state.staffMarket.available[key]||[];const index=pool.findIndex(p=>p.id===id);
 if(index<0)return false;
 const hire=pool.splice(index,1)[0],previous=state.staff[key];
 state.staff[key]={...hire,tendencies:key==="hc"?wffCoachProfile(state.teamId+"|"+hire.id):undefined};
 state.staffMarket.history.unshift("Hired "+hire.name+" as "+hire.role+(previous?" replacing "+previous.name:"")+".");
 return true;
}
function wffStaffNextSeason(state){
 if(!wffStaffOffseason(state))return false;
 const vacant=WFF_STAFF_ROLES.filter(([key])=>!state.staff[key]);if(vacant.length)return false;
 state.finance.year++;state.week=1;state.wins=0;state.losses=0;state.staffMarket.phase="season";state.staffMarket.available={};state.staffMarket.history.unshift("Started "+state.finance.year+" season with full staff.");
 return true;
}
function wffStaffMarketView(state){
 wffStaffMarketInit(state);const m=state.staffMarket,off=wffStaffOffseason(state);
 let html='<section class="panel"><h2>Coaching Staff & Front Office</h2><p class="muted">Owner '+esc(state.owner.name)+' cannot be fired. Staff transactions are available only during the offseason. Coaching styles are used to assess team philosophy fit; most ability effects remain prototypes.</p><p><strong>Phase:</strong> '+(off?"Offseason staff market": "Regular season")+' • '+(state.finance?.year||2026)+'</p>';
 if(!off&&state.week>=19)html+='<button class="btn" id="staff-offseason">Enter Offseason & Open Staff Market</button>';
 if(!off&&state.week<19)html+='<p class="notice">Offseason personnel changes unlock after Week 18. Current week: '+state.week+'.</p>';
 html+='</section>';
 for(const [key,role] of WFF_STAFF_ROLES){
 const p=state.staff[key];html+='<section class="panel"><h3>'+esc(role)+'</h3>';
 if(p)html+='<div class="line"><div><strong>'+esc(p.name)+'</strong><br><small>'+esc(p.style||p.specialty)+' • Leadership '+p.leadership+' • Development '+p.development+' • Evaluation '+p.evaluation+'</small><br><small>Philosophy fit: '+wffStaffFit(state,key,p)+'/100 • Abilities: '+esc((p.abilities||["Specialty focus"]).join(", "))+'</small></div>'+(off?'<button class="btn secondary" data-staff-fire="'+key+'">Fire</button>':"")+'</div>';
 else html+='<p class="notice">Vacant — hire a replacement before beginning the next season.</p>';
 if(off){html+='<details><summary>View available candidates</summary>';
 for(const candidate of m.available[key]||[])html+='<div class="line"><div><strong>'+esc(candidate.name)+'</strong> • '+esc(candidate.style)+'<br><small>Fit '+wffStaffFit(state,key,candidate)+'/100 • Leadership '+candidate.leadership+' • Development '+candidate.development+' • Evaluation '+candidate.evaluation+'</small><br><small>Ability: '+esc(candidate.abilities.join(", "))+' • '+candidate.contractYears+' years • $'+candidate.annualSalary.toFixed(2)+'M/year</small></div><button class="btn" data-staff-hire="'+key+'" data-candidate="'+candidate.id+'">Hire</button></div>';
 html+='</details>'}
 html+='</section>';
 }
 if(off)html+='<section class="panel"><h3>Finish Offseason</h3><p class="muted">Begin the next season after filling every staff vacancy. This prototype resets the exhibition record and advances the year; it is not yet a complete league offseason.</p><button class="btn" id="staff-next" '+(WFF_STAFF_ROLES.some(([key])=>!state.staff[key])?"disabled":"")+'>Begin Next Season</button></section>';
 html+='<section class="panel"><h3>Staff Transaction History</h3>'+m.history.slice(0,12).map(x=>'<p>'+esc(x)+'</p>').join("")+'</section>';
 return html;
}
function wffStaffMarketBind(state,redraw){
 const bind=(selector,handler)=>document.querySelectorAll(selector).forEach(el=>el.onclick=()=>{if(handler(el)){save();redraw()}});
 bind("#staff-offseason",()=>wffStaffBeginOffseason(state));
 bind("[data-staff-fire]",el=>confirm("Fire this staff member?")&&wffStaffFire(state,el.dataset.staffFire));
 bind("[data-staff-hire]",el=>confirm("Hire this candidate? Existing staff in this role will be replaced.")&&wffStaffHire(state,el.dataset.staffHire,el.dataset.candidate));
 bind("#staff-next",()=>wffStaffNextSeason(state));
}
