"use strict";
// Alpha 0.4.1: staged CPU-only exhibition viewer. League scores are fictional weekly previews,
// not results from a persistent 32-team season schedule.
let wffLive=null,wffLiveTimer=null;
const WFF_LIVE_SPEED={slow:7500,medium:4000,fast:2000};
function wffLiveStop(){if(wffLiveTimer!==null){clearTimeout(wffLiveTimer);wffLiveTimer=null}}
function wffLiveScores(state,opponent){
 const r=wffRandom(state.teamId,"weekly-scores-"+state.week),pool=teams.filter(t=>t.id!==state.teamId&&t.id!==opponent.id);
 const games=[];for(let i=0;i+1<pool.length;i+=2){games.push({home:teamLabel(pool[i]),away:teamLabel(pool[i+1]),homeScore:Math.floor(r()*5)*3+Math.floor(r()*3)*7,awayScore:Math.floor(r()*4)*3+Math.floor(r()*4)*7})}return games;
}
function wffLiveStart(state,redraw){
 wffLiveStop();wffAudio.stop();const opponentPool=teams.filter(t=>t.id!==state.teamId);
 const r=wffRandom(state.teamId,"live-game-"+state.week);
 const opp=opponentPool[Math.floor(r()*opponentPool.length)];
 const us=teams[state.teamId];
 const weather=wffWeather(us.id,state.week,state.finance?.year||2026);
 wffLive={state,redraw,opp,us,weather,r,clock:wffClockCreate(),score:[0,0],possession:0,field:25,down:1,toGo:10,
 stats:[{plays:0,pass:0,rush:0,yards:0,firstDowns:0,turnovers:0},{plays:0,pass:0,rush:0,yards:0,firstDowns:0,turnovers:0}],
 events:[],speed:"medium",paused:false,breakType:null,complete:false,playCount:0,
 adjustments:{offense:"balanced",defense:"balanced",tempo:"normal"},league:wffLiveScores(state,opp)};
 wffLiveRender();wffLiveSchedule();
}
function wffLiveSchedule(){wffLiveStop();if(!wffLive||wffLive.paused||wffLive.breakType||wffLive.complete)return;wffLiveTimer=setTimeout(()=>{wffLiveTimer=null;wffLiveStep()},WFF_LIVE_SPEED[wffLive.speed])}
function wffLiveEvent(message,major=false){const l=wffLive;l.events.unshift({q:l.clock.quarter,time:wffClockTime(l.clock.remaining),message,major});l.events=l.events.slice(0,50)}
function wffLiveChangePossession(){const l=wffLive;l.possession=1-l.possession;l.field=22+Math.floor(l.r()*14);l.down=1;l.toGo=10;l.clock.running=false}
function wffLiveEndPeriod(){
 const l=wffLive,c=l.clock;if(c.remaining>0)return false;
 if(c.quarter===4){wffLiveFinish();return true}
 if(c.quarter===2){l.breakType="halftime";wffLiveEvent("Halftime. Coaching adjustments are available.",true);wffBroadcast.call("halftime",l);wffAudio.event("halftime",0,l);wffLiveStop();return true}
 l.breakType="quarter";wffLiveEvent("End of quarter "+c.quarter+".",true);wffBroadcast.call("quarter",l);wffAudio.event("quarter",0,l);wffLiveStop();return true;
}
function wffLiveContinue(){
 const l=wffLive;if(!l)return;const halftime=l.breakType==="halftime";
 l.clock.quarter++;l.clock.remaining=900;l.clock.playClock=40;l.clock.running=false;
 if(halftime){l.clock.timeouts=[3,3];l.possession=1;l.field=25;l.down=1;l.toGo=10;wffLiveEvent("Second half begins. Coaching adjustments applied.",true)}
 else wffLiveEvent("Quarter "+l.clock.quarter+" begins.",true);
 l.breakType=null;l.paused=false;wffLiveRender();wffLiveSchedule();
}
function wffLiveStep(){
 const l=wffLive;if(!l||l.paused||l.breakType||l.complete)return;
 const c=l.clock,side=l.possession,lead=l.score[side]-l.score[1-side];
 const profile=side===0?l.state.staff.hc.tendencies:wffCoachProfile(l.opp.id);
 const opponentTimeouts=c.timeouts[1-side];
 const policy=wffClockChoose({...c,down:l.down},lead,opponentTimeouts,l.field);
 const urgent=(c.quarter===2||c.quarter===4)&&c.remaining<=120&&lead<=0;
 if(c.running){const userTempo=side===0?l.adjustments.tempo:"normal";const wait=policy==="drain"||userTempo==="drain"&&!urgent?37:urgent||userTempo==="hurry"?9:28;wffClockRunoff(c,wait);c.playClock=Math.max(1,40-wait);if(wffLiveEndPeriod()){wffLiveRender();return}}
 if(c.quarter===4&&lead<0&&l.possession!==0&&wffCoachTimeoutChoice({quarter:c.quarter,seconds:c.remaining,lead:l.score[0]-l.score[1],ownTimeouts:c.timeouts[0],opponentHasBall:true,opponentRunning:c.running,down:l.down})){
 c.timeouts[0]--;c.running=false;wffLiveEvent(l.us.city+" uses a timeout. "+c.timeouts[0]+" remaining.",true)}
 if(l.down===4){
 const decision=wffCoachFourthCall({yard:l.field,toGo:l.toGo,quarter:c.quarter,seconds:c.remaining,lead,timeouts:c.timeouts[side],aggression:profile.aggression,judgment:profile.judgment,seed:l.state.week+"-"+l.playCount+"-"+side,wind:l.weather.wind,weather:l.weather.condition});
 const kicker=wffKickerForTeam(l.state,side===0?l.us.id:l.opp.id);const kick=wffKickDecision(kicker,l.field,{...l.weather,endHalf:(c.quarter===2||c.quarter===4)&&c.remaining<=12});if(decision.call==="field_goal"&&!kick.advisable)decision.call=(l.field>=50&&l.toGo<=3)?"go":"punt";if(decision.call==="punt"){wffLiveEvent((side===0?l.us.city:l.opp.city)+" punts on fourth down.");wffClockSnap(c,"run",{duration:7});wffLiveChangePossession();wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return}
 if(decision.call==="field_goal"){const made=l.r()<kick.probability;l.stats[side].plays++;l.playCount++;wffClockSnap(c,"run",{duration:5});if(made)l.score[side]+=3;wffAudio.event(made?"fieldGoalGood":"fieldGoalMiss",side,l);wffBroadcast.call(made?"fieldGoalGood":"fieldGoalMiss",l,side);wffLiveEvent((side===0?l.us.city:l.opp.city)+" "+(made?"makes":"misses")+" a "+Math.round(kick.distance)+"-yard field goal by "+kicker.name+" ("+kicker.archetype+").",true);wffLiveChangePossession();wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return}
 wffLiveEvent((side===0?l.us.city:l.opp.city)+" goes for it on fourth and "+l.toGo+".",true);wffAudio.event("critical",1-side,l);wffBroadcast.call("fourthTry",l,side);
 }
 if(l.down===3&&l.toGo<=3&&c.quarter>=3&&Math.abs(lead)<=8)wffAudio.event("critical",1-side,l);
 const kneel=policy==="kneel";const offense=l.adjustments.offense,tempo=l.adjustments.tempo;
 const basePass=side===0?({ "Power Run":.43,"Wide Zone":.48,"Balanced Multiple":.56,"West Coast":.61,"Vertical Passing":.64,"Spread":.65,"Air Raid":.73,"Run and Shoot":.72}[l.state.offense]||.56):.56;
 const pass=!kneel&&l.r()<Math.max(.15,Math.min(.90,basePass+(side===0?(offense==="pass"?.16:offense==="run"?-.16:0):0)+(urgent?.19:0)+(lead>0&&c.quarter===4&&c.remaining<300?-.20:0)));
 const defenseFocus=side===1?l.adjustments.defense:"balanced";const completionChance=.64+(side===0&&offense==="pass"?.025:0)-(defenseFocus==="pass"?.055:0);const complete=pass&&l.r()<completionChance;
 const gain=kneel?-1:pass?(complete?Math.floor(3+l.r()*18):0):Math.floor(-2+l.r()*(defenseFocus==="run"?9:12));
 const kind=kneel?"kneel":pass?(complete?"pass_complete":"pass_incomplete"):"run";
 wffClockSnap(c,kind,{duration:kind==="pass_incomplete"?5:6});
 const st=l.stats[side];st.plays++;l.playCount++;if(pass)st.pass++;else st.rush++;st.yards+=gain;
 const name=side===0?l.us.city:l.opp.city;
 const label=kneel?"Quarterback kneels to protect the lead.":pass?(complete?"Pass complete for "+gain+" yards.":"Pass incomplete; game clock stops."):"Run gains "+gain+" yards.";
 const detailed=" "+name+" — "+label+" ("+l.down+"&"+l.toGo+" at "+l.field+")";
 wffLiveEvent(detailed);
 l.field+=gain;
 if(l.field>=100){l.score[side]+=7;wffAudio.event("touchdown",side,l);wffBroadcast.call("touchdown",l,side);wffLiveEvent(name+" scores a touchdown! Extra point good.",true);wffLiveChangePossession()}
 else if(gain>=l.toGo){st.firstDowns++;if(l.speed==="slow"&&l.playCount%3===0)wffBroadcast.call("firstDown",l,side);l.down=1;l.toGo=Math.min(10,100-l.field)}
 else{l.down++;l.toGo=Math.max(1,l.toGo-gain);if(l.down>4){st.turnovers++;wffAudio.event("fourthFail",side,l);wffBroadcast.call("fourthFail",l,side);wffLiveEvent("Turnover on downs.",true);wffLiveChangePossession()}}
 if(l.playCount>=230){c.quarter=4;c.remaining=0;wffLiveFinish();return}
 wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();
}
function wffLiveFinish(){
 const l=wffLive;if(!l||l.complete)return;wffBroadcast.call("final",l);l.complete=true;l.breakType=null;wffLiveStop();wffAudio.stop();
 const state=l.state;const homeScore=l.score[0],awayScore=l.score[1];
 if(homeScore>awayScore)state.wins++;else if(homeScore<awayScore)state.losses++;
 const game={week:state.week,home:teamLabel(l.us),away:teamLabel(l.opp),homeScore,awayScore,totalPlays:l.playCount,log:l.events.slice(0,16).map(x=>x.message),stats:l.stats};
 state.games.push(game);wffBusinessRecordGame(state,game);
 const medical=wffPlayWorkload(state,l.weather,"week-"+state.week);
 if(medical.injuries.length)wffLiveEvent("Medical report: "+medical.injuries.length+" injuries recorded.",true);
 state.week++;wffMedicalAdvance(state);save();wffLiveEvent("Final score. Game saved to franchise history.",true);wffLiveRender();
}
function wffLiveRender(){
 const l=wffLive;if(!l)return;const c=l.clock,display=l.speed==="slow"?18:l.speed==="medium"?10:5;
 const stats=l.stats.map((x,i)=>'<div class="stat"><strong>'+esc(i===0?l.us.city:l.opp.city)+'</strong><p>'+x.plays+' plays • '+x.yards+' yards</p><small>'+x.pass+' passes • '+x.rush+' rushes • '+x.firstDowns+' first downs</small></div>').join("");
 const ticker=l.league.slice(0,8).map(x=>'<div class="line"><span>'+esc(x.away)+' '+x.awayScore+'</span><span>'+esc(x.home)+' '+x.homeScore+'</span></div>').join("");
 const adjustment=l.breakType==="halftime"?'<section class="panel"><h2>Halftime Coaching Adjustments</h2><p class="muted">Set broad second-half priorities. The coaches still call every play automatically.</p><div class="grid">'+[["offense","Offensive emphasis",[["balanced","Balanced"],["run","Lean on the run"],["pass","Attack through the air"]]],["defense","Defensive emphasis",[["balanced","Balanced"],["run","Stop the run"],["pass","Defend the pass"]]],["tempo","Tempo",[["normal","Normal"],["hurry","Faster tempo"],["drain","Control the clock"]]]].map(([key,title,options])=>'<label class="stat">'+title+'<select data-live-adjust="'+key+'">'+options.map(([value,label])=>'<option value="'+value+'" '+(l.adjustments[key]===value?"selected":"")+'>'+label+'</option>').join("")+'</select></label>').join("")+'</div></section>':"";
 const buttons=l.complete?'<button class="btn" id="live-return">Return to Game Day</button>':l.breakType?'<button class="btn" id="live-continue">Continue '+(l.breakType==="halftime"?"Second Half":"Next Quarter")+'</button>':'<button class="btn secondary" id="live-pause">'+(l.paused?"Resume":"Pause")+'</button>';
 const html='<section class="panel"><h2>WFF Live Game • CPU vs CPU</h2><div class="grid"><div class="stat"><small>'+esc(teamLabel(l.us))+'</small><b>'+l.score[0]+'</b></div><div class="stat"><small>Q'+c.quarter+' • '+wffClockTime(c.remaining)+'</small><b>'+l.score[1]+'</b><small>'+esc(teamLabel(l.opp))+'</small></div><div class="stat"><small>Play clock</small><b>'+c.playClock+'s</b><small>Timeouts '+c.timeouts.join(' / ')+'</small></div></div><p>'+esc((l.possession===0?l.us.city:l.opp.city))+' ball • '+l.down+'&'+l.toGo+' • Yard '+l.field+'</p><div class="toolbar"><label>Viewing speed <select id="live-speed">'+[["slow","Slow • 6–9 sec"],["medium","Medium • 3–5 sec"],["fast","Fast • 2 sec"]].map(([key,label])=>'<option value="'+key+'" '+(l.speed===key?"selected":"")+'>'+label+'</option>').join("")+'</select></label>'+buttons+'</div><p class="muted">Timing and scores are simulated. Viewing speed never changes the game model.</p></section>'+wffAudio.controls()+adjustment+'<section class="panel"><h2>Game Statistics</h2><div class="grid">'+stats+'</div></section><section class="panel"><h2>Scores Around the League</h2><p class="muted">Illustrative independent exhibition scores for Week '+l.state.week+'; not a synchronized league schedule or standings.</p>'+ticker+'</section><section class="panel"><h2>Play-by-Play</h2>'+l.events.slice(0,display).map(x=>'<div class="line"><span>Q'+x.q+' '+x.time+' • '+esc(x.message)+'</span></div>').join("")+'</section>';
 const v=document.getElementById("view");if(!v)return;v.innerHTML=html;wffAudio.bind();
 document.getElementById("live-speed").onchange=e=>{l.speed=e.target.value;wffLiveRender();wffLiveSchedule()};
 const pause=document.getElementById("live-pause");if(pause)pause.onclick=()=>{l.paused=!l.paused;if(l.paused)wffBroadcast.stop();wffLiveRender();wffLiveSchedule()};
 const next=document.getElementById("live-continue");if(next)next.onclick=wffLiveContinue;
 const back=document.getElementById("live-return");if(back)back.onclick=()=>{wffAudio.stop();wffLive=null;l.redraw()};
 document.querySelectorAll("[data-live-adjust]").forEach(el=>el.onchange=()=>{l.adjustments[el.dataset.liveAdjust]=el.value});
}
