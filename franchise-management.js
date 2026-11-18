"use strict";
// WFF management prototype. Financial values are USD millions, not official NFL rules.
const WFF_CAP_START=301.2; // Official 2026 NFL base cap; WFF teams have fictional adjusted caps.
const WFF_DEPTH_POS=["QB","HB","FB","WR","TE","LT","LG","C","RG","RT","EDGE","DT","MLB","OLB","CB","FS","SS","K","P"];
const WFF_STAFF_ROLES=[
["gm","General Manager",["Contract Architect","Talent Evaluator","Trade Negotiator","Roster Builder"]],
["hc","Head Coach",["Leadership","Game Management","Player Development","Culture Builder"]],
["oc","Offensive Coordinator",["Quarterback Development","Power Running","West Coast Passing","Vertical Passing"]],
["dc","Defensive Coordinator",["Pass Rush","Coverage Design","Run Defense","Blitz Packages"]],
["trainer","Head Athletic Trainer",["Rehabilitation","Conditioning","Injury Prevention","Recovery"]],
["scout","Director of Scouting",["Quarterbacks","Offensive Line","Defensive Front","Secondary"]]
];
function wffRandom(team,tag){return dnaRandom(dnaHash(team+"|"+tag))}
function wffStaff(team){const r=wffRandom(team,"staff");const first=["Daniel","Michael","Andre","Victor","Thomas","Elias","Marcus","David","Adrian","Samuel"];const last=["Hayes","Reed","Morgan","Bennett","Ward","Santos","Fischer","Cole","Walker","Turner"];return Object.fromEntries(WFF_STAFF_ROLES.map(([key,role,specialties])=>[key,{name:first[Math.floor(r()*first.length)]+" "+last[Math.floor(r()*last.length)],role,age:33+Math.floor(r()*30),specialty:specialties[Math.floor(r()*specialties.length)],leadership:55+Math.floor(r()*40),development:55+Math.floor(r()*40),evaluation:55+Math.floor(r()*40)}]))}
function wffContract(player,team,i,ps){const r=wffRandom(team,player.name+"|"+i+"|contract");const o=player.overall;const annual=ps?.24:Math.max(1.05,Math.round((1.1+Math.pow(Math.max(0,o-58)/28,2)*15+r()*1.8)*100)/100);const years=ps?1:1+Math.floor(r()*4);const bonus=ps?0:Math.round(annual*years*(.08+r()*.30)*100)/100;const guarantee=ps?0:Math.round((bonus+annual*(.05+r()*.6))*100)/100;return {annual,years,bonus,guarantee,remainingBonus:bonus,capHit:Math.round((annual+bonus/years)*100)/100,personality:["Flexible","Team Loyal","Market Driven","Security First","Demanding"][Math.floor(r()*5)],status:ps?"Practice Squad":"Active"}}
function wffInit(state){let changed=false;if(!state.staff){state.staff=wffStaff(state.teamId);changed=true}if(!state.owner){state.owner=wffOwner(state.teamId);changed=true}if(!state.frontOffice){state.frontOffice={messages:[],lastMessageWeek:0};changed=true}if(!state.staff.gm){state.staff.gm=wffStaff(state.teamId).gm;changed=true}if(!state.finance){state.finance={cap:WFF_CAP_START,year:2026,deadMoney:0,history:[]};changed=true}for(const [key,ps] of [["roster",false],["practiceSquad",true]])for(let i=0;i<state[key].length;i++){const p=state[key][i];if(!p.contract){p.contract=wffContract(p,state.teamId,i,ps);changed=true}if(!p.health){p.health={status:"Healthy",weeksOut:0,fatigue:0};changed=true}}
if(!state.finance.economyVersion){wffCalibrateEconomy(state);changed=true}
if(!state.depth||!state.depth.QB){state.depth=wffAutoDepth(state);changed=true}return changed}
function wffEligible(p,pos){const group=dnaGroup(p.position),target=dnaGroup(pos);return p.position===pos||group===target&&(group==="OL"||group==="LB"||group==="S"||group==="EDGE"||group==="DT"||group==="CB"||group==="WR"||group==="HB"||group==="TE")}
function wffDepthScore(p,pos){let score=p.overall+(p.position===pos?8:0);if(p.health.status==="Out")score-=100;score-=p.health.fatigue*.12;return score}
function wffAutoDepth(state){const depth={};for(const pos of WFF_DEPTH_POS){depth[pos]=state.roster.map((p,i)=>({p,i})).filter(({p})=>wffEligible(p,pos)).sort((a,b)=>wffDepthScore(b.p,pos)-wffDepthScore(a.p,pos)).map(x=>x.i)}return depth}

