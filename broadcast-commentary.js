"use strict";
// Optional browser speech synthesis. Local device voices vary in naturalness.
// No remote voice service or prerecorded announcer is installed.
const wffBroadcast={
 voices:[],lastSpokenPlay:-1,queue:[],speaking:false,token:0,
 supported(){return typeof window!=="undefined"&&"speechSynthesis" in window&&"SpeechSynthesisUtterance" in window},
 refresh(){if(this.supported())this.voices=window.speechSynthesis.getVoices().filter(v=>/^en[-_]/i.test(v.lang))},
 select(role="play"){this.refresh();const settings=wffAudio.settings;const pref=role==="analyst"?settings.analystVoice:settings.voice;const primary=this.voices.find(v=>v.voiceURI===settings.voice);const chosen=this.voices.find(v=>v.voiceURI===pref);if(chosen)return chosen;const ranked=this.voices.find(v=>/natural|neural|premium|enhanced/i.test(v.name))||this.voices.find(v=>/^en-US/i.test(v.lang))||this.voices[0]||null;if(role==="analyst")return this.voices.find(v=>v.voiceURI!==primary?.voiceURI&&/^en-US/i.test(v.lang))||this.voices.find(v=>v.voiceURI!==ranked?.voiceURI)||ranked;return ranked},
 stop(){this.token++;this.queue=[];this.speaking=false;if(this.supported())window.speechSynthesis.cancel()},
 drain(token){
  if(token!==this.token||this.speaking||!this.queue.length||!this.supported())return;
  const item=this.queue.shift(),u=new SpeechSynthesisUtterance(item.message),v=this.select(item.role);
  if(v)u.voice=v;u.lang=v?.lang||"en-US";
  const rate=Number(wffAudio.settings.speechRate)||1.02;
  u.rate=Math.max(.8,Math.min(1.25,rate*(item.role==="analyst"?.94:1)));
  u.pitch=item.role==="analyst"?.91:1.03;
  u.volume=Math.max(0,Math.min(1,Number(wffAudio.settings.speechVolume??70)/100));
  this.speaking=true;
  const finish=()=>{if(token!==this.token)return;this.speaking=false;this.drain(token)};
  u.onend=finish;u.onerror=finish;
  try{window.speechSynthesis.speak(u)}catch{finish()}
 },
 speak(message,live,priority=false,role="play"){
  if(!this.supported()||!wffAudio.settings.enabled||!wffAudio.settings.commentary||!live||live.complete||live.paused)return;
  if(live.speed==="fast"&&!priority)return;
  if(priority)this.stop();
  else if(this.queue.length||this.speaking)return;
  this.queue.push({message,role});this.drain(this.token);
 },
 duo(main,analysis,live,priority=false){
  if(!this.supported()||!wffAudio.settings.enabled||!wffAudio.settings.commentary||!live||live.complete||live.paused)return;
  if(live.speed==="fast"&&!priority)return;
  if(priority)this.stop();else if(this.speaking||this.queue.length)return;
  this.queue.push({message:main,role:"play"});
  if(analysis&&live.speed==="slow")this.queue.push({message:analysis,role:"analyst"});
  this.drain(this.token);
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
  const analyst={
   interception:["That defender read the quarterback beautifully.","You cannot afford to give away possessions in a tight game."],
   sack:["The protection broke down before that play could develop.","That's the kind of pressure that changes a drive."],
   throwaway:["Good decision. Protect the football and live for the next down."],
   incomplete:["The defense held its coverage on that snap."],
   runStop:["Excellent discipline at the point of attack."],
   touchdown:["That's what finishing a drive looks like.","A big moment for this offense."],
   fieldGoalGood:["Three points on the board. Every possession matters."],
   fieldGoalMiss:["Those missed opportunities can come back to haunt you."],
   fourthFail:["The defense wins the leverage battle on a critical down."],
   firstDown:["That's how you keep a drive alive."],
   halftime:["Both coaching staffs have some decisions to make."],
   final:["Plenty for both teams to take away from this one."]
  };
  const insight=analyst[type]?.[(plays+side)%analyst[type].length]||"";
  this.duo(phrase,insight,live,["touchdown","interception","fourthFail","fieldGoalGood","fieldGoalMiss","final"].includes(type));
 },
 controls(){
  const s=wffAudio.settings;
  if(!this.supported())return '<p class="muted">Browser voice commentary is unavailable here.</p>';
  this.refresh();
  const opts=(chosen)=>'<option value="">Automatic voice selection</option>'+this.voices.map(v=>'<option value="'+esc(v.voiceURI)+'" '+(chosen===v.voiceURI?"selected":"")+'>'+esc(v.name+" ("+v.lang+")")+'</option>').join("");
  return '<div class="toolbar"><label>Play-by-play voice <select id="broadcast-voice">'+opts(s.voice)+'</select></label><label>Color analyst voice <select id="broadcast-analyst-voice">'+opts(s.analystVoice)+'</select></label></div><div class="toolbar"><label>Voice speed <select id="broadcast-rate">'+[[.9,"Relaxed"],[1.02,"Natural"],[1.15,"Brisk"]].map(([n,t])=>'<option value="'+n+'" '+(Number(s.speechRate||1.02)===n?"selected":"")+'>'+t+'</option>').join("")+'</select></label><label>Voice volume <input type="range" id="broadcast-volume" min="0" max="100" value="'+(s.speechVolume??70)+'"></label><button class="btn secondary" id="broadcast-preview">Preview both announcers</button></div><p class="muted">Two announcers take turns: play-by-play first, then analysis on Slow speed. Voice quality depends on your installed browser voices. No paid service or API key required.</p>';
 },
 bind(){
  const by=id=>document.getElementById(id),s=wffAudio.settings;
  for(const [id,key] of [["broadcast-voice","voice"],["broadcast-analyst-voice","analystVoice"]])if(by(id))by(id).onchange=e=>{s[key]=e.target.value;wffAudio.save();this.stop()};
  if(by("broadcast-rate"))by("broadcast-rate").onchange=e=>{s.speechRate=Number(e.target.value);wffAudio.save()};
  if(by("broadcast-volume"))by("broadcast-volume").oninput=e=>{s.speechVolume=Number(e.target.value);wffAudio.save()};
  if(by("broadcast-preview"))by("broadcast-preview").onclick=()=>{
   this.stop();const fake={speed:"slow",paused:false,complete:false};
   const old=s.commentary,enabled=s.enabled;s.commentary=true;s.enabled=true;
   this.duo("Welcome to World Football Federation. We've got a great matchup today.","Both teams have plenty to prove. Let's see who controls the line of scrimmage.",fake,true);
   s.commentary=old;s.enabled=enabled;
  };
 }
};
if(wffBroadcast.supported()){wffBroadcast.refresh();window.speechSynthesis.addEventListener?.("voiceschanged",()=>wffBroadcast.refresh())}
