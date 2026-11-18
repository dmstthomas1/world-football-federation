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
 wffLiveStop();wffAudio.stop();wffScheduleInit(state);const matchup=wffNextMatch(state);if(!matchup)return;
 const r=wffRandom(state.teamId,"live-game-"+state.finance.year+"-"+state.week);
 const opp=teams[matchup.home===state.teamId?matchup.away:matchup.home];
 const us=teams[state.teamId];
 const weather=wffWeather(us.id,state.week,state.finance?.year||2026);
 const ownPlan={...wffPlan(state)},cpuPlan=wffOpponentPlan(state,opp.id);
 const schemes=[wffTeamScheme(state,us.id),wffTeamScheme(state,opp.id)];
 wffLive={state,redraw,opp,us,weather,r,matchup,plans:[ownPlan,cpuPlan],schemes,clock:wffClockCreate(),score:[0,0],possession:0,field:25,down:1,toGo:10,
 stats:[{plays:0,pass:0,rush:0,yards:0,firstDowns:0,turnovers:0},{plays:0,pass:0,rush:0,yards:0,firstDowns:0,turnovers:0}],
 events:[],formation:null,penaltyLog:[],speed:"medium",paused:false,breakType:null,complete:false,playCount:0,
 adjustments:{offense:"balanced",defense:"balanced",tempo:"normal"},league:(state.leagueSchedule.weeks[state.week-1]||[]).filter(g=>g.id!==matchup.id).slice(0,8).map(g=>({...wffLeagueScore(state,g),home:teamLabel(teams[g.home]),away:teamLabel(teams[g.away])}))};
 wffLiveEvent("Pregame plans: "+us.city+" — "+WFF_OFF_FOCUS[ownPlan.offense].name+" / "+WFF_DEF_FOCUS[ownPlan.defense].name+"; "+opp.city+" — "+WFF_OFF_FOCUS[cpuPlan.offense].name+" / "+WFF_DEF_FOCUS[cpuPlan.defense].name+".",true);
 wffLiveRender();wffLiveSchedule();
}
function wffLiveSchedule(){wffLiveStop();if(!wffLive||wffLive.paused||wffLive.breakType||wffLive.complete)return;wffLiveTimer=setTimeout(()=>{wffLiveTimer=null;wffLiveStep()},WFF_LIVE_SPEED[wffLive.speed])}
function wffLiveEvent(message,major=false){const l=wffLive;l.events.unshift({q:l.clock.quarter,time:wffClockTime(l.clock.remaining),message,major});l.events=l.events.slice(0,50)}
function wffLiveChangePossession(spot){const l=wffLive;wffFieldSwitch(l,spot)}
function wffLiveEndPeriod(){
 const l=wffLive,c=l.clock;if(c.remaining>0)return false;
 if(c.quarter===4){wffLiveFinish();return true}
 if(c.quarter===2){
  wffLiveEvent("Halftime. Coaches review the first half and make adjustments.",true);
  wffBroadcast.call("halftime",l);wffAudio.event("halftime",0,l);
 }else{
  wffLiveEvent("End of quarter "+c.quarter+".",true);
  wffBroadcast.call("quarter",l);wffAudio.event("quarter",0,l);
 }
 wffLiveContinue();
 return true;
}
function wffLiveContinue(){
 const l=wffLive;if(!l||l.complete)return;
 const halftime=l.clock.quarter===2;
 l.clock.quarter++;l.clock.remaining=900;l.clock.playClock=40;l.clock.running=false;
 if(halftime){
  l.clock.timeouts=[3,3];l.possession=1;l.field=25;l.down=1;l.toGo=10;
  wffLiveEvent("Second half kickoff. Coaches have applied halftime adjustments.",true);
 }else wffLiveEvent("Quarter "+l.clock.quarter+" begins.",true);
 l.breakType=null;l.paused=false;wffLiveRender();wffLiveSchedule();
}

