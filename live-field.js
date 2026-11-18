"use strict";
// Lightweight SVG broadcast field driven by the live simulator state.
function wffFieldView(l){
 const side=l.possession,off=side===0?l.us:l.opp,def=side===0?l.opp:l.us;
 const oc=wffColors(off),dc=wffColors(def),yard=Math.max(1,Math.min(99,l.field)),first=Math.min(100,yard+l.toGo);
 const x=y=>50+y*8.8,ballX=x(yard),firstX=x(first);
 const recent=l.events[0]?.message||"Teams line up for the next snap.";
 const isPass=/pass|intercept|quarterback/i.test(recent),isRun=/run|rush|gains|kneel/i.test(recent);
 const seed=l.playCount||0;
 const markers=Array.from({length:11},(_,i)=>i*10).map(y=>'<line x1="'+x(y)+'" y1="30" x2="'+x(y)+'" y2="390" stroke="#ffffff" stroke-opacity=".4" stroke-width="2"/><text x="'+x(y)+'" y="218" fill="#ffffff" fill-opacity=".6" font-size="19" text-anchor="middle">'+(y===0||y===100?"":y<=50?y:100-y)+'</text>').join("");
 const players=[];
 const formations=[[-12,0],[-23,-45],[-23,45],[-23,-90],[-23,90],[-23,-130],[-23,130],[-44,0],[-52,-68],[-52,68],[-65,0]];
 const defenders=[[10,0],[13,-44],[13,44],[16,-88],[16,88],[30,-110],[30,110],[36,-55],[36,55],[50,-130],[50,130]];
 const dot=(px,py,color,outline,label,animate)=>'<g class="'+(animate?'wff-field-motion':'')+'" style="--dx:'+animate+'px"><circle cx="'+Math.max(58,Math.min(925,px))+'" cy="'+py+'" r="10" fill="'+color+'" stroke="'+outline+'" stroke-width="2.5"/><text x="'+Math.max(58,Math.min(925,px))+'" y="'+(py+3.6)+'" fill="#fff" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="800">'+label+'</text></g>';
 formations.forEach(([dx,dy],i)=>players.push(dot(ballX+dx,210+dy,oc[0],oc[1],i===7?"QB":i===8?"HB":i<7?"O":"R",i===7&&isPass?-10:0)));
 defenders.forEach(([dx,dy],i)=>players.push(dot(ballX+dx,210+dy,dc[0],dc[1],i<5?"D":i<9?"LB":"DB",isRun&&i<5?-8:0)));
 const ballEnd=isPass?Math.min(920,ballX+95):Math.min(920,ballX+30);
 const ball='<g class="wff-ball-motion" style="--ball-x:'+(ballEnd-ballX)+'px"><ellipse cx="'+ballX+'" cy="210" rx="9" ry="5" fill="#7d4524" stroke="#fff" stroke-width="1.4"/><path d="M'+(ballX-4)+' 210h8" stroke="#fff" stroke-width="1.5"/></g>';
 return '<section class="panel wff-field-panel"><h2>Live Field • '+esc(teamLabel(off))+' on offense</h2><div class="wff-field-wrap"><svg viewBox="0 0 980 420" role="img" aria-label="2D football field with player formations, ball at yard '+yard+' and first down at yard '+first+'" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="980" height="420" rx="14" fill="#102b21"/><rect x="50" y="30" width="880" height="360" fill="#246d43"/><rect x="50" y="30" width="88" height="360" fill="'+oc[1]+'" opacity=".7"/><rect x="842" y="30" width="88" height="360" fill="'+dc[1]+'" opacity=".7"/>'+markers+'<line x1="50" y1="30" x2="930" y2="30" stroke="#fff" stroke-width="4"/><line x1="50" y1="390" x2="930" y2="390" stroke="#fff" stroke-width="4"/><line x1="'+ballX+'" y1="30" x2="'+ballX+'" y2="390" stroke="#53baff" stroke-width="3"/><line x1="'+firstX+'" y1="30" x2="'+firstX+'" y2="390" stroke="#ffd04d" stroke-width="4" stroke-dasharray="12 7"/>'+players.join("")+ball+'<text x="94" y="210" transform="rotate(-90 94 210)" font-size="20" font-weight="800" text-anchor="middle" fill="#fff" opacity=".7">WFF</text><text x="887" y="210" transform="rotate(90 887 210)" font-size="20" font-weight="800" text-anchor="middle" fill="#fff" opacity=".7">WFF</text></svg></div><div class="wff-field-key"><span><i style="background:'+oc[0]+'"></i> '+esc(off.city)+' offense</span><span><i style="background:'+dc[0]+'"></i> '+esc(def.city)+' defense</span><span>🔵 Line of scrimmage</span><span>🟡 First down</span></div><p class="muted">Stylized player formations and illustrative movement; the game engine determines the actual result.</p></section>';
}
