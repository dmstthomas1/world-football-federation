"use strict";
// WFF clock prototype. Regulation only; simplified NFL-inspired timing.
const WFF_QUARTER_SECONDS=900;
function wffClockCreate(){return {quarter:1,remaining:900,playClock:40,possessions:0,events:[],timeouts:[3,3],twoMinuteWarning:[false,false],score:[0,0],possession:0,down:1,toGo:10,fieldPosition:25,running:false}}
function wffClockTime(n){return Math.floor(n/60)+":"+String(n%60).padStart(2,"0")}
function wffClockSnap(c,kind,opts={}){
 const before=c.remaining;const duration=kind==="pass_complete"?Math.min(12,opts.duration||6):kind==="run"?Math.min(12,opts.duration||6):kind==="kneel"?1:kind==="spike"?1:kind==="pass_incomplete"?Math.min(8,opts.duration||5):Math.min(12,opts.duration||5);
 c.remaining=Math.max(0,c.remaining-duration);
 const stopped=["pass_incomplete","spike","timeout","score","turnover"].includes(kind)||opts.outOfBounds===true;
 c.running=!stopped;
 c.playClock=kind==="timeout"?25:40;
 const event={quarter:c.quarter,before,after:c.remaining,kind,stopped,playClock:c.playClock};
 c.events.push(event);return event;
}
function wffClockRunoff(c,seconds){const n=Math.max(0,Math.min(c.remaining,seconds));c.remaining-=n;return n}
function wffClockBetweenPlays(c,opts={}){
 if(!c.running)return 0;
 const runoff=Math.min(c.playClock-1,opts.hurry?Math.max(5,Math.round(opts.seconds||11)):Math.max(12,Math.round(opts.seconds||32)));
 return wffClockRunoff(c,runoff);
}
function wffClockCanKneel(c,lead,opponentTimeouts){
 if(lead<=0||c.quarter!==4)return false;
 // Each kneel consumes ~40 seconds if the defense cannot stop the clock.
 const downsRemaining=Math.max(0,4-c.down);
 const clockBurn=downsRemaining*39-Math.min(opponentTimeouts,downsRemaining)*39;
 return c.remaining<=Math.max(0,clockBurn);
}
function wffClockChoose(c,lead,opponentTimeouts,fieldPosition){
 if(wffClockCanKneel(c,lead,opponentTimeouts))return "kneel";
 if(c.quarter===4&&lead<0&&c.remaining<120)return "hurry";
 if(c.quarter===4&&lead>0&&c.remaining<300)return "drain";
 if((c.quarter===2||c.quarter===4)&&c.remaining<120)return "two-minute";
 return "normal";
}
function wffClockEndQuarter(c){if(c.remaining>0)return false;if(c.quarter>=4)return true;c.quarter++;c.remaining=900;c.playClock=40;c.running=false;if(c.quarter===3)c.timeouts=[3,3];return false}
function wffClockView(c){return '<section class="panel"><h2>Automatic Clock Management — Prototype</h2><div class="grid"><div class="stat"><small>Quarter</small><b>Q'+c.quarter+'</b></div><div class="stat"><small>Game clock</small><b>'+wffClockTime(c.remaining)+'</b></div><div class="stat"><small>Play clock</small><b>'+c.playClock+'s</b></div><div class="stat"><small>Timeouts</small><b>'+c.timeouts[0]+' / '+c.timeouts[1]+'</b></div></div><p class="muted">CPU-only decisions. Incompletions stop the game clock; completed plays normally keep it running. The full drive engine and complete NFL timing exceptions are still being built.</p></section>'}
