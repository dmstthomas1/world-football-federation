"use strict";
// Lightweight SVG broadcast field driven by the live simulator state.
function wffFieldView(l){
 const side=l.possession,off=side===0?l.us:l.opp,def=side===0?l.opp:l.us;
 const oc=wffColors(off),dc=wffColors(def),yard=Math.max(1,Math.min(99,l.field)),first=Math.min(100,yard+l.toGo);
 const x=y=>50+y*8.8,ballX=x(yard),firstX=x(first);
 const recent=l.events[0]?.message||"Teams line up for the next snap.";
 const isPass=/pass|intercept|quarterback/i.test(recent),isRun=/run|rush|gains|kneel/i.test(recent);
 const packageInfo=l.formation||{formation:"Singleback",personnel:"12",defense:"4-3"};
 const home=l.matchup.home===l.us.id?l.us:l.opp,away=l.matchup.away===l.us.id?l.us:l.opp;
 const homeScore=l.matchup.home===l.us.id?l.score[0]:l.score[1],awayScore=l.matchup.away===l.us.id?l.score[0]:l.score[1];
 const clock=l.clock,seconds=Math.max(0,Math.floor(clock.remaining||0)),clockText=Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");
 const period=clock.quarter>4?"OT":"Q"+clock.quarter;
 const scoreboard='<div class="wff-field-scoreboard" role="group" aria-label="Live game scoreboard"><div class="wff-field-team"><span class="wff-field-logo">'+wffLogo(away,38)+'</span><span class="wff-field-team-name">'+esc(teamLabel(away))+'</span><b>'+awayScore+'</b></div><div class="wff-field-center"><strong>'+period+' • '+clockText+'</strong><span>'+esc(wffFieldDown(l))+'</span></div><div class="wff-field-team wff-field-home"><b>'+homeScore+'</b><span class="wff-field-team-name">'+esc(teamLabel(home))+'</span><span class="wff-field-logo">'+wffLogo(home,38)+'</span></div></div>';
 const markers=Array.from({length:11},(_,i)=>i*10).map(y=>'<line x1="'+x(y)+'" y1="30" x2="'+x(y)+'" y2="390" stroke="#ffffff" stroke-opacity=".4" stroke-width="2"/><text x="'+x(y)+'" y="218" fill="#ffffff" fill-opacity=".6" font-size="19" text-anchor="middle">'+(y===0||y===100?"":y<=50?y:100-y)+'</text>').join("");
 const players=[];
 const formation=packageInfo.formation||"Singleback",variant=l.calledPlay?.play?.variant||"Ace",personnel=packageInfo.personnel||"11";
 // Coordinates are SVG pixels relative to the line of scrimmage; offense attacks right.
 // Keep all 11 players separated by at least a visible marker diameter.
 const lineY=[-56,-28,0,28,56];
 const formations=lineY.map((dy)=>[-13,dy]);
 const offensiveLabels=["LT","LG","C","RG","RT"];
 const shotgun=/Shotgun/.test(formation),pistol=/Pistol/.test(formation),underCenter=/I-Form|Strong I|Weak I/.test(formation);
 formations.push([shotgun?-75:pistol?-58:-38,0]);offensiveLabels.push("QB");
 const rb=shotgun?[-87,38]:pistol?[-96,0]:underCenter?[-110,0]:[-83,0];
 formations.push(rb);offensiveLabels.push("HB");
 // The remaining four positions reflect the actual personnel package.
 let eligible=personnel==="23"?["TE","TE","TE","FB"]:personnel==="22"?["TE","TE","WR","FB"]:personnel==="21"?["WR","WR","TE","FB"]:personnel==="12"?["WR","WR","TE","TE"]:personnel==="10"?["WR","WR","WR","WR"]:["WR","WR","WR","TE"];
 // Personnel counts take precedence over a potentially inconsistent formation nickname.
 let positions=[[-13,-150],[-13,150],[-16,-93],[-16,93]];
 // In a conventional set, tight ends align near the tackle, receivers outside.
 const teSpots=[[-17,-87],[-17,87],[-46,-102]];
 let teIndex=0;
 positions=eligible.map((role,i)=>role==="TE"?(teSpots[teIndex++]||[-18,90]):role==="FB"?[-72,underCenter?0:-42]:positions[i]);
 if(/Trips|Trey/.test(variant)){positions[1]=[-13,130];positions[2]=[-13,92];positions[3]=[-40,113]}
 if(/Bunch/.test(variant)){positions[1]=[-18,113];positions[2]=[-43,137];positions[3]=[-58,104]}
 if(/Empty/.test(variant)){formations[6]=[-13,-115];offensiveLabels[6]="WR";positions[2]=[-13,95];positions[3]=[-13,155]}
 if(/Tight|Wing/.test(variant)&&!/Twin TE/.test(variant)){positions[0]=[-17,-104];positions[1]=[-17,104]}
 if(underCenter){
  formations[6]=[-116,0];
  const fb=eligible.indexOf("FB");if(fb>=0)positions[fb]=[-77,formation==="Strong I"?37:formation==="Weak I"?-37:0];
 }
 if(formation==="Goal Line"){formations[6]=[-90,0];positions=[[-18,-87],[-18,87],[-55,-52],[-55,52]]}
 // Resolve occasional overlaps in exotic personnel sets while preserving alignment shape.
 const placed=[...formations];
 positions.forEach((point,i)=>{
  let [px,py]=point;
  for(let tries=0;tries<12&&placed.some(([ox,oy])=>Math.hypot(px-ox,py-oy)<23);tries++){
   py=Math.max(-165,Math.min(165,py+(py>=0?1:-1)*26));
   if(Math.abs(py)>=160)px-=26;
  }
  placed.push([px,py]);formations.push([px,py]);offensiveLabels.push(eligible[i]);
 });
 const df=packageInfo.defense||"4-3",isGoal=/Goal Line|5-3|6-2/.test(df),isDime=/Dime|3-2-6|4-1-6/.test(df),isNickel=/Nickel|3-3-5|Big Nickel|2-4-5|4-2-5/.test(df);
 const frontCount=/6-2/.test(df)?6:/5-3/.test(df)?5:/3-4|3-3-5|3-2-6/.test(df)?3:4;
 const lbCount=/6-2/.test(df)?2:/5-3/.test(df)?3:isDime?(frontCount===3?2:1):isNickel?(frontCount===3?3:2):frontCount===3?4:3;
 const defenders=[],defensiveLabels=[];
 for(let i=0;i<frontCount;i++){
  const dy=(i-(frontCount-1)/2)*(frontCount>=5?29:frontCount===4?43:55);
  defenders.push([17,dy]);defensiveLabels.push("DL");
 }
 for(let i=0;i<lbCount;i++){
  const dy=(i-(lbCount-1)/2)*(lbCount>=4?55:lbCount===3?73:92);
  defenders.push([isGoal?55:76,dy]);defensiveLabels.push("LB");
 }
 const dbCount=11-defenders.length;
 for(let i=0;i<dbCount;i++){
  const dy=(i-(dbCount-1)/2)*(dbCount>=6?57:dbCount===5?72:dbCount===4?91:110);
  defenders.push([i<2?115:158,Math.max(-160,Math.min(160,dy))]);defensiveLabels.push("DB");
 }
 const dot=(px,py,color,outline,label,animate)=>{
  const cx=Math.max(62,Math.min(918,px)),cy=Math.max(43,Math.min(377,py));
  return '<g class="'+(animate?'wff-field-motion':'')+'" style="--dx:'+animate+'px"><circle cx="'+cx+'" cy="'+cy+'" r="7.2" fill="'+color+'" stroke="'+outline+'" stroke-width="1.6"/><text x="'+cx+'" y="'+(cy+2.6)+'" fill="#fff" text-anchor="middle" font-family="system-ui" font-size="6.3" font-weight="800">'+label+'</text></g>';
 };
 formations.forEach(([dx,dy],i)=>players.push(dot(ballX+dx,210+dy,oc[0],oc[1],offensiveLabels[i]||"O",i===5&&isPass?-10:0)));
 defenders.forEach(([dx,dy],i)=>players.push(dot(ballX+dx,210+dy,dc[0],dc[1],defensiveLabels[i],isRun&&i<frontCount?-8:0)));
 const ballEnd=isPass?Math.min(920,ballX+95):Math.min(920,ballX+30);
 const ball='<g class="wff-ball-motion" style="--ball-x:'+(ballEnd-ballX)+'px"><ellipse cx="'+ballX+'" cy="210" rx="9" ry="5" fill="#7d4524" stroke="#fff" stroke-width="1.4"/><path d="M'+(ballX-4)+' 210h8" stroke="#fff" stroke-width="1.5"/></g>';
 return '<section class="panel wff-field-panel"><h2>Live Field • '+esc(teamLabel(off))+' on offense</h2><p><strong>'+esc(packageInfo.formation+' '+variant)+' • '+esc(packageInfo.personnel)+' personnel</strong> vs <strong>'+esc(packageInfo.defense)+' defense</strong></p>'+scoreboard+'<div class="wff-field-wrap"><svg viewBox="0 0 980 420" role="img" aria-label="2D football field with player formations, ball at yard '+yard+' and first down at yard '+first+'" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="980" height="420" rx="14" fill="#102b21"/><rect x="50" y="30" width="880" height="360" fill="#246d43"/><rect x="50" y="30" width="88" height="360" fill="'+oc[1]+'" opacity=".7"/><rect x="842" y="30" width="88" height="360" fill="'+dc[1]+'" opacity=".7"/>'+markers+'<line x1="50" y1="30" x2="930" y2="30" stroke="#fff" stroke-width="4"/><line x1="50" y1="390" x2="930" y2="390" stroke="#fff" stroke-width="4"/><line x1="'+ballX+'" y1="30" x2="'+ballX+'" y2="390" stroke="#53baff" stroke-width="3"/><line x1="'+firstX+'" y1="30" x2="'+firstX+'" y2="390" stroke="#ffd04d" stroke-width="4" stroke-dasharray="12 7"/>'+players.join("")+ball+'<text x="94" y="210" transform="rotate(-90 94 210)" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">'+esc(teamLabel(l.matchup?.home===l.us.id?l.us:l.opp))+'</text><text x="887" y="210" transform="rotate(90 887 210)" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">'+esc(teamLabel(l.matchup?.away===l.us.id?l.us:l.opp))+'</text></svg></div><div class="wff-field-key"><span><i style="background:'+oc[0]+'"></i> '+esc(off.city)+' offense</span><span><i style="background:'+dc[0]+'"></i> '+esc(def.city)+' defense</span><span>🔵 Line of scrimmage</span><span>🟡 First down</span></div><div class="wff-inline-play-feed" aria-live="polite"><h3>Live Play-by-Play</h3>'+l.events.slice(0,10).map((event,i)=>'<div class="wff-inline-play'+(i===0?' wff-inline-play-latest':'')+'"><span class="wff-inline-play-time">Q'+event.q+' '+event.time+'</span><span>'+esc(event.message)+'</span></div>').join('')+'</div></section>';
}
