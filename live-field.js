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
 const scoreboard='<div class="wff-field-scoreboard" role="group" aria-label="Live game scoreboard"><div class="wff-field-team"><span class="wff-field-team-label">AWAY</span><strong>'+esc(teamLabel(away))+'</strong><b>'+awayScore+'</b></div><div class="wff-field-center"><strong>'+period+' • '+clockText+'</strong><span>'+l.down+' &amp; '+l.toGo+' • Ball on '+yard+'</span><small>'+esc(teamLabel(off))+' possession</small></div><div class="wff-field-team wff-field-home"><b>'+homeScore+'</b><strong>'+esc(teamLabel(home))+'</strong><span class="wff-field-team-label">HOME</span></div></div>';
 const markers=Array.from({length:11},(_,i)=>i*10).map(y=>'<line x1="'+x(y)+'" y1="30" x2="'+x(y)+'" y2="390" stroke="#ffffff" stroke-opacity=".4" stroke-width="2"/><text x="'+x(y)+'" y="218" fill="#ffffff" fill-opacity=".6" font-size="19" text-anchor="middle">'+(y===0||y===100?"":y<=50?y:100-y)+'</text>').join("");
 const players=[];
 const formation=packageInfo.formation||"Singleback",variant=l.calledPlay?.play?.variant||"Ace",personnel=packageInfo.personnel||"11";
 const formations=[[-10,-46],[-10,-23],[-10,0],[-10,23],[-10,46]];
 const qb=formation==="Shotgun"?-64:formation==="Pistol"?-49:-31;
 formations.push([qb,0],[formation==="Shotgun"?-76:formation==="Pistol"?-77:-58,formation==="Shotgun"?33:0]);
 const receivers=personnel==="23"?[[-18,-83],[-18,83],[-46,-35],[-46,35]]:personnel==="21"?[[-18,-126],[-18,126],[-40,-36],[-40,36]]:personnel==="12"?[[-18,-125],[-18,125],[-17,-68],[-17,68]]:[[-18,-137],[-18,137],[-18,-96],[-18,96]];
 if(/Trips|Trey/.test(variant)){receivers[2]=[-18,73];receivers[3]=[-18,105]}
 if(/Bunch/.test(variant)){receivers[1]=[-20,103];receivers[2]=[-29,120];receivers[3]=[-40,137]}
 if(/Empty/.test(variant)){formations[6]=[-18,-103];receivers[2]=[-18,80];receivers[3]=[-18,120]}
 if(/Tight|Wing/.test(variant)){receivers[0]=[-18,-73];receivers[1]=[-18,73]}
 if(/I-Form|Strong I|Weak I/.test(formation)){formations[6]=[-82,0];receivers[2]=[-48,formation==="Strong I"?34:formation==="Weak I"?-34:0]}
 if(formation==="Goal Line"){formations[6]=[-68,0];receivers[0]=[-18,-69];receivers[1]=[-18,69];receivers[2]=[-37,-40];receivers[3]=[-37,40]}
 formations.push(...receivers);
 const df=packageInfo.defense||"4-3",isDime=/Dime|3-2-6|4-1-6/.test(df),isNickel=/Nickel|3-3-5|Big Nickel|2-4-5|4-2-5/.test(df),frontThree=/3-4|3-3-5|3-2-6/.test(df),bear=/Bear/.test(df);
 const line=frontThree?[[12,-47],[12,0],[12,47]]:[[12,-69],[12,-23],[12,23],[12,69]];
 if(bear){line[0][1]=-36;line[line.length-1][1]=36}
 const lbCount=isDime?(frontThree?2:1):isNickel?(frontThree?3:2):frontThree?4:3;
 const defenders=[...line];
 for(let i=0;i<lbCount;i++)defenders.push([34,(i-(lbCount-1)/2)*57]);
 const dbCount=11-defenders.length;
 for(let i=0;i<dbCount;i++)defenders.push([i<2?51:65,(i-(dbCount-1)/2)*(dbCount>=6?53:65)]);
 const offensiveLabels=["LT","LG","C","RG","RT","QB","HB",...(personnel==="23"?["TE","TE","FB","WR"]:personnel==="21"?["WR","WR","FB","TE"]:personnel==="12"?["WR","WR","TE","TE"]:["WR","WR","WR","TE"])];
 const dot=(px,py,color,outline,label,animate)=>'<g class="'+(animate?'wff-field-motion':'')+'" style="--dx:'+animate+'px"><circle cx="'+Math.max(58,Math.min(925,px))+'" cy="'+py+'" r="10" fill="'+color+'" stroke="'+outline+'" stroke-width="2.5"/><text x="'+Math.max(58,Math.min(925,px))+'" y="'+(py+3.6)+'" fill="#fff" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="800">'+label+'</text></g>';
 formations.forEach(([dx,dy],i)=>players.push(dot(ballX+dx,210+dy,oc[0],oc[1],offensiveLabels[i]||"O",i===5&&isPass?-10:0)));
 defenders.forEach(([dx,dy],i)=>players.push(dot(ballX+dx,210+dy,dc[0],dc[1],i<line.length?"DL":i<line.length+lbCount?"LB":"DB",isRun&&i<5?-8:0)));
 const ballEnd=isPass?Math.min(920,ballX+95):Math.min(920,ballX+30);
 const ball='<g class="wff-ball-motion" style="--ball-x:'+(ballEnd-ballX)+'px"><ellipse cx="'+ballX+'" cy="210" rx="9" ry="5" fill="#7d4524" stroke="#fff" stroke-width="1.4"/><path d="M'+(ballX-4)+' 210h8" stroke="#fff" stroke-width="1.5"/></g>';
 return '<section class="panel wff-field-panel"><h2>Live Field • '+esc(teamLabel(off))+' on offense</h2><p><strong>'+esc(packageInfo.formation+' '+variant)+' • '+esc(packageInfo.personnel)+' personnel</strong> vs <strong>'+esc(packageInfo.defense)+' defense</strong></p>'+scoreboard+'<div class="wff-field-wrap"><svg viewBox="0 0 980 420" role="img" aria-label="2D football field with player formations, ball at yard '+yard+' and first down at yard '+first+'" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="980" height="420" rx="14" fill="#102b21"/><rect x="50" y="30" width="880" height="360" fill="#246d43"/><rect x="50" y="30" width="88" height="360" fill="'+oc[1]+'" opacity=".7"/><rect x="842" y="30" width="88" height="360" fill="'+dc[1]+'" opacity=".7"/>'+markers+'<line x1="50" y1="30" x2="930" y2="30" stroke="#fff" stroke-width="4"/><line x1="50" y1="390" x2="930" y2="390" stroke="#fff" stroke-width="4"/><line x1="'+ballX+'" y1="30" x2="'+ballX+'" y2="390" stroke="#53baff" stroke-width="3"/><line x1="'+firstX+'" y1="30" x2="'+firstX+'" y2="390" stroke="#ffd04d" stroke-width="4" stroke-dasharray="12 7"/>'+players.join("")+ball+'<text x="94" y="210" transform="rotate(-90 94 210)" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">'+esc(teamLabel(l.matchup?.home===l.us.id?l.us:l.opp))+'</text><text x="887" y="210" transform="rotate(90 887 210)" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">'+esc(teamLabel(l.matchup?.away===l.us.id?l.us:l.opp))+'</text></svg></div><div class="wff-field-key"><span><i style="background:'+oc[0]+'"></i> '+esc(off.city)+' offense</span><span><i style="background:'+dc[0]+'"></i> '+esc(def.city)+' defense</span><span>🔵 Line of scrimmage</span><span>🟡 First down</span></div><p class="muted">Stylized player formations and illustrative movement; the game engine determines the actual result.</p></section>';
}
