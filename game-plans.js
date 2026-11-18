"use strict";
// Persistent team identity; weekly plans are selected once before kickoff.
const WFF_OFF_FOCUS={
 balanced:{name:"Balanced Attack",desc:"Maintain a flexible run/pass mix with no specialization."},
 ground:{name:"Establish the Run",desc:"Commit to rushing volume and physical blocking; less passing variety."},
 quick:{name:"Quick Passing",desc:"Short timing routes to limit pressure; fewer explosive completions."},
 deep:{name:"Attack Downfield",desc:"More vertical routes and explosive opportunities, with greater sack and turnover exposure."},
 protect:{name:"Protect the Quarterback",desc:"More protection and checkdowns, reducing pressure but limiting big plays."},
 tempo:{name:"Up-Tempo Spread",desc:"More shotgun passing and quicker snaps, with fatigue and turnover tradeoffs."},
 playaction:{name:"Play-Action",desc:"Set up intermediate and deep throws off run looks; less effective without a credible run threat."}
};
const WFF_DEF_FOCUS={
 balanced:{name:"Balanced Defense",desc:"No special emphasis; adjust by down, distance and personnel."},
 run:{name:"Stop the Run",desc:"More run fits and heavier fronts. Helps against rushing but can expose play-action and passes."},
 blitz:{name:"Pressure & Blitz",desc:"Send extra rushers for pressure and sacks; greater exposure to quick throws and big plays."},
 coverage:{name:"Protect the Pass",desc:"Favor deeper zone and coverage shells; concede some underneath runs and short throws."},
 man:{name:"Press Man Coverage",desc:"Contest timing routes aggressively; risk explosive plays if coverage loses."},
 contain:{name:"Contain & Spy",desc:"Keep edges disciplined against mobile quarterbacks and option plays; less interior pressure."},
 disguise:{name:"Disguise Coverages",desc:"Mix pre-snap looks to challenge reads; communication errors can create openings."}
};
function wffTeamScheme(state,teamId){
 if(teamId===state.teamId)return {offense:state.offense||"Balanced Multiple",front:state.front||"4-3"};
 const schemes=Object.keys(WFF_SCHEMES),fronts=Object.keys(WFF_DEF_SCHEMES);
 return {offense:schemes[(teamId*7+3)%schemes.length],front:fronts[(teamId*5+1)%fronts.length]};
}
function wffPlanKey(state){return (state.finance?.year||2026)+"|"+state.week}
function wffPlan(state){
 if(!state.weeklyGamePlan||state.weeklyGamePlan.weekKey!==wffPlanKey(state))
  state.weeklyGamePlan={weekKey:wffPlanKey(state),offense:"balanced",defense:"balanced"};
 return state.weeklyGamePlan;
}
function wffOpponentPlan(state,oppId){
 const own=wffTeamScheme(state,oppId),user=wffTeamScheme(state,state.teamId);
 const r=wffRandom(oppId,"gameplan|"+wffPlanKey(state)+"|"+state.teamId);
 const o=/Power Run|Wide Zone/.test(own.offense)?["ground","playaction","balanced"]: /Air Raid|Spread|Run and Shoot|Run and Gun/.test(own.offense)?["quick","deep","tempo","balanced"]:["balanced","protect","playaction","deep"];
 const d=/Power Run|Wide Zone/.test(user.offense)?["run","balanced","blitz"]: /Air Raid|Spread|Run and Shoot|Run and Gun|Vertical/.test(user.offense)?["coverage","man","blitz","balanced"]:["balanced","run","coverage","disguise"];
 return {offense:o[Math.floor(r()*o.length)],defense:d[Math.floor(r()*d.length)]};
}
function wffGameplanView(state,opp){
 const p=wffPlan(state),ours=wffTeamScheme(state,state.teamId),theirs=wffTeamScheme(state,opp.id),cpu=wffOpponentPlan(state,opp.id);
 const options=(dict,value,key)=>Object.entries(dict).map(([id,x])=>'<option value="'+id+'" '+(id===value?'selected':'')+'>'+esc(x.name)+'</option>').join("");
 return '<section class="panel"><h2>Pregame Coaching & Game Plans</h2><p class="muted">One offensive focus and one defensive focus for this matchup. Both teams also use their own offensive system and defensive front. Game plans shift probabilities, not guarantee results.</p><div class="grid"><div class="stat"><strong>'+esc(teamLabel(teams[state.teamId]))+'</strong><label>Offensive scheme<select style="width:100%" data-wff-scheme="offense">'+Object.keys(WFF_SCHEMES).map(x=>'<option '+(x===ours.offense?'selected':'')+'>'+esc(x)+'</option>').join("")+'</select></label><label>Defensive scheme<select style="width:100%" data-wff-scheme="front">'+Object.keys(WFF_DEF_SCHEMES).map(x=>'<option '+(x===ours.front?'selected':'')+'>'+esc(x)+'</option>').join("")+'</select></label><label>Offensive focus<select style="width:100%" data-wff-plan="offense">'+options(WFF_OFF_FOCUS,p.offense)+'</select></label><p class="muted" id="wff-off-desc">'+esc(WFF_OFF_FOCUS[p.offense].desc)+'</p><label>Defensive focus<select style="width:100%" data-wff-plan="defense">'+options(WFF_DEF_FOCUS,p.defense)+'</select></label><p class="muted" id="wff-def-desc">'+esc(WFF_DEF_FOCUS[p.defense].desc)+'</p></div><div class="stat"><strong>'+esc(teamLabel(opp))+' • CPU coach</strong><p>Offense: '+esc(theirs.offense)+'</p><p>Defense: '+esc(theirs.front)+'</p><p>Offensive focus: '+esc(WFF_OFF_FOCUS[cpu.offense].name)+'</p><p>Defensive focus: '+esc(WFF_DEF_FOCUS[cpu.defense].name)+'</p><small>Opponent choices are generated from its style and your offensive tendencies, then locked for the game.</small></div></div></section>';
}
function wffGameplanBind(state){
 document.querySelectorAll("[data-wff-scheme]").forEach(e=>e.onchange=()=>{state[e.dataset.wffScheme]=e.value;save();drawView()});
 document.querySelectorAll("[data-wff-plan]").forEach(e=>e.onchange=()=>{
  const p=wffPlan(state);p[e.dataset.wffPlan]=e.value;
  document.getElementById(e.dataset.wffPlan==="offense"?"wff-off-desc":"wff-def-desc").textContent=(e.dataset.wffPlan==="offense"?WFF_OFF_FOCUS:WFF_DEF_FOCUS)[e.value].desc;
  save();
 });
}
function wffMatchPlans(l,side){
 return {attack:l.plans[side].offense,defend:l.plans[1-side].defense};
}
function wffPlanRunBias(focus){
 return ({ground:.16,quick:-.12,deep:-.13,protect:-.02,tempo:-.13,playaction:.035})[focus]||0;
}
function wffPlanPlayFit(play,focus){
 const c=play.concept||"",form=play.formation||"";
 if(focus==="ground")return play.kind==="run"?3:.55;
 if(focus==="quick")return /Slants|Stick|Spacing|Mesh|Screens|Quick Outs|Shallow Cross|Curl Flat/.test(c)?4:play.kind==="pass"?1:.75;
 if(focus==="deep")return /Four Verticals|Dagger|Post-Dig|Y Cross|Deep Over|Sail|Corner/.test(c)?4:1;
 if(focus==="protect")return /Screens|Quick Outs|Stick|Slants|Spacing|Draw/.test(c)?4:1;
 if(focus==="tempo")return /Shotgun|Pistol/.test(form)?3:1;
 if(focus==="playaction")return /Play Action|Boot/.test(c)?5:1;
 return 1;
}
function wffPlanDefenseFit(call,focus){
 const c=call.concept||"",f=call.formation||"";
 if(focus==="run")return /Run Fit/.test(c)?5:/4-3|3-4|Bear|Goal Line/.test(f)?3:1;
 if(focus==="blitz")return /Blitz|Pressure/.test(c)?5:1;
 if(focus==="coverage")return /Cover 2|Cover 3|Cover 4|Cover 6|Quarters|Tampa/.test(c)?4:1;
 if(focus==="man")return /Man|Cover 1/.test(c)?5:1;
 if(focus==="contain")return /Cover 3|Cover 4|Run Fit/.test(c)?3:1;
 if(focus==="disguise")return /Buzz|Robber|Fire Zone|Match|Cover 6/.test(c)?4:1;
 return 1;
}
function wffWeightedChoice(pool,r,weight){
 if(!pool.length)return null;
 const weights=pool.map(x=>Math.max(.01,weight(x))),total=weights.reduce((a,b)=>a+b,0);
 let n=r()*total;
 for(let i=0;i<pool.length;i++){n-=weights[i];if(n<=0)return pool[i]}
 return pool[pool.length-1];
}
function wffPlanModifiers(l,side,pass,play){
 const {attack,defend}=wffMatchPlans(l,side);
 const run=!pass,runDef=defend==="run",blitz=defend==="blitz",cover=defend==="coverage",man=defend==="man";
 let completion=0,runYards=0,passYards=0,pressure=0,turnover=0;
 if(run){if(attack==="ground")runYards+=.65;if(runDef)runYards-=1.25;if(cover)runYards+=.55;if(blitz)runYards-=.35;if(attack==="tempo")runYards+=.1}
 else{
  if(attack==="quick"){completion+=.065;passYards-=2.2;pressure-=.018}
  if(attack==="deep"){completion-=.075;passYards+=5;pressure+=.028;turnover+=.009}
  if(attack==="protect"){completion+=.035;passYards-=1.4;pressure-=.025}
  if(attack==="tempo"){completion-=.018;pressure+=.012}
  if(attack==="playaction"){completion+=.015;passYards+=1.1;if(runDef){completion+=.055;passYards+=2.2}}
  if(runDef){completion+=.025;passYards+=1.1}
  if(blitz){completion-=.055;pressure+=.045;turnover+=.008;if(attack==="quick"){completion+=.07;passYards+=1.3}}
  if(cover){completion-=.045;passYards-=2.1}
  if(man){completion-=.03;if(attack==="deep")passYards+=1.8}
  if(defend==="disguise"){completion-=.025;turnover+=.004}
  if(defend==="contain")pressure-=.008;
 }
 // Coaching plans remain modest and never override the underlying RNG.
 return {completion,runYards,passYards,pressure,turnover};
}
