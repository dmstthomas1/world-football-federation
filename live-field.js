"use strict";
// Lightweight SVG broadcast field driven by the live simulator state.
function wffFieldView(l){
 const side=l.possession,off=side===0?l.us:l.opp,def=side===0?l.opp:l.us;
 const oc=wffColors(off),dc=wffColors(def),yard=Math.max(1,Math.min(99,l.field)),first=Math.min(100,yard+l.toGo);
 const x=y=>138+y*7.04,ballX=x(yard),firstX=x(first);
 const recent=l.events[0]?.message||"Teams line up for the next snap.";
 const isPass=/pass|intercept|quarterback/i.test(recent),isRun=/run|rush|gains|kneel/i.test(recent);
 const packageInfo=l.formation||{formation:"Singleback",personnel:"12",defense:"4-3"};
 const home=l.matchup.home===l.us.id?l.us:l.opp,away=l.matchup.away===l.us.id?l.us:l.opp;
 const homeScore=l.matchup.home===l.us.id?l.score[0]:l.score[1],awayScore=l.matchup.away===l.us.id?l.score[0]:l.score[1];
 const clock=l.clock,seconds=Math.max(0,Math.floor(clock.remaining||0)),clockText=Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");
 const period=clock.quarter>4?"OT":"Q"+clock.quarter;
 const awaySide=away.id===l.us.id?0:1,homeSide=home.id===l.us.id?0:1;
 const standings=wffStandings(l.state);
 const record=t=>{const r=standings[t.id];return r?r.w+"-"+r.l+(r.t?"-"+r.t:""):"0-0"};
 const timeoutDots=n=>'<span class="wff-timeout-dots" aria-label="'+n+' timeouts remaining">'+Array.from({length:3},(_,i)=>'<i class="'+(i<n?'available':'used')+'"></i>').join('')+'</span>';
 const scoreboard='<div class="wff-field-scoreboard" role="group" aria-label="Live game scoreboard"><div class="wff-field-team">'+(l.possession===awaySide?'<span class="wff-possession" title="Possession" aria-label="Ball possession">🏈</span>':'')+'<span class="wff-field-logo">'+wffLogo(away,38)+'</span><span class="wff-field-team-name">'+esc(teamLabel(away))+'</span><span class="wff-score-stack"><b>'+awayScore+'</b><small class="wff-score-record">'+record(away)+'</small></span>'+timeoutDots(clock.timeouts[awaySide])+'</div><div class="wff-field-center"><strong>'+period+' • '+clockText+'</strong><span>'+esc(wffFieldDown(l))+'</span></div><div class="wff-field-team wff-field-home">'+timeoutDots(clock.timeouts[homeSide])+'<span class="wff-score-stack"><b>'+homeScore+'</b><small class="wff-score-record">'+record(home)+'</small></span><span class="wff-field-team-name">'+esc(teamLabel(home))+'</span><span class="wff-field-logo">'+wffLogo(home,38)+'</span>'+(l.possession===homeSide?'<span class="wff-possession" title="Possession" aria-label="Ball possession">🏈</span>':'')+'</div></div>';
 const highlight=l.fieldHighlight;
 const highlightMarkup=highlight?'<div class="wff-field-highlight wff-highlight-'+highlight.kind+'" role="status" aria-live="assertive"><div class="wff-highlight-banner"><strong>'+esc(highlight.title)+'</strong>'+(highlight.detail?'<small>'+esc(highlight.detail)+'</small>':'')+'</div></div>':'';
 const kick=l.specialTeams?.phase==="scoreHold"?null:l.specialTeams;
 const kickOverlay=kick?'<div class="wff-kick-overlay" role="status" aria-live="polite"><strong>'+(kick.type==="punt"?"PUNT":"KICKOFF")+'</strong><span>'+(kick.phase==="flight"?"BALL IN FLIGHT • "+kick.distance+" YARDS":kick.touchback?"TOUCHBACK":"RETURN • "+kick.returnYards+" YARDS")+'</span><div class="wff-kick-track"><i class="wff-kick-ball '+(kick.phase==="flight"?"wff-kick-flight":"wff-kick-landed")+'">🏈</i></div><small>'+(kick.receivingSide===0?esc(l.us.city):esc(l.opp.city))+' receiving</small></div>':'';
 const markers=Array.from({length:11},(_,i)=>i*10).map(y=>'<line x1="'+x(y)+'" y1="30" x2="'+x(y)+'" y2="390" stroke="#ffffff" stroke-opacity=".4" stroke-width="2"/><text x="'+x(y)+'" y="218" fill="#ffffff" fill-opacity=".6" font-size="19" text-anchor="middle">'+(y===0||y===100?"":y<=50?y:100-y)+'</text>').join("");
 const players=[];
 const formation=packageInfo.formation||"Singleback",variant=l.calledPlay?.play?.variant||"Ace",personnel=packageInfo.personnel||"11";
 // Coordinates are SVG pixels relative to the line of scrimmage; offense attacks right.
 // Keep all 11 players separated by at least a visible marker diameter.
 const lineY=[-38,-19,0,19,38];
 const formations=lineY.map((dy)=>[-9,dy]);
 const offensiveLabels=["LT","LG","C","RG","RT"];
 const shotgun=/Shotgun/.test(formation),pistol=/Pistol/.test(formation),underCenter=/I-Form|Strong I|Weak I/.test(formation);
 formations.push([shotgun?-47:pistol?-36:-19,0]);offensiveLabels.push("QB");
 const rb=shotgun?[-60,27]:pistol?[-75,0]:underCenter?[-83,0]:[-63,0];
 formations.push(rb);offensiveLabels.push("HB");
 // The remaining four positions reflect the actual personnel package.
 // Assign positions by personnel, then use named formation templates rather than random spreading.
 const roleSets={"10":["WR","WR","WR","WR"],"11":["WR","WR","WR","TE"],"12":["WR","WR","TE","TE"],"21":["WR","WR","TE","FB"],"22":["WR","TE","TE","FB"],"23":["TE","TE","TE","FB"]};
 const eligible=(roleSets[personnel]||roleSets["11"]).slice();
 const places={WR:[[-9,-151],[-9,151],[-9,-110],[-9,110]],TE:[[-10,-56],[-10,56],[-31,-76]],FB:[[-52,0]]};
 const used={WR:0,TE:0,FB:0};
 let positions=eligible.map(role=>places[role][used[role]++]||[-40,100]);
 const receivers=eligible.map((role,i)=>role==="WR"?i:-1).filter(i=>i>=0);
 const tightEnds=eligible.map((role,i)=>role==="TE"?i:-1).filter(i=>i>=0);
 const fullback=eligible.indexOf("FB");
 // All named sets have a deliberate silhouette. Right means bottom of the screen.
 if(/Trips|Trey/.test(variant)&&receivers.length>=3){
  positions[receivers[0]]=[-13,-151];
  positions[receivers[1]]=[-13,151];
  positions[receivers[2]]=[-13,112];
  if(receivers.length>3)positions[receivers[3]]=[-42,126];
  if(tightEnds.length)positions[tightEnds[0]]=[-15,86];
 }
 if(/Bunch/.test(variant)&&receivers.length>=2){
  positions[receivers[0]]=[-13,-151];
  positions[receivers[1]]=[-13,148];
  if(receivers.length>2)positions[receivers[2]]=[-42,124];
  if(tightEnds.length)positions[tightEnds[0]]=[-44,95];
 }
 if(/Doubles|Spread/.test(variant)&&receivers.length>=3){
  positions[receivers[0]]=[-13,-151];positions[receivers[1]]=[-13,151];
  positions[receivers[2]]=[-13,-108];
  if(receivers.length>3)positions[receivers[3]]=[-13,108];
 }
 if(/Empty/.test(variant)){
  formations[6]=[-13,-110];offensiveLabels[6]="WR";
  if(receivers.length){positions[receivers[0]]=[-13,-151];if(receivers.length>1)positions[receivers[1]]=[-13,151];if(receivers.length>2)positions[receivers[2]]=[-13,110]}
  if(tightEnds.length)positions[tightEnds[0]]=[-13,85];
 }
 if(/Wing|Tight/.test(variant)&&!/Twin TE/.test(variant)){
  if(tightEnds.length)positions[tightEnds[0]]=[-17,-86];
  if(receivers.length>=2){positions[receivers[0]]=[-13,-120];positions[receivers[1]]=[-13,120]}
 }
 if(/Twin TE/.test(variant)&&tightEnds.length>=1){
  positions[tightEnds[0]]=[-16,-86];
  if(tightEnds.length>=2)positions[tightEnds[1]]=[-16,86];
 }
 if(underCenter){
  formations[6]=[-87,0];
  if(fullback>=0)positions[fullback]=[-48,formation==="Strong I"?26:formation==="Weak I"?-26:0];
 }
 if(formation==="Goal Line"){
  formations[6]=[-72,0];
  tightEnds.forEach((i,n)=>positions[i]=[-10,n%2===0?-56:56]);
  if(fullback>=0)positions[fullback]=[-43,0];
 }
 // Keep exact eleven-player counts and avoid overlapping markers.
 const placed=[...formations];
 positions.forEach((point,i)=>{
  let [px,py]=point;
  for(let tries=0;tries<15&&placed.some(([ox,oy])=>Math.hypot(px-ox,py-oy)<17);tries++){
   px-=tries%2===0?12:0;
   py=Math.max(-164,Math.min(164,py+(py>=0?1:-1)*18));
  }
  placed.push([px,py]);formations.push([px,py]);offensiveLabels.push(eligible[i]);
 });
 const df=packageInfo.defense||"4-3",isGoal=/Goal Line|5-3|6-2/.test(df),isDime=/Dime|3-2-6|4-1-6/.test(df),isNickel=/Nickel|3-3-5|Big Nickel|2-4-5|4-2-5/.test(df);
 const frontCount=/6-2/.test(df)?6:/5-3/.test(df)?5:/3-4|3-3-5|3-2-6/.test(df)?3:4;
 const lbCount=/6-2/.test(df)?2:/5-3/.test(df)?3:isDime?(frontCount===3?2:1):isNickel?(frontCount===3?3:2):frontCount===3?4:3;
 const defenders=[],defensiveLabels=[];
 const over=/Over|Bear/.test(df),under=/Under/.test(df),stack=/Stack/.test(df);
 const offset=over?19:under?-19:0;
 for(let i=0;i<frontCount;i++){
  const dy=(i-(frontCount-1)/2 )*(frontCount>=5?20:frontCount===4?29:39)+offset;
  defenders.push([12,dy]);defensiveLabels.push("DL");
 }
 for(let i=0;i<lbCount;i++){
  const dy=(i-(lbCount-1)/2 )*(lbCount>=4?35:lbCount===3?49:64)+(over?14:under?-14:0);
  defenders.push([stack?53:isGoal?30:47,dy]);defensiveLabels.push("LB");
 }
 const dbCount=11-defenders.length;
 // Cornerbacks align opposite outside receivers; safeties are deeper.
 for(let i=0;i<dbCount;i++){
  const spots=isGoal?[[35,-113],[35,113],[61,0]]:dbCount===6?[[68,-151],[68,151],[105,-100],[105,100],[151,-50],[151,50]]:dbCount===5?[[70,-151],[70,151],[104,0],[155,-73],[155,73]]:dbCount===4?[[70,-151],[70,151],[157,-75],[157,75]]:[[70,-151],[70,151],[155,0]];
  defenders.push(spots[i]||[155,(i-2)*40]);defensiveLabels.push(i<2?"CB":i<4?"S":"DB");
 }
 // Red-zone camera geometry: a defense backed up near its goal line must
 // fit between the line of scrimmage and the back of the end zone.
 // The field SVG ends at x=930; reserve marker radius and padding.
 const endZoneBackX=930;
 const yardsToGoal=Math.max(1,100-yard);
 if(yardsToGoal<=12){
  // Near the goal line: linemen crowd the ball, linebackers step up,
  // and safeties stay in the end zone rather than beyond its back boundary.
  const depthLimit=Math.max(20,endZoneBackX-ballX-12);
  const goalDepth=depthLimit<100;
  defenders.forEach((p,i)=>{
   const layer=i<frontCount?0:i<frontCount+lbCount?1:2;
   const target=layer===0?Math.min(12,depthLimit*.23):layer===1?Math.min(isGoal?30:42,depthLimit*.52):Math.min(isGoal?57:73,depthLimit*.82);
   p[0]=Math.max(10,Math.min(depthLimit,target));
   if(goalDepth&&layer===2){
    // Deep defenders stagger slightly, retaining a visible safety shell.
    p[0]=Math.min(depthLimit,p[0]+((i-frontCount-lbCount)%2)*9);
   }
  });
 }
 // Backed up at our own goal line, keep QB and backs inside the field.
 if(yard<=12){
  const minDepth=62-ballX+9;
  formations.forEach(p=>{p[0]=Math.max(minDepth,p[0])});
 }
 // Choreographed broadcast motion is illustrative; game engine outcomes remain authoritative.
 const message=l.events[0]?.message||"";
 const call=l.calledPlay?.play||{},concept=String(call.concept||"");
 const coverage=String(l.calledPlay?.defense?.concept||"");
 const declaredKind=l.formation?.playType||call.kind||"";
 const snapType=l.specialTeams?(l.specialTeams.type==="punt"?"punt":"kickoff"):
   /SACKED/i.test(message)?"sack":/intercepted/i.test(message)?"interception":
   /field goal/i.test(message)?"fieldgoal":/incomplete|broken up/i.test(message)?"incomplete":
   declaredKind==="Pass"||declaredKind==="pass"?"pass":declaredKind==="Kneel"?"kneel":
   /pass|throws|completes/i.test(message)?"pass":/kneel/i.test(message)?"kneel":"run";
 const gainMatch=message.match(/(?:gain(?:s|ed)?|for)\\s+(-?\\d+)\\s+yards?/i);
 const gain=gainMatch?Number(gainMatch[1]):0;
 const distance=Math.max(-65,Math.min(180,gain*7.04));
 const animationDuration=Math.max(1.1,Math.min(4.8,(WFF_LIVE_SPEED?.[l.speed]||4000)/1000*.72));
 const passPlay=["pass","incomplete","interception","sack"].includes(snapType);
 const runDirection=/Toss|Sweep|Stretch|Outside Zone/.test(concept)?1:/Counter|Power O|Trap/.test(concept)?-1:0;
 const isBlitz=/Blitz|Pressure|Double A/.test(coverage),isZone=/Zone|Cover 2|Cover 3|Cover 4|Cover 6|Tampa|Quarters/.test(coverage);
 const route=(role,index)=>{
  const sign=index%2?-1:1;
  if(/Four Verticals/.test(concept))return [125,sign*9];
  if(/Slants|Quick Outs/.test(concept))return [50,/Outs/.test(concept)?sign*42:-sign*42];
  if(/Mesh|Shallow Cross/.test(concept))return [57,-sign*90];
  if(/Screens/.test(concept))return [-22,sign*40];
  if(/Curl Flat|Stick|Spacing/.test(concept))return [58,sign*18];
  if(/Corner|Smash|Sail|Flood/.test(concept))return [95,sign*55];
  if(/Post|Dagger|Deep Over|Y Cross/.test(concept))return [125,-sign*42];
  if(/Drive|Levels/.test(concept))return [78,-sign*42];
  if(/Boot|Play Action/.test(concept))return [110,-sign*35];
  return [80,sign*30];
 };
 const dot=(px,py,color,outline,label,dx,dy,delay)=>{
  const cx=Math.max(62,Math.min(918,px)),cy=Math.max(43,Math.min(377,py));
  const mx=Math.max(62,Math.min(918,cx+dx))-cx,my=Math.max(43,Math.min(377,cy+dy))-cy;
  return '<g class="wff-play-actor" style="--move-x:'+mx+'px;--move-y:'+my+'px;--play-delay:'+delay+'s;--play-duration:'+animationDuration+'s"><circle cx="'+cx+'" cy="'+cy+'" r="7.2" fill="'+color+'" stroke="'+outline+'" stroke-width="1.6"/><text x="'+cx+'" y="'+(cy+2.6)+'" fill="#fff" text-anchor="middle" font-family="system-ui" font-size="6.3" font-weight="800">'+label+'</text></g>';
 };
 formations.forEach(([dx,dy],i)=>{
  const line=i<5,qb=i===5,runner=i===6,role=offensiveLabels[i]||"WR";
  let mx=0,my=0;
  if(line){mx=passPlay?-9:14;my=passPlay?0:runDirection*(i-2)*5}
  else if(qb){mx=passPlay?-23:snapType==="kneel"?-3:runDirection===0?10:3;my=passPlay&&/Boot/.test(concept)?30:0}
  else if(runner){
   if(passPlay){mx=/Screens/.test(concept)?26:10;my=/Screens/.test(concept)?runDirection*32:14}
   else{mx=Math.max(24,distance);my=runDirection*44}
  }else if(!passPlay){mx=role==="FB"?25:12;my=role==="FB"?runDirection*22:0}
  else [mx,my]=route(role,i-7);
  players.push(dot(ballX+dx,210+dy,oc[0],oc[1],role,mx,my,i<5?0:.12));
 });
 defenders.forEach(([dx,dy],i)=>{
  const front=i<frontCount,back=i>=frontCount+lbCount;
  let mx=front?-22:back?-35:-32,my=front?runDirection*7:(i%2?16:-16);
  if(passPlay){
   mx=front?(isBlitz?-43:-29):back?(isZone?0:-13):(isBlitz?-35:isZone?4:-12);
   my=back?(isZone?(i%2?14:-14):(i%2?27:-27)):my;
  }
  if(snapType==="sack")mx=front?-43:-20;
  if(!passPlay){mx=front?-16:back?-35:-27;my=runDirection*28+(i%2?8:-8)}
  players.push(dot(ballX+dx,210+dy,dc[0],dc[1],defensiveLabels[i],mx,my,.18));
 });
 const visual=l.playVisual?.side===l.possession?l.playVisual:null;
 const result=visual?.kind||snapType;
 const qbPoint=formations[5]||[-20,0],hbPoint=formations[6]||[-65,0];
 const receiverIndex=7+Math.abs(dnaHash(String(concept)))%4;
 const targetPoint=formations[receiverIndex]||formations[7]||[-9,-120];
 const routePoint=route(offensiveLabels[receiverIndex]||"WR",receiverIndex-7);
 let handX=hbPoint[0],handY=hbPoint[1],endX=hbPoint[0]+Math.max(24,distance),endY=hbPoint[1]+runDirection*44;
 if(result==="kneel"||result==="sack"){handX=qbPoint[0];handY=0;endX=qbPoint[0]+(result==="sack"?-24:-3);endY=0}
 if(["complete","pass","incomplete","interception","throwaway"].includes(result)){
  handX=qbPoint[0]-18;handY=0;endX=targetPoint[0]+routePoint[0];endY=targetPoint[1]+routePoint[1];
  if(result==="incomplete"){endX+=25;endY+=24}
  if(result==="throwaway"){endX=80;endY=220}
 }
 if(result==="fumble"){endX=hbPoint[0]+38;endY=hbPoint[1]+38}
 const clampX=v=>Math.max(62,Math.min(918,ballX+v))-ballX;
 const clampY=v=>Math.max(43,Math.min(377,210+v))-210;
 const passResult=["complete","incomplete"].includes(result);
 const startPX=Math.max(62,Math.min(918,ballX+qbPoint[0]-18)),startPY=210;
 const endPX=Math.max(62,Math.min(918,ballX+endX)),endPY=Math.max(43,Math.min(377,210+endY));
 const passGuide=passResult?'<line class="wff-pass-guide" x1="'+startPX+'" y1="'+startPY+'" x2="'+endPX+'" y2="'+endPY+'" stroke="#f7e6ad" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 10" opacity=".9"/>':'';
 const outcomeMark=passResult?'<g class="wff-pass-result" transform="translate('+(Math.max(67,Math.min(913,endPX+17)))+' '+(Math.max(55,Math.min(365,endPY-17)))+')"><circle r="14" fill="'+(result==="complete"?"#147a45":"#a9252a")+'" stroke="#fff" stroke-width="2"/><path d="'+(result==="complete"?"M-7 0 L-2 5 L8 -6":"M-6 -6 L6 6 M6 -6 L-6 6")+'" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></g>':'';
 const ball='<g class="wff-tracked-ball" style="--ball-start-x:'+clampX(qbPoint[0])+'px;--ball-start-y:'+clampY(qbPoint[1])+'px;--ball-hand-x:'+clampX(handX)+'px;--ball-hand-y:'+clampY(handY)+'px;--ball-end-x:'+clampX(endX)+'px;--ball-end-y:'+clampY(endY)+'px;--play-duration:'+animationDuration+'s"><ellipse cx="'+ballX+'" cy="210" rx="7" ry="4" fill="#7d4524" stroke="#fff" stroke-width="1.4"/><path d="M'+(ballX-3)+' 210h6" stroke="#fff" stroke-width="1.3"/></g>';
 return '<section class="panel wff-field-panel"><h2>Live Field • '+esc(teamLabel(off))+' on offense</h2><p><strong>'+esc(packageInfo.formation+' '+variant)+' • '+esc(packageInfo.personnel)+' personnel</strong> vs <strong>'+esc(packageInfo.defense)+' defense</strong></p>'+scoreboard+'<div class="wff-field-wrap">'+highlightMarkup+kickOverlay+'<svg viewBox="0 0 980 420" role="img" aria-label="2D football field with player formations, ball at yard '+yard+' and first down at yard '+first+'" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="980" height="420" rx="14" fill="#102b21"/><rect x="50" y="30" width="880" height="360" fill="#246d43"/><rect x="50" y="30" width="88" height="360" fill="'+oc[1]+'" opacity=".7"/><rect x="842" y="30" width="88" height="360" fill="'+dc[1]+'" opacity=".7"/>'+markers+'<line x1="50" y1="30" x2="930" y2="30" stroke="#fff" stroke-width="4"/><line x1="50" y1="390" x2="930" y2="390" stroke="#fff" stroke-width="4"/><line x1="'+ballX+'" y1="30" x2="'+ballX+'" y2="390" stroke="#53baff" stroke-width="3"/><line x1="'+firstX+'" y1="30" x2="'+firstX+'" y2="390" stroke="#ffd04d" stroke-width="4" stroke-dasharray="12 7"/>'+players.join("")+passGuide+ball+outcomeMark+'<text x="94" y="210" transform="rotate(-90 94 210)" font-size="38" font-family="system-ui, sans-serif" letter-spacing="1" font-weight="950" text-anchor="middle" textLength="290" lengthAdjust="spacingAndGlyphs" fill="#fff">'+esc(home.city)+'</text><text x="886" y="210" transform="rotate(90 886 210)" font-size="38" font-family="system-ui, sans-serif" letter-spacing="1" font-weight="950" text-anchor="middle" textLength="290" lengthAdjust="spacingAndGlyphs" fill="#fff">'+esc(away.city)+'</text></svg></div><div class="wff-field-key"><span><i style="background:'+oc[0]+'"></i> '+esc(off.city)+' offense</span><span><i style="background:'+dc[0]+'"></i> '+esc(def.city)+' defense</span><span>🔵 Line of scrimmage</span><span>🟡 First down</span></div><div class="wff-inline-play-feed" aria-live="polite"><h3>Live Play-by-Play</h3>'+l.events.slice(0,10).map((event,i)=>'<div class="wff-inline-play'+(i===0?' wff-inline-play-latest':'')+'"><span class="wff-inline-play-time">Q'+event.q+' '+event.time+'</span><span>'+esc(event.message)+'</span></div>').join('')+'</div></section>';
}