// Live sacks are generated from actual offensive dropbacks, not postgame estimates.
function wffPassRushOutcome(l,side){
 const offense=wffTurnoverRoster(l,side),defense=wffTurnoverRoster(l,1-side);
 const group=(p,g)=>dnaGroup(p.position)===g;
 const score=(p,keys)=>keys.reduce((n,k)=>n+Number(p.ratings?.[k]??p.overall??72),0)/keys.length;
 const rushers=defense.filter(p=>group(p,"EDGE")||group(p,"DT")||group(p,"LB")).map(p=>({
  player:p,skill:group(p,"EDGE")?score(p,["finesseMoves","powerMoves","pursuit"]):group(p,"DT")?score(p,["powerMoves","finesseMoves","blockShedding"]):score(p,["blockShedding","pursuit","playRecognition"])-7
 })).sort((a,b)=>b.skill-a.skill);
 const linemen=offense.filter(p=>group(p,"OL")).map(p=>score(p,["passBlock","passBlockPower","passBlockFinesse"]));
 const blockers=[...linemen,...offense.filter(p=>group(p,"TE")||group(p,"HB")).map(p=>score(p,["passBlock","passProtection"])-6)];
 const qb=offense.find(p=>group(p,"QB")),pocket=Number(qb?.ratings?.pocketPresence??qb?.overall??75);
 const protection=linemen.length?linemen.reduce((a,b)=>a+b,0)/linemen.length:72;
 const rush=rushers.length?rushers.slice(0,4).reduce((a,b)=>a+b.skill,0)/Math.min(4,rushers.length):72;
 const edge=rushers.find(p=>group(p.player,"EDGE"));
 const focus=l.plans?.[1-side]?.defense;
 const concept=l.calledPlay?.defense?.concept||"";
 const blitz=focus==="blitz"||/Blitz|Pressure/i.test(concept);
 const longDown=l.toGo>=8&&l.down>=3;
 // Recognition and protection are independent of pass rush talent.
 const recognition=Math.max(.08,Math.min(.88,.43+(pocket-75)*.011+(protection-75)*.007+(blockers.length-5)*.018));
 const pickup=blitz&&l.r()<recognition;
 const quickThrow=blitz&&!pickup&&l.r()<Math.max(.08,Math.min(.65,.27+(pocket-75)*.008));
 const edgeBoost=edge?Math.max(0,edge.skill-protection)*.002:0;
 let chance=.057+(rush-protection)*.003+edgeBoost+(longDown?.008:0)-(pocket-75)*.0006;
 if(blitz)chance+=pickup?-.020:quickThrow?-.030:.034;
 chance=Math.max(.012,Math.min(.16,chance));
 const result={blitz,pickup,quickThrow,chance,sack:false};
 if(l.r()>=chance)return result;
 const candidates=rushers.slice(0,5),weights=candidates.map(p=>Math.max(1,p.skill-50)*(group(p.player,"EDGE")?1.4:1));
 let roll=l.r()*weights.reduce((a,b)=>a+b,0),winner=candidates[0]?.player;
 for(let i=0;i<candidates.length;i++){roll-=weights[i];if(roll<=0){winner=candidates[i].player;break}}
 return {...result,sack:true,defender:winner,quarterback:qb,yards:2+Math.floor(l.r()*8)};
}
function wffLiveStep(){
 const l=wffLive;if(!l||l.paused||l.breakType||l.complete)return;
 l.calledPlay=wffCallPlay(l,l.possession);
 l.formation={formation:l.calledPlay.formation,personnel:l.calledPlay.personnel,defense:l.calledPlay.defenseFormation,playType:l.calledPlay.play?.kind==="pass"?"Pass":"Run"};
 const c=l.clock,side=l.possession,lead=l.score[side]-l.score[1-side];
 const profile=side===0?l.state.staff.hc.tendencies:wffCoachProfile(l.opp.id);
 const opponentTimeouts=c.timeouts[1-side];
 const policy=wffClockChoose({...c,down:l.down},lead,opponentTimeouts,l.field);
 const urgent=(c.quarter===2||c.quarter===4)&&c.remaining<=120&&lead<=0;
 if(c.running){const userTempo=side===0?l.adjustments.tempo:"normal";const wait=policy==="drain"||userTempo==="drain"&&!urgent?37:urgent||userTempo==="hurry"?9:28;wffClockRunoff(c,wait);c.playClock=Math.max(1,40-wait);if(wffLiveEndPeriod()){wffLiveRender();return}}
 // Either CPU coach can stop a running clock when trailing late.
 const defenseSide=1-side,defenseLead=l.score[defenseSide]-l.score[side];
 if(c.quarter===4&&defenseLead<0&&c.running&&c.timeouts[defenseSide]>0&&wffCoachTimeoutChoice({quarter:c.quarter,seconds:c.remaining,lead:defenseLead,ownTimeouts:c.timeouts[defenseSide],opponentHasBall:true,opponentRunning:c.running,down:l.down})){
  c.timeouts[defenseSide]--;c.running=false;c.playClock=25;
  wffLiveEvent((defenseSide===0?l.us.city:l.opp.city)+" calls timeout. "+c.timeouts[defenseSide]+" remaining.",true);
  wffLiveRender();wffLiveSchedule();return;
 }
 const prePenalty=wffPenaltyRoll(l,side,false,"pre");if(prePenalty){wffLiveEvent(wffPenaltyApply(l,prePenalty),true);c.running=false;wffLiveRender();wffLiveSchedule();return}
 if(l.down===4){
 const decision=wffCoachFourthCall({yard:l.field,toGo:l.toGo,quarter:c.quarter,seconds:c.remaining,lead,timeouts:c.timeouts[side],aggression:profile.aggression,judgment:profile.judgment,seed:l.state.week+"-"+l.playCount+"-"+side,wind:l.weather.wind,weather:l.weather.condition});
 const kicker=wffKickerForTeam(l.state,side===0?l.us.id:l.opp.id);const kick=wffKickDecision(kicker,l.field,{...l.weather,endHalf:(c.quarter===2||c.quarter===4)&&c.remaining<=12});if(decision.call==="field_goal"&&!kick.advisable)decision.call=(l.field>=50&&l.toGo<=3)?"go":"punt";if(decision.call==="punt"){wffLiveEvent((side===0?l.us.city:l.opp.city)+" punts on fourth down.");wffClockSnap(c,"run",{duration:7});wffLiveChangePossession();wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return}
 if(decision.call==="field_goal"){const made=l.r()<kick.probability;l.stats[side].plays++;l.playCount++;wffClockSnap(c,"run",{duration:5});if(made)l.score[side]+=3;wffAudio.event(made?"fieldGoalGood":"fieldGoalMiss",side,l);wffBroadcast.call(made?"fieldGoalGood":"fieldGoalMiss",l,side);wffLiveEvent((side===0?l.us.city:l.opp.city)+" "+(made?"makes":"misses")+" a "+Math.round(kick.distance)+"-yard field goal by "+kicker.name+" ("+kicker.archetype+").",true);wffLiveChangePossession(l.field);wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return}
 wffLiveEvent((side===0?l.us.city:l.opp.city)+" goes for it on fourth and "+l.toGo+".",true);wffAudio.event("critical",1-side,l);wffBroadcast.call("fourthTry",l,side);
 }
 if(l.down===3&&l.toGo<=3&&c.quarter>=3&&Math.abs(lead)<=8)wffAudio.event("critical",1-side,l);
 const kneel=policy==="kneel";const offense=l.adjustments.offense,tempo=l.adjustments.tempo;
 const selected=l.calledPlay?.play;
 const pass=!kneel&&(selected?selected.kind==="pass":l.r()<.56);
 const defenseFocus=l.plans[1-side].defense,mods=wffPlanModifiers(l,side,pass,selected||{});
 const talent=side===0?l.state.roster.reduce((n,p)=>n+p.overall,0)/Math.max(1,l.state.roster.length):rating(l.opp.id,12);
 const opposingTalent=side===0?rating(l.opp.id,12):l.state.roster.reduce((n,p)=>n+p.overall,0)/Math.max(1,l.state.roster.length);
 const talentDelta=Math.max(-.06,Math.min(.06,(talent-opposingTalent)*.004));
 const rushOutcome=pass?wffPassRushOutcome(l,side):null;
 const completionChance=Math.max(.28,Math.min(.84,.64+mods.completion+talentDelta+(rushOutcome?.pickup ? .035 : 0)+(rushOutcome?.quickThrow ? .025 : 0)-(rushOutcome?.blitz&&!rushOutcome.pickup&&!rushOutcome.quickThrow ? .045 : 0)));
 const complete=pass&&l.r()<completionChance;
 const rawGain=kneel?-1:pass?(complete?Math.floor((rushOutcome?.quickThrow?2+l.r()*7:3+l.r()*18)+mods.passYards):0):Math.floor(-2+l.r()*12+mods.runYards+talentDelta*12);
 const gain=Math.max(-8,rawGain);
 const livePenalty=!kneel?wffPenaltyRoll(l,side,pass,"live"):null;
 if(livePenalty){wffClockSnap(c,pass?"pass_incomplete":"run",{duration:5});l.playCount++;wffLiveEvent(wffPenaltyApply(l,livePenalty),true);c.running=false;wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return}
 const sack=rushOutcome?.sack?rushOutcome:null;
 if(sack){
  if(rushOutcome.blitz){l.stats[1-side].blitzCalls=(l.stats[1-side].blitzCalls||0)+1;l.stats[side].blitzFaced=(l.stats[side].blitzFaced||0)+1}
  const st=l.stats[side],dst=l.stats[1-side],loss=Math.min(sack.yards,Math.max(0,l.field-1));
  st.plays++;st.pass++;st.sacksAllowed=(st.sacksAllowed||0)+1;st.sackYardsLost=(st.sackYardsLost||0)+loss;st.yards-=loss;
  dst.sacks=(dst.sacks||0)+1;dst.sackYards=(dst.sackYards||0)+loss;
  l.playCount++;wffClockSnap(c,"run",{duration:7});
  l.field-=loss;l.down++;l.toGo+=loss;
  if(!l.liveSacks)l.liveSacks=[];
  l.liveSacks.push({teamId:side===0?l.opp.id:l.us.id,name:sack.defender?.name||"Defender",position:sack.defender?.position||"EDGE",yards:loss});
  wffLiveEvent((side===0?l.us.city:l.opp.city)+" — "+(sack.quarterback?.name||"Quarterback")+" SACKED by "+(sack.defender?.name||"Defender")+" for a loss of "+loss+" yards!",true);
  if(l.down>4){st.turnovers++;wffLiveEvent("Turnover on downs after the sack.",true);wffLiveChangePossession(l.field)}
  wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return;
 }
 if(rushOutcome?.blitz){const st=l.stats[side],dst=l.stats[1-side];st.blitzFaced=(st.blitzFaced||0)+1;dst.blitzCalls=(dst.blitzCalls||0)+1;if(rushOutcome.pickup){st.blitzPickedUp=(st.blitzPickedUp||0)+1;wffLiveEvent("Blitz recognized and picked up — quarterback has time to throw.")}else if(rushOutcome.quickThrow){st.quickThrows=(st.quickThrows||0)+1;wffLiveEvent("Quarterback reads the blitz and releases a quick pass.")}}
 const turnoverPass=pass?wffTurnoverPass(l,side,{pressure:defenseFocus==="blitz",desperate:urgent}):null;
 if(turnoverPass?.type==="interception"){
  wffClockSnap(c,"turnover",{duration:6});const st=l.stats[side];st.plays++;st.pass++;l.playCount++;
  wffLiveEvent(wffTurnoverRecord(l,side,turnoverPass),true);wffAudio.event("turnover",1-side,l);
  wffLiveChangePossession();wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return;
 }
 if(turnoverPass?.type==="nearPick"){
  wffClockSnap(c,"pass_incomplete",{duration:6});const st=l.stats[side];st.plays++;st.pass++;l.playCount++;
  wffLiveEvent(wffTurnoverRecord(l,side,turnoverPass),true);l.down++;if(l.down>4){st.turnovers++;wffLiveEvent("Turnover on downs.",true);wffLiveChangePossession(l.field)}
  wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return;
 }
 const fumble=!kneel&&(!pass||complete)?wffTurnoverFumble(l,side,{pass,heavyHit:defenseFocus==="run"}):null;
 if(fumble){
  wffClockSnap(c,"run",{duration:7});const st=l.stats[side];st.plays++;if(pass)st.pass++;else st.rush++;l.playCount++;
  wffLiveEvent(wffTurnoverRecord(l,side,fumble),true);
  if(fumble.recoveredByDefense){wffAudio.event("turnover",1-side,l);wffLiveChangePossession()}
  else{l.down++;if(l.down>4){st.turnovers++;wffLiveEvent("Turnover on downs after recovered fumble.",true);wffLiveChangePossession(l.field)}}
  wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();return;
 }
 if(l.formation)l.formation.playType=kneel?"Kneel":pass?"Pass":"Run";
 if(selected)wffLiveEvent((side===0?l.us.city:l.opp.city)+" calls "+selected.formation+" "+selected.variant+" — "+selected.concept+" against "+l.calledPlay.defenseFormation+" "+l.calledPlay.defense.concept+".");
 const kind=kneel?"kneel":pass?(complete?"pass_complete":"pass_incomplete"):"run";
 wffClockSnap(c,kind,{duration:kind==="pass_incomplete"?5:6});
 const st=l.stats[side];st.plays++;l.playCount++;if(pass)st.pass++;else st.rush++;st.yards+=gain;
 const name=side===0?l.us.city:l.opp.city;
 const label=kneel?"Quarterback kneels to protect the lead.":pass?(complete?"Pass complete for "+gain+" yards.":"Pass incomplete; game clock stops."):"Run gains "+gain+" yards.";
 const detailed=" "+name+" — "+label+" ("+wffFieldDown(l)+")";
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
 const game={week:state.week,home:teamLabel(l.us),away:teamLabel(l.opp),homeScore,awayScore,totalPlays:l.playCount,penalties:l.penaltyLog,turnovers:l.stats.map(x=>({interceptions:x.interceptions||0,fumbles:x.fumbles||0,fumblesLost:x.fumblesLost||0,nearInterceptions:x.nearInterceptions||0})),log:l.events.slice(0,16).map(x=>x.message),stats:l.stats};
 game.fixtureId=l.matchup.id;game.teamIds=[l.us.id,l.opp.id];game.year=state.finance.year;game.liveSacks=l.liveSacks||[];
 state.games.push(game);wffBusinessRecordGame(state,game);
 const medical=wffPlayWorkload(state,l.weather,"week-"+state.week);
 if(medical.injuries.length)wffLiveEvent("Medical report: "+medical.injuries.length+" injuries recorded.",true);
 wffLeagueCompleteWeek(state,{homeScore:l.matchup.home===state.teamId?homeScore:awayScore,awayScore:l.matchup.home===state.teamId?awayScore:homeScore});wffMedicalAdvance(state);l.finalGame=game;save();wffLiveEvent("Final score. Game saved to franchise history.",true);wffLiveRender();
}
function wffLiveRender(){
 const l=wffLive;if(!l)return;const c=l.clock,display=l.speed==="slow"?18:l.speed==="medium"?10:5;
 const stats=l.stats.map((x,i)=>'<div class="stat"><strong>'+esc(i===0?l.us.city:l.opp.city)+'</strong><p>'+x.plays+' plays • '+x.yards+' yards</p><small>'+x.pass+' passes • '+x.rush+' rushes • '+x.firstDowns+' first downs</small></div>').join("");
 const ticker=l.league.slice(0,8).map(x=>'<div class="line"><span>'+esc(x.away)+' '+x.awayScore+'</span><span>'+esc(x.home)+' '+x.homeScore+'</span></div>').join("");
 const planSummary='<p class="muted">Game plans • '+esc(l.us.city)+': '+esc(WFF_OFF_FOCUS[l.plans[0].offense].name)+' / '+esc(WFF_DEF_FOCUS[l.plans[0].defense].name)+' • '+esc(l.opp.city)+': '+esc(WFF_OFF_FOCUS[l.plans[1].offense].name)+' / '+esc(WFF_DEF_FOCUS[l.plans[1].defense].name)+'</p>';
 const buttons=l.complete?'<button class="btn" id="live-box-score">View Box Score</button> <button class="btn secondary" id="live-return">Return to Game Day</button>':'<button class="btn secondary" id="live-pause">'+(l.paused?"Resume":"Pause")+'</button>';
 const html='<section class="panel wff-live-controls"><h2>WFF Live Game • CPU vs CPU</h2><p class="muted">'+esc(wffFieldDown(l))+' • Play clock '+c.playClock+'s • Timeouts '+c.timeouts.join(' / ')+'</p>'+planSummary+'<div class="toolbar"><label>Viewing speed <select id="live-speed">'+[["slow","Slow • 6–9 sec"],["medium","Medium • 3–5 sec"],["fast","Fast • 2 sec"]].map(([key,label])=>'<option value="'+key+'" '+(l.speed===key?"selected":"")+'>'+label+'</option>').join("")+'</select></label>'+buttons+'</div><p class="muted">Timing and scores are simulated. Viewing speed never changes the game model.</p></section>'+wffFieldView(l)+wffAudio.controls()+'<section class="panel"><h2>Game Statistics</h2><div class="grid">'+stats+'</div></section>'+wffPenaltySummary(l)+wffTurnoverView(l)+'<section class="panel"><h2>Scores Around the League</h2><p class="muted">Simulated scheduled league results for Week '+l.state.week+'; other games are generated deterministically and recorded after your game finishes.</p>'+ticker+'</section>';
 const v=document.getElementById("view");if(!v)return;v.innerHTML=html;wffAudio.bind();
 document.getElementById("live-speed").onchange=e=>{l.speed=e.target.value;wffLiveRender();wffLiveSchedule()};
 const pause=document.getElementById("live-pause");if(pause)pause.onclick=()=>{l.paused=!l.paused;if(l.paused)wffBroadcast.stop();wffLiveRender();wffLiveSchedule()};
 const next=document.getElementById("live-continue");if(next)next.onclick=wffLiveContinue;
 const box=document.getElementById("live-box-score");if(box)box.onclick=()=>{const v=document.getElementById("view");v.innerHTML=wffGameBoxScoreView(l.state,l.finalGame||l.state.games.at(-1))+'<button class="btn secondary" id="box-return">Return to Game Day</button>';document.getElementById("box-return").onclick=()=>{wffLive=null;l.redraw()}};
 const back=document.getElementById("live-return");if(back)back.onclick=()=>{wffAudio.stop();wffLive=null;l.redraw()};
 document.querySelectorAll("[data-live-adjust]").forEach(el=>el.onchange=()=>{l.adjustments[el.dataset.liveAdjust]=el.value});
}
