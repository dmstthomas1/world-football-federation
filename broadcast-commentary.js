"use strict";
// Optional browser speech synthesis. Local device voices vary in naturalness.
// No remote voice service or prerecorded announcer is installed.
const wffBroadcast={
 voices:[],lastSpokenPlay:-1,
 supported(){return typeof window!=="undefined"&&"speechSynthesis" in window&&"SpeechSynthesisUtterance" in window},
 refresh(){if(this.supported())this.voices=window.speechSynthesis.getVoices().filter(v=>/^en[-_]/i.test(v.lang))},
 select(){this.refresh();const pref=wffAudio.settings.voice||"";return this.voices.find(v=>v.voiceURI===pref)||this.voices.find(v=>/natural|neural|premium|enhanced/i.test(v.name))||this.voices.find(v=>/^en-US/i.test(v.lang))||this.voices[0]||null},
 stop(){if(this.supported())window.speechSynthesis.cancel()},
 speak(message,live,priority=false){
  if(!this.supported()||!wffAudio.settings.enabled||!wffAudio.settings.commentary||!live||live.complete||live.paused)return;
  // Never build an unbounded speech queue, especially at Fast viewing speed.
  if(live.speed==="fast"&&!priority)return;
  const synth=window.speechSynthesis;if(synth.speaking||synth.pending){if(!priority)return;this.stop()}
  const u=new SpeechSynthesisUtterance(message);const v=this.select();if(v)u.voice=v;
  u.lang=v?.lang||"en-US";u.rate=Math.max(.8,Math.min(1.25,Number(wffAudio.settings.speechRate)||1.02));
  u.pitch=.96;u.volume=Math.max(0,Math.min(1,Number(wffAudio.settings.speechVolume??70)/100));
  try{synth.speak(u)}catch{}
 },
 call(type,live,side=0,details={}){
  if(!live||!wffAudio.settings.commentary)return;
  const team=side===0?live.us.city:live.opp.city;
  const close=Math.abs(live.score[0]-live.score[1])<=8,late=live.clock.quarter===4;
  const plays=live.playCount;
  const variants={
   interception:["Picked off! The defense comes away with the football!","Intercepted! A huge change of possession."],
   sack:["The pocket collapses, and the quarterback goes down!","Pressure gets home! A big sack for the defense."],
   throwaway:["Nothing open, and the quarterback wisely throws it away.","Pressure coming. He gets rid of it safely."],
   incomplete:["The pass falls incomplete.","Can't connect on that one. They'll have to try again."],
   runStop:["Nowhere to go! The defense shuts that down.","They meet the runner at the line. No room there."],
   touchdown:[team+" finds the end zone! Touchdown!",team+" scores! What a drive!", "Touchdown, "+team+"! The offense finishes the job."],
   fieldGoalGood:[team+" puts it through the uprights.", "The kick is good for "+team+"."],
   fieldGoalMiss:["No good! "+team+" misses the field goal.", "That kick is off target. No points for "+team+"."],
   fourthFail:["Stopped short! The defense takes over on downs.", "They don't get it! A huge fourth-down stop."],
   fourthTry:["Here we go. Fourth down, and "+team+" is keeping the offense on the field."],
   firstDown:[team+" moves the chains.", "That's enough for a first down for "+team+"."],
   halftime:["That's the end of the first half. Time for adjustments."],
   quarter:["And that's the end of the quarter."],
   final:["The game is over. Final score, "+live.score[0]+" to "+live.score[1]+"."]
  };
  let lines=variants[type];if(!lines)return;
  if(type==="fourthFail"&&late&&close)lines=["What a stand! That fourth-down stop could decide the game."];
  const phrase=lines[(plays+live.clock.quarter+side)%lines.length];
  this.speak(phrase,live,["touchdown","interception","fourthFail","fieldGoalGood","fieldGoalMiss","final"].includes(type));
 },
 controls(){
  const s=wffAudio.settings;
  if(!this.supported())return '<p class="muted">Voice commentary is unavailable in this browser. Text play-by-play and crowd sounds remain available.</p>';
  this.refresh();
  const options='<option value="">Automatic voice selection</option>'+this.voices.map(v=>'<option value="'+esc(v.voiceURI)+'" '+(s.voice===v.voiceURI?"selected":"")+'>'+esc(v.name+" ("+v.lang+")")+'</option>').join("");
  return '<div class="toolbar"><label>Announcer voice <select id="broadcast-voice">'+options+'</select></label><label>Voice speed <select id="broadcast-rate">'+[[.9,"Relaxed"],[1.02,"Natural"],[1.15,"Brisk"]].map(([n,t])=>'<option value="'+n+'" '+(Number(s.speechRate||1.02)===n?"selected":"")+'>'+t+'</option>').join("")+'</select></label><label>Voice volume <input type="range" id="broadcast-volume" min="0" max="100" value="'+(s.speechVolume??70)+'"></label><button class="btn secondary" id="broadcast-preview">Preview announcer</button></div><p class="muted">Voice quality depends on your browser and installed voices. Commentary is optional and never changes game outcomes.</p>';
 },
 bind(){
  const by=id=>document.getElementById(id),s=wffAudio.settings;
  if(by("broadcast-voice"))by("broadcast-voice").onchange=e=>{s.voice=e.target.value;wffAudio.save();this.stop()};
  if(by("broadcast-rate"))by("broadcast-rate").onchange=e=>{s.speechRate=Number(e.target.value);wffAudio.save()};
  if(by("broadcast-volume"))by("broadcast-volume").oninput=e=>{s.speechVolume=Number(e.target.value);wffAudio.save()};
  if(by("broadcast-preview"))by("broadcast-preview").onclick=()=>{this.stop();const u=new SpeechSynthesisUtterance("Welcome to World Football Federation. It's a big night for football.");const v=this.select();if(v)u.voice=v;u.rate=Number(s.speechRate)||1.02;u.volume=(s.speechVolume??70)/100;window.speechSynthesis.speak(u)};
 }
};
if(wffBroadcast.supported()){wffBroadcast.refresh();window.speechSynthesis.addEventListener?.("voiceschanged",()=>wffBroadcast.refresh())}
