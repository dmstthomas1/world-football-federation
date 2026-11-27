"use strict";
const WFF_FIELD_RECEIVER_ROLES={"10":["WR","WR","WR","WR"],"11":["WR","WR","WR","TE"],"12":["WR","WR","TE","TE"],"21":["WR","WR","TE","FB"],"22":["WR","TE","TE","FB"],"23":["TE","TE","TE","FB"]};
// Lightweight SVG broadcast field driven by the live simulator state.
function wffFieldStatus(l){
 if(l.complete)return "Final";
 const kick=l.specialTeams;
 if(!kick)return wffFieldDown(l);
 if(kick.phase==="touchdown")return "Touchdown";
 if(kick.phase==="conversion")return kick.goTwo?"Two-point try":"Extra point";
 if(kick.phase==="scoreHold")return kick.type==="safety"?"Safety":"Scoring play";
 return kick.type==="punt"?"Punt":kick.type==="safety"?"Free kick":"Kickoff";
}
const WFF_MOMENT_TITLES={
 touchdown:"Touchdown!", "field-goal":"Field goal good!", "missed-field-goal":"Field goal missed",
 safety:"Safety!", sack:"Sack!", interception:"Interception!", fumble:"Fumble recovered!"
};
function wffMomentView(moments){
 if(!moments?.length)return "";
 const main=moments.at(-1),additional=moments.slice(0,-1);
 return '<div class="wff-big-moment wff-big-moment-'+main.kind+'" role="status" aria-label="'+esc(WFF_MOMENT_TITLES[main.kind])+'">'+
  '<span>'+esc(main.team)+'</span><strong>'+esc(WFF_MOMENT_TITLES[main.kind])+'</strong>'+
  (main.detail?'<small>'+esc(main.detail)+'</small>':'')+
  additional.map(moment=>'<small>'+esc(WFF_MOMENT_TITLES[moment.kind]+(moment.detail?" "+moment.detail:""))+'</small>').join("")+'</div>';
}
function wffFieldView(l){
 const snap=l.snapLineup;
 const side=snap?.possession??l.possession,off=side===0?l.us:l.opp,def=side===0?l.opp:l.us;
 // Stadium ends belong to teams for the entire quarter, not to the current offense.
 const home=l.matchup.home===l.us.id?l.us:l.opp,away=l.matchup.away===l.us.id?l.us:l.opp;
 const quarterSwap=(snap?.quarter??l.clock.quarter)%2===0;
 const leftTeam=quarterSwap?home:away,rightTeam=quarterSwap?away:home;
 const attackingRight=off.id===leftTeam.id;
 const leftColors=wffColors(leftTeam),rightColors=wffColors(rightTeam);
 // Keep the same marker colors for each team when possession changes.
 const markerColors=team=>team.id===home.id?["#c51f36","#ffffff"]:["#ffffff","#111318"];
 const oc=markerColors(off),dc=markerColors(def),yard=Math.max(1,Math.min(99,snap?.field??l.field)),first=Math.min(100,yard+(snap?.toGo??l.toGo));
 const x=y=>138+y*7.04,ballX=x(yard),firstX=x(first);
 const packageInfo=snap?.formation||{formation:"Singleback",personnel:"11",defense:l.schemes[1-side].front};
 const homeScore=l.matchup.home===l.us.id?l.score[0]:l.score[1],awayScore=l.matchup.away===l.us.id?l.score[0]:l.score[1];
 const clock=l.clock,seconds=Math.max(0,Math.floor(clock.remaining||0)),clockText=Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0");
 const period=clock.quarter>4?"OT":"Q"+clock.quarter;
 const awaySide=away.id===l.us.id?0:1,homeSide=home.id===l.us.id?0:1;
 const standings=wffStandings(l.state);
 const record=t=>{const r=standings[t.id];return r?r.w+"-"+r.l+(r.t?"-"+r.t:""):"0-0"};
 const timeoutDots=n=>'<span class="wff-timeout-dots" aria-label="'+n+' timeouts remaining">'+Array.from({length:3},(_,i)=>'<i class="'+(i<n?'available':'used')+'"></i>').join('')+'</span>';
 const scoreboard='<div class="wff-field-scoreboard" role="group" aria-label="Live game scoreboard"><div class="wff-field-team">'+(l.possession===awaySide?'<span class="wff-possession" title="Possession" aria-label="Ball possession">🏈</span>':'')+'<span class="wff-field-logo">'+wffLogo(away,38)+'</span><span class="wff-field-team-name">'+esc(teamLabel(away))+'</span><span class="wff-score-stack"><b>'+awayScore+'</b><small class="wff-score-record">'+record(away)+'</small></span>'+timeoutDots(clock.timeouts[awaySide])+'</div><div class="wff-field-center"><strong>'+period+' • '+clockText+'</strong><span>'+esc(wffFieldStatus(l))+'</span></div><div class="wff-field-team wff-field-home">'+timeoutDots(clock.timeouts[homeSide])+'<span class="wff-score-stack"><b>'+homeScore+'</b><small class="wff-score-record">'+record(home)+'</small></span><span class="wff-field-team-name">'+esc(teamLabel(home))+'</span><span class="wff-field-logo">'+wffLogo(home,38)+'</span>'+(l.possession===homeSide?'<span class="wff-possession" title="Possession" aria-label="Ball possession">🏈</span>':'')+'</div></div>';
 const result=l.playResult||{message:l.specialTeams?.phase==="conversion"?(l.specialTeams.goTwo?"Two-point conversion attempt.":"Extra point attempt."):l.events[0]?.message||"Teams are lining up."};
 const resultMarkup='<div class="wff-field-play-summary" role="status" aria-live="polite" aria-atomic="true"><strong>'+esc(result.message)+'</strong>'+(result.next?'<span>'+esc(result.next)+'</span>':'')+'</div>';
 const markers=Array.from({length:11},(_,i)=>i*10).map(y=>'<line x1="'+x(y)+'" y1="30" x2="'+x(y)+'" y2="390" stroke="#ffffff" stroke-opacity=".4" stroke-width="2"/>').join("");
 // Yard numbers are stadium markings, not offense-relative objects: never mirror glyphs.
 const yardLabels=Array.from({length:9},(_,i)=>(i+1)*10).map(y=>'<text x="'+x(y)+'" y="218" fill="#ffffff" fill-opacity=".6" font-size="19" text-anchor="middle">'+(y<=50?y:100-y)+'</text>').join("");
 const players=[];
 const formation=packageInfo.formation||"Singleback",variant=snap?.variant??(formation==="Singleback"?"Ace":""),personnel=packageInfo.personnel||"11";
 // Gameplay is drawn in offense-relative coordinates and mirrored when attacking left.
 // Keep all 11 players separated by at least a visible marker diameter.
 const lineY=[-38,-19,0,19,38];
 const formations=lineY.map(dy=>[-12,dy]);
 const offensiveLabels=["LT","LG","C","RG","RT"];
 const shotgun=/Shotgun/.test(formation),pistol=/Pistol/.test(formation),underCenter=/I-Form|Strong I|Weak I/.test(formation);
 formations.push([shotgun?-47:pistol?-36:-30,0]);offensiveLabels.push("QB");
 const rb=shotgun?[-60,27]:pistol?[-75,0]:underCenter?[-83,0]:[-63,0];
 formations.push(rb);offensiveLabels.push("HB");
 // The remaining four positions reflect the actual personnel package.
 // Assign positions by personnel, then use named formation templates rather than random spreading.
 const eligible=WFF_FIELD_RECEIVER_ROLES[personnel]||WFF_FIELD_RECEIVER_ROLES["11"];
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
 const frontCount=/2-4-5/.test(df)?2:/6-2/.test(df)?6:/5-3/.test(df)?5:/3-4|3-3-5|3-2-6/.test(df)?3:4;
 const lbCount=/6-2/.test(df)?2:/5-3/.test(df)?3:isDime?(frontCount===3?2:1):isNickel?(6-frontCount):frontCount===3?4:3;
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
 // Keep the outline and silhouette identical on both sides of the ball.
 const radius=7.2,outline=1.6,spacing=2*radius+outline+1;
 const centers=[];
 const dot=(px,py,[color,textColor],label)=>{
  const cx=Math.max(62,Math.min(918,px));
  const baseY=Math.max(43,Math.min(377,py));
  let cy=baseY;
  // Edge compression can move two players to the same depth. Clear the overlap laterally.
  for(let step=1;centers.some(([x,y])=>Math.hypot(cx-x,cy-y)<spacing)&&step<=76;step++){
   cy=baseY+(step%2===0?-1:1)*Math.ceil(step/2)*9;
   cy=Math.max(43,Math.min(377,cy));
  }
  centers.push([cx,cy]);
  const readable=attackingRight?"":' transform="translate('+(2*cx)+' 0) scale(-1 1)"';
  return '<g class="wff-player-marker"><circle cx="'+cx+'" cy="'+cy+'" r="'+radius+'" fill="'+color+'" stroke="#111318" stroke-width="'+outline+'"/><text x="'+cx+'" y="'+(cy+2.6)+'"'+readable+' fill="'+textColor+'" text-anchor="middle" font-family="system-ui" font-size="6.3" font-weight="800">'+label+'</text></g>';
 };
 formations.forEach(([dx,dy],i)=>players.push(dot(ballX+dx,210+dy,oc,offensiveLabels[i])));
 defenders.forEach(([dx,dy],i)=>players.push(dot(ballX+dx,210+dy,dc,defensiveLabels[i])));
 const ball='<ellipse cx="'+ballX+'" cy="210" rx="2.5" ry="5" fill="#7d4524" stroke="#fff" stroke-width="1.4"/>';
 const orientation=attackingRight?'':'translate(980 0) scale(-1 1)';
 return '<section class="panel wff-field-panel"><h2>Live Field • '+esc(teamLabel(off))+' on offense</h2><p>'+(snap?"At the snap · ":"")+'<strong>'+esc([formation,variant].filter(Boolean).join(' '))+' • '+esc(packageInfo.personnel)+' personnel</strong> vs <strong>'+esc(packageInfo.defense)+' defense</strong>'+(snap?.quarterback?' · QB '+esc(snap.quarterback):'')+'</p>'+scoreboard+'<div class="wff-field-wrap"><svg viewBox="0 0 980 420" role="img" aria-label="2D football field with player formations, ball at yard '+yard+' and first down at yard '+first+'" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="980" height="420" rx="14" fill="#102b21"/><rect x="50" y="30" width="880" height="360" fill="#246d43"/><rect x="50" y="30" width="88" height="360" fill="'+leftColors[1]+'" opacity=".7"/><rect x="842" y="30" width="88" height="360" fill="'+rightColors[1]+'" opacity=".7"/><g transform="'+orientation+'">'+markers+'<line x1="50" y1="30" x2="930" y2="30" stroke="#fff" stroke-width="4"/><line x1="50" y1="390" x2="930" y2="390" stroke="#fff" stroke-width="4"/><line x1="'+ballX+'" y1="30" x2="'+ballX+'" y2="390" stroke="#53baff" stroke-width="3"/><line x1="'+firstX+'" y1="30" x2="'+firstX+'" y2="390" stroke="#ffd04d" stroke-width="4" stroke-dasharray="12 7"/></g>'+yardLabels+'<text x="94" y="210" transform="rotate(-90 94 210)" font-size="38" font-family="system-ui, sans-serif" letter-spacing="1" font-weight="950" text-anchor="middle" textLength="290" lengthAdjust="spacingAndGlyphs" fill="#fff">'+esc(leftTeam.city)+'</text><text x="886" y="210" transform="rotate(90 886 210)" font-size="38" font-family="system-ui, sans-serif" letter-spacing="1" font-weight="950" text-anchor="middle" textLength="290" lengthAdjust="spacingAndGlyphs" fill="#fff">'+esc(rightTeam.city)+'</text><g transform="'+orientation+'">'+(l.specialTeams&&!snap?'':players.join("")+ball)+'</g></svg>'+wffMomentView(l.moments)+'</div>'+resultMarkup+'<div class="wff-field-key"><span><i style="background:'+oc[0]+'"></i> '+esc(off.city)+' offense</span><span><i style="background:'+dc[0]+'"></i> '+esc(def.city)+' defense</span><span>🔵 Line of scrimmage</span><span>🟡 First down</span></div></section>';
}
