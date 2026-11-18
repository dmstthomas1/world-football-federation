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
const WFF_DEF_SCHEMES={
 "4-3":["4-3 Over","4-3 Under","4-3 Wide","4-3 Bear","Nickel 4-2-5","Nickel Double A","Dime 4-1-6","Goal Line 6-2"],
 "3-4":["3-4 Odd","3-4 Even","3-4 Bear","3-4 Under","Nickel 2-4-5","3-3-5 Stack","3-3-5 Bear","Dime 3-2-6","Goal Line 5-3"],
 "4-2-5":["Nickel 4-2-5","Nickel Double A","4-3 Over","Dime 4-1-6","Big Nickel","Goal Line 6-2"],
 "3-3-5":["3-3-5 Stack","3-3-5 Bear","3-3-5 Odd","Nickel 2-4-5","Dime 3-2-6","3-4 Odd","Goal Line 5-3"]
};
const WFF_DEF_CALLS=["Cover 1 Robber","Cover 2 Man","Cover 2 Zone","Cover 3 Sky","Cover 3 Buzz","Cover 4 Quarters","Cover 6","Match Quarters","Tampa 2","Fire Zone Blitz","Sam Blitz","Mike Blitz","Double A Blitz","Edge Pressure","Run Fit"];
function wffPlayLibrary(style){
 const cfg=WFF_SCHEMES[style]||WFF_SCHEMES["Balanced Multiple"],out=[];
 for(const form of cfg.forms)for(const variant of WFF_O_FORM[form])for(const kind of ["run","pass"])for(const concept of cfg[kind]){
  if(form==="Goal Line"&&kind==="pass"&&!/Play Action|Slants|Boot/.test(concept))continue;
  if(form==="I-Form"&&/Four Verticals|Screens/.test(concept))continue;
  if(form==="Shotgun"&&/Iso|Toss/.test(concept))continue;
  const personnel=form==="Goal Line"?"23":form==="I-Form"||form==="Strong I"||form==="Weak I"?"21":form==="Shotgun"?"11":form==="Pistol"?"11":variant==="Wing"||variant==="Tight"?"12":"11";
  out.push({id:[form,variant,concept].join("|"),formation:form,variant,concept,kind,personnel});
 }
 // Deterministic distributed sampling so every permitted formation contributes.
 const result=[],buckets=cfg.forms.map(form=>out.filter(p=>p.formation===form));
 while(result.length<cfg.target&&buckets.some(b=>b.length)){
  for(const bucket of buckets){if(!bucket.length||result.length>=cfg.target)continue;const index=Math.floor(bucket.length/2);result.push(bucket.splice(index,1)[0])}
 }
 return result;
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
 const style=side===0?l.state.offense:"Balanced Multiple",front=side===0?"4-3":l.state.front;
 const cfg=wffPlayConfig(l.state),off=wffPlayLibrary(style).filter(p=>side!==0||!cfg.disabledOffense[p.id]);
 const distance=l.toGo,down=l.down,late=l.clock.quarter>=4;
 const runBias=/Power Run|Wide Zone/.test(style)?.62:/Air Raid|Run and Shoot|Run and Gun/.test(style)?.30:/Spread|Vertical/.test(style)?.37:.46;
 let wantRun=l.r()<Math.max(.12,Math.min(.82,runBias+(distance<=2?.16:distance>=8?-.16:0)+(down===3?-.15:0)+(late&&l.score[side]>l.score[1-side]?.12:0)));
 const pool=off.filter(p=>p.kind===(wantRun?"run":"pass"));const play=pool[Math.floor(l.r()*pool.length)]||off[0]||wffPlayLibrary(style)[0];
 const base=front||"4-3",defenses=wffDefenseLibrary(base).filter(p=>side!==1||!cfg.disabledDefense[p.id]);
 const nickel=play?.personnel==="11",long=down>=3&&distance>=7,short=distance<=2;
 let desired=short&&play?.personnel==="21"?"base":nickel&&long?"dime":nickel?"nickel":"base";
 const candidates=defenses.filter(d=>desired==="dime"?/Dime/.test(d.formation):desired==="nickel"?/Nickel|3-3-5|Big Nickel/.test(d.formation):/4-3|3-4|Goal Line/.test(d.formation));
 const available=candidates.length?candidates:defenses.length?defenses:wffDefenseLibrary(base);
 const defense=available[Math.floor(l.r()*available.length)];
 return {play,defense,formation:play?.formation||"Singleback",personnel:play?.personnel||"11",defenseFormation:defense?.formation||base};
}
function wffPlaybookView(state){
 const config=wffPlayConfig(state),off=wffPlayLibrary(state.offense),def=wffDefenseLibrary(state.front);
 const render=(plays,disabled,side)=>'<section class="panel"><h2>'+side+' Playbook — '+plays.length+' calls</h2><p class="muted">Uncheck a call to remove it from your team’s active playbook. Formation, concept and personnel combinations are individually selectable.</p>'+plays.map(p=>'<label class="line"><span><input type="checkbox" data-play-side="'+side+'" data-play-id="'+esc(p.id)+'" '+(!disabled[p.id]?"checked":"")+'/> '+esc(p.formation+(p.variant?" "+p.variant:"")+' — '+p.concept)+'</span><small>'+esc(p.personnel||"")+'</small></label>').join("")+'</section>';
 return '<section class="panel"><h2>Team Playbook Manager</h2><p>Offense: '+esc(state.offense)+' • Defense: '+esc(state.front)+'</p><p class="muted">Playbooks automatically rebuild around your selected scheme. Disabled calls persist in your franchise save. These are concept-level calls, not yet fully simulated routes or coverage assignments.</p></section>'+render(off,config.disabledOffense,"Offense")+render(def,config.disabledDefense,"Defense");
}
function wffPlaybookBind(state){
 document.querySelectorAll("[data-play-id]").forEach(e=>e.onchange=()=>{const cfg=wffPlayConfig(state),key=e.dataset.playSide==="Offense"?"disabledOffense":"disabledDefense";cfg[key][e.dataset.playId]=!e.checked;save()});
}
