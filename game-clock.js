"use strict";
// Scrimmage clock rules and situational coaching decisions.
const WFF_QUARTER_SECONDS=900;
function wffClockCreate(){return {quarter:1,remaining:900,playClock:40,possessions:0,events:[],timeouts:[3,3],twoMinuteWarning:[false,false],score:[0,0],possession:0,down:1,toGo:10,fieldPosition:25,running:false}}
function wffClockTime(n){return Math.floor(n/60)+":"+String(n%60).padStart(2,"0")}
function wffClockSnap(c,kind,opts={}){
 const before=c.remaining;const duration=kind==="pass_complete"?Math.min(12,opts.duration||6):kind==="run"?Math.min(12,opts.duration||6):kind==="kneel"?1:kind==="spike"?1:kind==="pass_incomplete"?Math.min(8,opts.duration||5):Math.min(12,opts.duration||5);
 c.remaining=Math.max(0,c.remaining-duration);
 const stopsOnSnap=["pass_incomplete","spike","score","turnover","kick","penalty"].includes(kind);
 const lateBoundary=(c.quarter===2&&c.remaining<=120)||(c.quarter===4&&c.remaining<=300)||c.quarter>4;
 // Outside the late-half boundary, an out-of-bounds play restarts on the ready signal.
 c.running=c.remaining>0&&!stopsOnSnap&&!(opts.outOfBounds&&lateBoundary);
 if(wffClockWarningDue(c)&&before>120&&c.remaining<=120){c.warningPending=true;c.running=false}
 c.playClock=["turnover","kick","penalty","score"].includes(kind)?25:40;
 const event={quarter:c.quarter,before,after:c.remaining,kind,stopped:!c.running,playClock:c.playClock};
 c.events.push(event);return event;
}
function wffClockRunoff(c,seconds){const n=Math.max(0,Math.min(c.remaining,seconds));c.remaining-=n;return n}
function wffClockBetweenPlays(c,opts={}){
 if(!c.running)return 0;
 const runoff=Math.min(c.playClock-1,opts.hurry?Math.max(5,Math.round(opts.seconds||11)):Math.max(12,Math.round(opts.seconds||32)));
 return wffClockRunoff(c,runoff);
}
function wffClockWarningDue(c){
 const half=c.quarter===2?0:c.quarter===4?1:-1;
 return half>=0&&!c.twoMinuteWarning[half];
}
function wffClockStop(c){c.running=false;c.playClock=25}
function wffClockWarning(c){
 c.twoMinuteWarning[c.quarter===2?0:1]=true;
 c.warningPending=false;
 wffClockStop(c);
}
function wffClockCanKneel(c,lead,opponentTimeouts){
 if(lead<=0||c.quarter!==4)return false;
 let seconds=c.remaining,timeouts=opponentTimeouts||0,warning=wffClockWarningDue(c)&&seconds>120;
 // A knee uses one second. The defense can stop the runoff, and the warning can cut it short.
 for(let down=c.down;down<=3;down++){
  if(--seconds<=0)return true;
  if(warning&&seconds===120){warning=false;continue}
  if(timeouts>0){timeouts--;continue}
  if(warning&&seconds-39<=120){seconds=120;warning=false;continue}
  seconds-=39;
  if(seconds<=0)return true;
 }
 return false;
}
function wffClockChoose(c,lead,opponentTimeouts){
 if(wffClockCanKneel(c,lead,opponentTimeouts))return "kneel";
 if((c.quarter===2&&c.remaining<=150)||(c.quarter>=4&&lead<=0&&c.remaining<=360))return "hurry";
 if(c.quarter===4&&lead>0&&c.remaining<=480)return "drain";
 return "normal";
}
function wffClockTimeoutDecision({quarter,seconds,lead,ownTimeouts,opponentHasBall,clockRunning,down=1,toGo=10,field=50,warningAvailable=false,wait=39,inKickRange=false}){
 if(ownTimeouts<=0||!clockRunning||seconds<=0||quarter<2||quarter===3)return false;
 // Near 2:00 the automatic stoppage can do the same job without spending a timeout.
 const warningWait=warningAvailable&&seconds>120?seconds-120:Infinity;
 if(warningWait<=wait&&warningWait<=12)return false;
 if(opponentHasBall){
  if(quarter===2)return lead<=0&&field<=62&&down>=3&&seconds>=15&&seconds<=95;
  if(quarter!==4||lead>=0)return false;
  const window=lead<=-9?330+20*ownTimeouts:190+20*ownTimeouts;
  // Even on first down, stopping early can save a full play clock before the warning.
  return seconds<=window&&(down<4||seconds<=200||lead<=-9);
 }
 if(quarter===4&&lead>0)return false;
 const canAttemptKick=inKickRange&&(quarter===2||lead>=-3);
 if(lead===0&&quarter>=4&&!canAttemptKick&&field<45)return false;
 if(seconds<=wait+5)return true;
 const neededPlays=canAttemptKick?(down>=3?1:2):Math.max(2,Math.ceil((100-field)/16));
 const timeNeeded=neededPlays*13+6+(lead<=-9&&quarter===4?32:0)+(down>=3&&toGo>=8?5:0);
 return seconds<=Math.min(120,timeNeeded+wait)||(quarter===4&&lead<0&&seconds<=52);
}
function wffClockSnapWait({quarter,seconds,lead,tempo="normal",random=Math.random}){
 if(quarter===4&&lead>0&&seconds<=480)return 39;
 if(quarter===2&&seconds<=150)return 8+Math.floor(random()*4);
 if(quarter>=4&&lead<=0&&seconds<=360)return 7+Math.floor(random()*5);
 if(tempo==="hurry")return 12+Math.floor(random()*9);
 if(tempo==="drain")return 39;
 return 30+Math.floor(random()*10);
}
function wffClockEndQuarter(c){if(c.remaining>0)return false;if(c.quarter>=4)return true;c.quarter++;c.remaining=WFF_QUARTER_SECONDS;wffClockStop(c);if(c.quarter===3)c.timeouts=[3,3];return false}
function wffClockView(c){return '<section class="panel"><h2>Automatic Clock Management — Prototype</h2><div class="grid"><div class="stat"><small>Quarter</small><b>Q'+c.quarter+'</b></div><div class="stat"><small>Game clock</small><b>'+wffClockTime(c.remaining)+'</b></div><div class="stat"><small>Play clock</small><b>'+c.playClock+'s</b></div><div class="stat"><small>Timeouts</small><b>'+c.timeouts[0]+' / '+c.timeouts[1]+'</b></div></div><p class="muted">CPU-only decisions. Incompletions stop the game clock; completed plays normally keep it running. Late-half decisions consider score, field position, timeouts and the two-minute warning.</p></section>'}
