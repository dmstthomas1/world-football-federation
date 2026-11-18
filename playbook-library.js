"use strict";
// WFF authored concept families and generated formation variants. Calls are distinct
// formation/concept/personnel combinations, not 180 independently animated plays.
const WFF_O_FORM={
 "Singleback":["Ace","Doubles","Wing","Trips","Bunch","Tight"],
 "Shotgun":["Doubles","Trips","Bunch","Empty","Spread","Trey"],
 "Pistol":["Strong","Weak","Trips","Doubles"],
 "I-Form":["Pro","Tight","Twin TE"],
 "Strong I":["Pro","Slot"],"Weak I":["Pro","Slot"],
 "Goal Line":["Heavy","Jumbo"]
};
const WFF_CONCEPTS={
 run:["Inside Zone","Outside Zone","Power O","Counter","Duo","Trap","Stretch","Toss","Draw","Sweep","Iso","Split Zone","Read Option"],
 pass:["Slants","Stick","Spacing","Mesh","Drive","Flood","Levels","Dagger","Four Verticals","Post-Dig","Corner","Smash","Curl Flat","Texas","Screens","Shallow Cross","Y Cross","Sail","Quick Outs","Play Action Cross","Boot Flood","Deep Over"]
};
const WFF_SCHEMES={
 "Balanced Multiple":{forms:["Singleback","Shotgun","Pistol","I-Form","Strong I"],run:["Inside Zone","Power O","Counter","Duo","Stretch","Draw","Iso"],pass:["Slants","Stick","Mesh","Drive","Flood","Levels","Dagger","Four Verticals","Smash","Play Action Cross"],target:180},
 "West Coast":{forms:["Singleback","Shotgun","I-Form","Pistol"],run:["Inside Zone","Outside Zone","Stretch","Split Zone","Duo"],pass:["Slants","Stick","Spacing","Mesh","Drive","Flood","Levels","Curl Flat","Shallow Cross","Screens","Boot Flood","Quick Outs"],target:180},
 "Power Run":{forms:["I-Form","Strong I","Weak I","Singleback","Pistol","Goal Line"],run:["Power O","Counter","Duo","Trap","Iso","Toss","Inside Zone","Sweep"],pass:["Play Action Cross","Boot Flood","Deep Over","Slants","Flood","Post-Dig","Screens"],target:165},
 "Vertical Passing":{forms:["Shotgun","Singleback","Pistol","I-Form"],run:["Inside Zone","Draw","Outside Zone","Counter"],pass:["Four Verticals","Dagger","Post-Dig","Y Cross","Sail","Deep Over","Smash","Levels","Play Action Cross","Corner"],target:180},
 "Spread":{forms:["Shotgun","Pistol","Singleback"],run:["Inside Zone","Outside Zone","Read Option","Draw","Split Zone","Counter"],pass:["Mesh","Four Verticals","Spacing","Stick","Slants","Screens","Y Cross","Levels","Smash","Shallow Cross"],target:180},
 "Wide Zone":{forms:["Singleback","I-Form","Shotgun","Pistol"],run:["Outside Zone","Stretch","Split Zone","Inside Zone","Counter","Duo"],pass:["Boot Flood","Play Action Cross","Flood","Sail","Levels","Shallow Cross","Screens","Slants"],target:165},
 "Air Raid":{forms:["Shotgun","Pistol","Singleback"],run:["Inside Zone","Draw","Read Option"],pass:["Mesh","Four Verticals","Y Cross","Shallow Cross","Stick","Spacing","Screens","Slants","Levels","Smash","Quick Outs"],target:175},
 "Run and Shoot":{forms:["Shotgun","Pistol","Singleback"],run:["Inside Zone","Draw","Outside Zone","Read Option"],pass:["Four Verticals","Y Cross","Shallow Cross","Post-Dig","Corner","Dagger","Levels","Mesh","Quick Outs","Smash"],target:170},
 "Run and Gun":{forms:["Shotgun","Pistol","Singleback"],run:["Inside Zone","Read Option","Draw","Outside Zone","Counter"],pass:["Four Verticals","Mesh","Y Cross","Slants","Dagger","Screens","Levels","Sail","Shallow Cross","Deep Over"],target:180}
};
// Goal-line calls are guaranteed in every offensive system, regardless of its base formations.
const WFF_GOAL_CALLS=[
 {concept:"HB Dive",kind:"run"},{concept:"Power O",kind:"run"},
 {concept:"FB Dive",kind:"run"},{concept:"QB Sneak",kind:"run"},
 {concept:"Play Action Boot",kind:"pass"},{concept:"Play Action TE Leak",kind:"pass"},
 {concept:"Goal Line Slants",kind:"pass"},{concept:"TE Flat",kind:"pass"}
];
const WFF_DEF_SCHEMES={
 "4-3":["4-3 Over","4-3 Under","4-3 Wide","4-3 Bear","Nickel 4-2-5","Nickel Double A","Dime 4-1-6","Goal Line 6-2"],
 "3-4":["3-4 Odd","3-4 Even","3-4 Bear","3-4 Under","Nickel 2-4-5","3-3-5 Stack","3-3-5 Over","3-3-5 Bear","Dime 3-2-6","Goal Line 5-3"],
 "4-2-5":["Nickel 4-2-5","Nickel Double A","4-3 Over","Dime 4-1-6","Big Nickel","Goal Line 6-2"],
 "3-3-5":["3-3-5 Stack","3-3-5 Over","3-3-5 Under","3-3-5 Bear","3-3-5 Odd","Nickel 2-4-5","Dime 3-2-6","3-4 Odd","Goal Line 5-3"]
};
const WFF_DEF_CALLS=["Cover 1 Robber","Cover 2 Man","Cover 2 Zone","Cover 3 Sky","Cover 3 Buzz","Cover 4 Quarters","Cover 6","Match Quarters","Tampa 2","Fire Zone Blitz","Sam Blitz","Mike Blitz","Double A Blitz","Edge Pressure","Run Fit"];
function wffPlayLibrary(style){
 const cfg=WFF_SCHEMES[style]||WFF_SCHEMES["Balanced Multiple"],out=[];
 for(const form of cfg.forms)for(const variant of WFF_O_FORM[form])for(const kind of ["run","pass"])for(const concept of cfg[kind]){
  if(form==="Goal Line"&&kind==="pass"&&!/Play Action|Slants|Boot/.test(concept))continue;
  if(form==="I-Form"&&/Four Verticals|Screens/.test(concept))continue;
  if(form==="Shotgun"&&/Iso|Toss/.test(concept))continue;
  const personnel=form==="Goal Line"?"23":form==="I-Form"&&variant==="Twin TE"?"22":form==="I-Form"||form==="Strong I"||form==="Weak I"?"21":form==="Shotgun"&&variant==="Empty"?"10":form==="Shotgun"?"11":form==="Pistol"?"11":variant==="Wing"||variant==="Tight"?"12":"11";
  out.push({id:[form,variant,concept].join("|"),formation:form,variant,concept,kind,personnel});
 }
 // Deterministic distributed sampling so every permitted formation contributes.
 const result=[],buckets=cfg.forms.map(form=>out.filter(p=>p.formation===form));
 while(result.length<cfg.target&&buckets.some(b=>b.length)){
  for(const bucket of buckets){if(!bucket.length||result.length>=cfg.target)continue;const index=Math.floor(bucket.length/2);result.push(bucket.splice(index,1)[0])}
 }
 // Reserve goal-line run, sneak, play-action and conventional passing options.
 const goal=WFF_GOAL_CALLS.map((call,i)=>({id:"Goal Line|"+(i%2?"Jumbo":"Heavy")+"|"+call.concept,formation:"Goal Line",variant:i%2?"Jumbo":"Heavy",personnel:"23",...call}));
 const keep=result.filter(p=>p.formation!=="Goal Line").slice(0,Math.max(0,cfg.target-goal.length));
 return [...keep,...goal];
}
function wffDefenseLibrary(front){
 return (WFF_DEF_SCHEMES[front]||WFF_DEF_SCHEMES["4-3"]).flatMap(formation=>WFF_DEF_CALLS.map(concept=>({id:formation+"|"+concept,formation,concept})));
}
function wffPlayConfig(state){
 if(!state.playbookConfig)state.playbookConfig={};
 const c=state.playbookConfig;
 if(!c.disabledOffense)c.disabledOffense={};
 if(!c.disabledDefense)c.disabledDefense={};
 return c;
}
function wffCallPlay(l,side){
 const style=l.schemes[side].offense,front=l.schemes[1-side].front;
 const cfg=wffPlayConfig(l.state),off=wffPlayLibrary(style).filter(p=>side!==0||!cfg.disabledOffense[p.id]);
 const distance=l.toGo,down=l.down,late=l.clock.quarter>=4,focus=l.plans[side].offense,defFocus=l.plans[1-side].defense;
 const scoreDiff=l.score[side]-l.score[1-side],seconds=l.clock.remaining;
 const goalToGo=l.field>=90&&distance>=100-l.field;
 const nearGoal=l.field>=94||goalToGo;
 const short=distance<=2,long=distance>=8,veryLong=distance>=14;
 const baseRun=({"Balanced Multiple":.44,"West Coast":.43,"Power Run":.56,"Vertical Passing":.37,"Spread":.40,"Wide Zone":.53,"Air Raid":.32,"Run and Shoot":.34,"Run and Gun":.38})[style]??.44;
 let runChance=baseRun+wffPlanRunBias(focus)*.55;
 if(down===1)runChance+=.07;
 if(down===2)runChance+=(short?.09:distance>=10?-.12:0);
 if(down===3)runChance+=short?.10:distance<=5?-.12:-.34;
 if(down===4)runChance+=short?.16:distance<=5?-.10:-.39;
 if(veryLong)runChance-=down>=3?.22:.13;
 else if(long&&down>=2)runChance-=.08;
 if(nearGoal)runChance+=short?.15:.04;
 if(l.field<=5)runChance+=.08;
 if(l.clock.quarter===4&&scoreDiff>=9)runChance+=.11;
 if(l.clock.quarter===4&&scoreDiff<0&&seconds<300)runChance-=.23;
 if((l.clock.quarter===2||l.clock.quarter===4)&&seconds<90&&scoreDiff<=0)runChance-=.13;
 runChance=Math.max(down>=3&&veryLong?.025:.10,Math.min(.77,runChance));
 const wantRun=l.r()<runChance;
 const situational=off.filter(p=>nearGoal?p.formation==="Goal Line":p.formation!=="Goal Line");
 const choices=situational.length?situational:off;
 const pool=choices.filter(p=>p.kind===(wantRun?"run":"pass"));
 const play=wffWeightedChoice(pool.length?pool:choices,l.r,p=>{
  let weight=Math.max(.1,wffPlanPlayFit(p,focus));
  if(p.formation==="Goal Line"){
   if(p.concept==="QB Sneak")weight*=distance<=1?6:distance<=2?2:.18;
   if(/Play Action/.test(p.concept))weight*=down===1||down===2?2:1;
   if(/TE Flat|Slants/.test(p.concept))weight*=distance>=4?3:1;
  }else{
   if(/Four Verticals|Deep Over|Dagger|Post-Dig/.test(p.concept))weight*=distance>=9?2.2:distance<=3?.4:1;
   if(/Screens|Draw/.test(p.concept))weight*=down>=3&&distance>=12?.65:1;
   if(/Power O|Duo|Iso|Inside Zone/.test(p.concept))weight*=distance<=3?1.6:1;
  }
  return weight;
 })||wffPlayLibrary(style)[0];
 const defenses=wffDefenseLibrary(front).filter(p=>side!==1||!cfg.disabledDefense[p.id]);
 // Defensive personnel selection: match offensive grouping, down/distance and field position.
 // Goal-line packages are NOT ordinary base defenses.
 const personnel=play?.personnel||"11",heavy=["21","22","23"].includes(personnel);
 const spread=personnel==="10",threeWide=personnel==="11",twoTE=personnel==="12";
 const long=distance>=8,passingDown=down>=3&&distance>=6;
 const goalSituation=l.field>=97||(l.field>=92&&distance<=3);
 const goalEligible=goalSituation&&(heavy||twoTE||distance<=2);
 const base=d=>/^(4-3|3-4)(?: |$)/.test(d.formation);
 const nickel=d=>/Nickel|3-3-5|4-2-5|Big Nickel/.test(d.formation);
 const dime=d=>/Dime|3-2-6|4-1-6/.test(d.formation);
 const goal=d=>/Goal Line/.test(d.formation);
 const regular=defenses.filter(d=>!goal(d));
 // Even if users disable an entire defensive family, never substitute Goal Line at midfield.
 const legal=goalEligible?defenses:regular;
 const available=legal.length?legal:(goalEligible?defenses:wffDefenseLibrary(front).filter(d=>!goal(d)));
 const weight=d=>{
  const form=d.formation;
  let w=base(d)?1:nickel(d)?1:dime(d)?1:goal(d)?1:.5;
  if(goal(d))w=goalEligible?(heavy?14:distance<=1?7:2):0;
  else if(heavy)w=base(d)?12:nickel(d)?(long&&down>=3?2:.35):.05;
  else if(twoTE)w=base(d)?7:nickel(d)?(passingDown?5:2):dime(d)?.15:.2;
  else if(spread)w=dime(d)?(passingDown?10:5):nickel(d)?7:base(d)?.35:.2;
  else if(threeWide)w=nickel(d)?9:dime(d)?(passingDown?5:1):base(d)?(distance<=3?3:1.5):.3;
  else w=base(d)?6:nickel(d)?5:dime(d)?1:.3;
  if(down===4&&distance>=7&&dime(d))w*=2;
  if(distance<=2&&base(d))w*=1.5;
  if(distance<=2&&dime(d))w*=.3;
  return Math.max(.01,w)*Math.max(.1,wffPlanDefenseFit(d,defFocus));
 };
 // A pressure identity changes the mix, but never makes every snap a blitz.
 const pressureCalls=available.filter(d=>/Blitz|Pressure/.test(d.concept));
 const ordinaryCalls=available.filter(d=>!/Blitz|Pressure/.test(d.concept));
 const scoreGap=l.score[side]-l.score[1-side];
 let pressureChance=defFocus==="blitz"?.31:defFocus==="disguise"?.20:defFocus==="man"?.17:defFocus==="run"?.13:.12;
 if(down===3&&distance>=5)pressureChance+=.09;
 if(down===4&&distance>=5)pressureChance+=.07;
 if(distance<=2)pressureChance+=.04;
 if(distance>=14)pressureChance-=.05;
 if(l.field>=90)pressureChance-=.06;
 if(l.clock.quarter===4&&scoreGap>=9)pressureChance-=.05;
 pressureChance=Math.max(.045,Math.min(.43,pressureChance));
 const callBlitz=pressureCalls.length&&l.r()<pressureChance;
 const defensivePool=callBlitz?pressureCalls:ordinaryCalls.length?ordinaryCalls:available;
 const defense=wffWeightedChoice(defensivePool,l.r,weight);
 return {play,defense,formation:play?.formation||"Singleback",personnel:play?.personnel||"11",defenseFormation:defense?.formation||front};
}
function wffPlaybookView(state){
 const config=wffPlayConfig(state),off=wffPlayLibrary(state.offense),def=wffDefenseLibrary(state.front);
 const render=(plays,disabled,side)=>'<section class="panel"><h2>'+side+' Playbook — '+plays.length+' calls</h2><p class="muted">Uncheck a call to remove it from your team’s active playbook. Formation, concept and personnel combinations are individually selectable.</p>'+plays.map(p=>'<label class="line"><span><input type="checkbox" data-play-side="'+side+'" data-play-id="'+esc(p.id)+'" '+(!disabled[p.id]?"checked":"")+'/> '+esc(p.formation+(p.variant?" "+p.variant:"")+' — '+p.concept)+'</span><small>'+esc(p.personnel||"")+'</small></label>').join("")+'</section>';
 return '<section class="panel"><h2>Team Playbook Manager</h2><p>Offense: '+esc(state.offense)+' • Defense: '+esc(state.front)+'</p><p class="muted">Playbooks automatically rebuild around your selected scheme. Disabled calls persist in your franchise save. These are concept-level calls, not yet fully simulated routes or coverage assignments.</p></section>'+render(off,config.disabledOffense,"Offense")+render(def,config.disabledDefense,"Defense");
}
function wffPlaybookBind(state){
 document.querySelectorAll("[data-play-id]").forEach(e=>e.onchange=()=>{const cfg=wffPlayConfig(state),key=e.dataset.playSide==="Offense"?"disabledOffense":"disabledDefense";cfg[key][e.dataset.playId]=!e.checked;save()});
}