// Every franchise starts with distinct, reproducible cap room and liabilities.
// These are fictional WFF opening books, not actual NFL team contract data.
function wffCalibrateEconomy(state){
const r=wffRandom(state.teamId,"economy-v2");
const finance=state.finance;
finance.cap=WFF_CAP_START;
finance.carryover=Math.round(r()*24*100)/100;
finance.adjustments=Math.round((r()-.5)*6*100)/100;
finance.deadMoney=Math.round((3+r()*35)*100)/100;
finance.adjustedCap=Math.round((finance.cap+finance.carryover+finance.adjustments)*100)/100;
const desiredRoom=Math.round((4+r()*62)*100)/100;
const desiredPlayerCap=finance.adjustedCap-finance.deadMoney-desiredRoom;
const psCap=state.practiceSquad.reduce((sum,p)=>sum+p.contract.capHit,0);
const active=state.roster;
const current=active.reduce((sum,p)=>sum+p.contract.capHit,0);
const factor=Math.max(.3,(desiredPlayerCap-psCap)/Math.max(1,current));
for(const p of active){
const c=p.contract;
const salary=Math.max(1.05,c.annual*factor);
const bonus=c.bonus*factor;
const guaranteed=Math.min(salary*c.years+bonus,c.guarantee*factor);
c.annual=Math.round(salary*100)/100;
c.bonus=Math.round(bonus*100)/100;
c.guarantee=Math.round(guaranteed*100)/100;
c.remainingBonus=c.bonus;
c.capHit=Math.round((c.annual+c.bonus/Math.min(5,c.years))*100)/100;
}
finance.economyVersion=2;
finance.openingCapRoomTarget=desiredRoom;
}
function wffCapUsed(state){return state.roster.reduce((a,p)=>a+(p.contract?.capHit||0),0)+state.practiceSquad.reduce((a,p)=>a+(p.contract?.capHit||0),0)+(state.finance?.deadMoney||0)}
function wffMoney(n){return "$"+Number(n).toFixed(2)+"M"}
function wffDepthView(state){return '<section class="panel"><div class="row"><div><h2>Depth Chart</h2><p class="muted">Set starter, second string and third string individually. Automatic recommendations consider position fit, ratings, health and fatigue.</p></div><button class="btn secondary" id="auto-depth">Auto Set Depth Chart</button></div>'+WFF_DEPTH_POS.map(pos=>{const available=state.roster.map((p,i)=>({p,i})).filter(({p})=>wffEligible(p,pos));const order=state.depth[pos]||[];return '<div class="line" style="align-items:center"><strong>'+pos+'</strong><div class="toolbar" style="margin:0">'+[0,1,2].map(rank=>'<label style="font-size:12px;color:var(--muted)">'+["Starter","2nd","3rd"][rank]+'<br><select data-depth="'+pos+'" data-rank="'+rank+'" aria-label="'+pos+' '+["starter","second string","third string"][rank]+'"><option value="">Unassigned</option>'+available.map(({p,i})=>'<option value="'+i+'" '+(order[rank]===i?'selected':'')+'>'+esc(p.name)+' ('+p.overall+')'+(p.health.status!=="Healthy"?" — "+esc(p.health.status):"")+'</option>').join("")+'</select></label>').join("")+'</div></div>'}).join("")+'</section><section class="panel"><h2>Practice Squad</h2><p class="muted">Six developmental players; promotion and release controls are planned.</p>'+state.practiceSquad.map(p=>'<div class="line"><span>'+esc(p.position)+' '+esc(p.name)+'</span><strong>'+p.overall+' OVR</strong></div>').join("")+'</section>'}
function wffDepthBind(state,redraw){document.getElementById("auto-depth").onclick=()=>{if(!confirm("Replace all manual depth assignments with automatic recommendations?"))return;state.depth=wffAutoDepth(state);save();redraw()};document.querySelectorAll("[data-depth]").forEach(node=>node.onchange=()=>{const pos=node.dataset.depth,rank=Number(node.dataset.rank),idx=node.value===""?null:Number(node.value);const order=[...(state.depth[pos]||[])];if(idx===null){order.splice(rank,1)}else{const old=order.indexOf(idx);if(old>=0)order.splice(old,1);order.splice(rank,0,idx)}state.depth[pos]=order;save();redraw()})}
function wffStaffView(state){return '<section class="panel"><h2>Coaching & Football Operations</h2><p class="muted">Fictional staff profiles. Hiring, firing and staff impact on gameplay are future systems.</p>'+WFF_STAFF_ROLES.map(([key])=>{const p=state.staff[key];return '<div class="line"><div><strong>'+esc(p.role)+'</strong><div>'+esc(p.name)+' • Age '+p.age+'</div><small>Specialty: '+esc(p.specialty)+'</small></div><div style="text-align:right"><small>Leadership '+p.leadership+'</small><br><small>Development '+p.development+'</small><br><small>Evaluation '+p.evaluation+'</small></div></div>'}).join("")+'</section>'}
function wffFinanceView(state){const used=wffCapUsed(state),cap=state.finance.adjustedCap||state.finance.cap;return '<section class="panel"><h2>Salary Cap & Contracts</h2><p class="muted">NFL-inspired fictional team contracts in USD millions. 2026 NFL base cap: $301.20M; adjusted WFF team cap includes carryover and adjustments. These are generated WFF contracts, not actual NFL player deals.</p><div class="grid"><div class="stat"><small>Adjusted team cap</small><b>'+wffMoney(cap)+'</b></div><div class="stat"><small>Estimated committed cap</small><b>'+wffMoney(used)+'</b></div><div class="stat"><small>Estimated cap room</small><b>'+wffMoney(cap-used)+'</b></div><div class="stat"><small>Dead money</small><b>'+wffMoney(state.finance.deadMoney)+'</b></div></div><p class="muted">Base cap: '+wffMoney(state.finance.cap)+' • Carryover: '+wffMoney(state.finance.carryover||0)+' • Adjustments: '+wffMoney(state.finance.adjustments||0)+'</p><p class="notice">Existing generated contracts are estimates; guarantees, bonus proration, void years, incentives, restructures, releases and renegotiations are not yet fully modeled.</p></section><section class="panel"><h2>Player Contracts</h2>'+state.roster.map(p=>'<div class="line"><div><strong>'+esc(p.position)+' '+esc(p.name)+'</strong><br><small>'+esc(p.contract.personality)+' negotiator • '+p.contract.years+' yr remaining</small></div><div style="text-align:right"><strong>'+wffMoney(p.contract.annual)+'/yr</strong><br><small>Cap '+wffMoney(p.contract.capHit)+' • Bonus '+wffMoney(p.contract.bonus)+' • Guaranteed '+wffMoney(p.contract.guarantee)+'</small></div></div>').join("")+'</section>'}

