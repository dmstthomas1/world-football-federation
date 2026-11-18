"use strict";
// Explicit, save-persisted franchise chronology. Future gameplay modules must
// use these gates instead of changing season/year directly.
const WFF_OFFSEASON_STAGES=["coaches","contracts","freeagency","trades","draftprep","draft","trainingcamp","preseason"];
const WFF_STAGE_LABELS={coaches:"Coaching Decisions",contracts:"Contracts & Re-signings",freeagency:"Free Agency",trades:"Offseason Trades",draftprep:"Draft Preparation",draft:"WFF Draft",trainingcamp:"Training Camp",preseason:"Preseason"};
function wffTimelinePhase(s){
 if(s.week<=18)return "regular";
 if(!s.postseason||s.postseason.champion==null)return "playoffs";
 return s.offseason?.stage||"champion";
}
function wffTimelineAdvance(s,action){
 const phase=wffTimelinePhase(s);
 if(action==="enterOffseason"&&phase==="champion"){
  s.offseason={year:s.finance.year,stage:"coaches",completed:[]};return true;
 }
 if(action==="nextStage"&&WFF_OFFSEASON_STAGES.includes(phase)){
  // Never allow a draft to be skipped or a new season to be started
  // before those features have implemented, validated gameplay.
  if(["draftprep","draft","trainingcamp","preseason"].includes(phase))return false;
  const idx=WFF_OFFSEASON_STAGES.indexOf(phase);
  s.offseason.completed.push(phase);
  s.offseason.stage=WFF_OFFSEASON_STAGES[idx+1];return true;
 }
 return false;
}
function wffTimelineView(s){
 const phase=wffTimelinePhase(s),p=s.postseason;
 let heading="",detail="",button="",action="";
 if(phase==="regular"){
  heading="Regular Season • Week "+s.week;
  detail="Finish scheduled games in order. Playoffs and offseason actions remain locked until the regular season ends.";
 }else if(phase==="playoffs"){
  heading="Playoffs • "+(p?.phase||"Seeding");
  const qualified=p&&Object.values(p.seeds||{}).some(arr=>arr.some(t=>t.id===s.teamId));
  detail=qualified?"Your club qualified. Advance one playoff round at a time to reach the World Bowl.":"Your club is eliminated. Follow each remaining playoff round and the World Bowl results before entering the offseason.";
  button=p?"Simulate Next Playoff Round":"";action="playoff";
 }else if(phase==="champion"){
  heading="World Bowl Complete";
  detail="Champion: "+teamLabel(teams[p.champion])+". Review the final results, then enter the offseason when ready.";
  button="Enter Offseason";action="enterOffseason";
 }else{
  heading="Offseason • "+WFF_STAGE_LABELS[phase];
  detail="Season "+s.finance.year+". Your progress is saved. The next stage unlocks only after the current stage.";
  if(["coaches","contracts","freeagency","trades"].includes(phase)){button="Complete Stage & Continue";action="nextStage"}
  else detail+=" Draft preparation, interactive draft, training camp and preseason gameplay are not implemented yet; progression is intentionally locked to prevent accidental skipping.";
 }
 return '<section class="panel"><h2>Franchise Timeline</h2><h3>'+esc(heading)+'</h3><p>'+esc(detail)+'</p>'+
 (button?'<button class="btn" id="timeline-advance" data-action="'+action+'">'+esc(button)+'</button>':'')+
 (phase==="playoffs"?'<p class="muted">Each click simulates only the next round; no skipping directly to the offseason.</p>':'')+
 '</section>';
}
function wffTimelineBind(s,redraw){
 const b=document.getElementById("timeline-advance");if(!b)return;
 b.onclick=()=>{
  const action=b.dataset.action;
  const changed=action==="playoff"&&wffTimelinePhase(s)==="playoffs"?wffPostseasonRound(s):wffTimelineAdvance(s,action);
  if(changed){save();redraw()}
 };
}