const WFF_OWNER_TYPES=[
["Win Now","Demanding",["Expect immediate playoff contention.","Prioritize proven starters over distant potential."]],
["Patient Builder","Patient",["Build a sustainable contender through the draft.","Protect future draft capital and develop young players."]],
["Financial Steward","Budget Conscious",["Avoid long-term financial commitments without clear value.","Keep spending disciplined while maintaining competitiveness."]],
["Prestige Seeker","Ambitious",["Build a recognizable championship-caliber franchise.","Invest in marquee talent when the price is justified."]],
["Hands-Off Investor","Easygoing",["I trust the football department to make its decisions.","Show steady progress without unnecessary risk."]]
];
function wffOwner(team){const r=wffRandom(team,"owner-v1"),first=["Avery","Morgan","Jordan","Cameron","Taylor","Alex","Robin","Drew"],last=["Sterling","Whitmore","Khan","Morales","Bishop","Okafor","Chen","Voss"];const type=WFF_OWNER_TYPES[Math.floor(r()*WFF_OWNER_TYPES.length)];return {name:first[Math.floor(r()*first.length)]+" "+last[Math.floor(r()*last.length)],type:type[0],temperament:type[1],patience:35+Math.floor(r()*61),financialFocus:35+Math.floor(r()*61),competitiveUrgency:35+Math.floor(r()*61),trust:50+Math.floor(r()*36),lastShiftYear:2026}}
function wffOwnerMemo(state){const o=state.owner,goals=WFF_OWNER_TYPES.find(t=>t[0]===o.type)||WFF_OWNER_TYPES[0];return goals[2][0]}
function wffFrontOfficeView(state){const o=state.owner,g=state.staff.gm,h=state.staff.hc;return '<section class="panel"><h2>Ownership & Front Office</h2><p class="muted">Owner expectations and staff specialties are persistent. Relationships and personality changes will evolve with the full season engine.</p><div class="line"><div><strong>Owner: '+esc(o.name)+'</strong><br><small>'+esc(o.type)+' • '+esc(o.temperament)+'</small></div><div><small>Patience '+o.patience+' • Trust '+o.trust+'</small></div></div><div class="line"><div><strong>General Manager: '+esc(g.name)+'</strong><br><small>'+esc(g.specialty)+'</small></div><small>Evaluation '+g.evaluation+' • Leadership '+g.leadership+'</small></div><div class="line"><div><strong>Head Coach: '+esc(h.name)+'</strong><br><small>'+esc(h.specialty)+'</small></div><small>Development '+h.development+'</small></div></section><section class="panel"><h2>Front Office Inbox</h2><div class="notice"><strong>Owner → GM</strong><p>'+esc(wffOwnerMemo(state))+'</p></div><div class="notice"><strong>GM → Head Coach</strong><p>Review the depth chart and prioritize players who fit our roster needs and scheme. Keep the front office informed about major personnel gaps.</p></div><p class="muted">These are initial briefing messages, not an active conversation simulator. Future updates will add occasional meaningful decisions and consequences.</p></section>'}
function wffTradeValue(p){const ageFactor=Math.max(.45,1-Math.max(0,p.age-29)*.055);const contractPenalty=Math.max(0,(p.contract?.annual||0)-Math.max(1,(p.overall-60)*.4))*.65;return Math.max(.1,Math.round((Math.pow(Math.max(0,p.overall-55)/20,2)*ageFactor*(p.age<=25?1.18:1)-contractPenalty)*100)/100)}
function wffTradeGrade(offer,request,teamNeed=1){const offered=offer.reduce((s,p)=>s+wffTradeValue(p),0),requested=request.reduce((s,p)=>s+wffTradeValue(p),0)*teamNeed;const ratio=requested>0?offered/requested:0;return {offered,requested,ratio,acceptable:ratio>=1.12,explanation:ratio>=1.12?"Value clears the preliminary threshold, but opponent needs and cap checks are still required.":"The other franchise would reject this offer on preliminary value."}}
function wffTradeView(state){return '<section class="panel"><h2>Trade Center — Evaluation Preview</h2><p>We will use age, overall ability, contracts, positional demand, draft picks and the other team\'s competitive timeline to evaluate offers.</p><p class="notice">The trade evaluator is an internal prototype. Actual trade proposals, draft-pick ownership, opposing-team rosters, salary-cap validation and acceptance decisions are not yet connected. No trades can be completed from this screen.</p><p class="muted">Trade values are not public ratings in the final game; teams will negotiate according to their own needs and information.</p></section>'}
