"use strict";
// Procedural, original stadium sound effects. No external sound files or autoplay.
const WFF_AUDIO_KEY="wff-audio-v1";
const wffAudio={
 settings:{enabled:true,crowd:75,effects:85,commentary:true},ctx:null,active:[],lastEvent:"",
 load(){try{const s=JSON.parse(localStorage.getItem(WFF_AUDIO_KEY));if(s&&typeof s==="object")this.settings={...this.settings,...s}}catch{}},
 save(){try{localStorage.setItem(WFF_AUDIO_KEY,JSON.stringify(this.settings))}catch{}},
 unlock(){if(!this.settings.enabled)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;if(!this.ctx)this.ctx=new C();if(this.ctx.state==="suspended")this.ctx.resume().catch(()=>{})}catch{}},
 stop(){for(const n of this.active){try{n.stop()}catch{}}this.active=[]},
 tone(frequency,duration,volume,type="sine",delay=0){
  if(!this.ctx||this.ctx.state!=="running")return;
  const c=this.ctx,osc=c.createOscillator(),gain=c.createGain(),start=c.currentTime+delay;
  osc.type=type;osc.frequency.setValueAtTime(frequency,start);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain).connect(c.destination);osc.start(start);osc.stop(start+duration+.04);this.active.push(osc);
  osc.onended=()=>{this.active=this.active.filter(x=>x!==osc);osc.disconnect();gain.disconnect()};
 },
 noise(duration,volume,delay=0,low=200,high=1900){
  if(!this.ctx||this.ctx.state!=="running")return;
  const c=this.ctx,sr=c.sampleRate,length=Math.floor(sr*duration),buffer=c.createBuffer(1,length,sr),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1);
  const src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),start=c.currentTime+delay;
  src.buffer=buffer;filter.type="bandpass";filter.frequency.value=(low+high)/2;filter.Q.value=.6;
  gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.10);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  src.connect(filter).connect(gain).connect(c.destination);src.start(start);src.stop(start+duration+.02);
  this.active.push(src);src.onended=()=>{this.active=this.active.filter(x=>x!==src);src.disconnect();filter.disconnect();gain.disconnect()};
 },
 play(type,homePositive=true,intensity=1){
  if(!this.settings.enabled||!this.ctx||this.ctx.state!=="running")return;
  this.stop();const crowd=this.settings.crowd/100*.12*intensity,effects=this.settings.effects/100*.085;
  if(type==="touchdown"||type==="fieldGoalGood"||type==="turnover"){
   this.noise(homePositive?1.8:1.1,crowd*(homePositive?1.25:.4),0,250,2300);
   if(homePositive){for(let i=0;i<4;i++)this.tone(240+i*65,.24,effects,"triangle",i*.18)}
   else this.tone(170,.65,effects*.6,"sawtooth");
  }else if(type==="fourthFail"||type==="fieldGoalMiss"){
   this.noise(.85,crowd*.65,0,130,850);this.tone(homePositive?155:310,.6,effects*.75,"sine");
  }else if(type==="critical"){
   this.noise(1.2,crowd*.72,0,280,1700);this.tone(110,.25,effects*.25,"triangle",.12);
  }else if(type==="quarter"||type==="halftime"){
   this.tone(390,.3,effects*.6,"triangle");this.tone(310,.35,effects*.5,"triangle",.32);
  }else if(type==="snap"){
   this.noise(.22,crowd*.18,0,200,1000);
  }
 },
 event(type,side,live){
  if(!live||!this.settings.enabled)return;
  const homePositive=side===0;
  const late=live.clock.quarter>=4,close=Math.abs(live.score[0]-live.score[1])<=8;
  const intensity=late&&close?1.3:1;
  this.play(type,homePositive,intensity);
 },
 controls(){
  const s=this.settings;
  return '<section class="panel"><h3>Stadium Audio</h3><div class="toolbar"><label><input type="checkbox" id="audio-enabled" '+(s.enabled?"checked":"")+'> Enable sound</label><button class="btn secondary" id="audio-test">Enable / Test Sound</button></div><div class="toolbar"><label>Crowd volume <input id="audio-crowd" type="range" min="0" max="100" value="'+s.crowd+'"></label><strong id="audio-crowd-value">'+s.crowd+'%</strong><label>Effects volume <input id="audio-effects" type="range" min="0" max="100" value="'+s.effects+'"></label><strong id="audio-effects-value">'+s.effects+'%</strong></div><label><input type="checkbox" id="audio-commentary" '+(s.commentary?"checked":"")+'> Commentary audio when available</label><p class="muted">Original synthesized crowd reactions and stadium cues. Spoken commentary is not implemented. Browser audio begins after you press Enable / Test Sound.</p></section>';
 },
 bind(){
  const s=this.settings,by=id=>document.getElementById(id);
  const en=by("audio-enabled");if(!en)return;
  en.onchange=()=>{s.enabled=en.checked;if(!s.enabled)this.stop();else this.unlock();this.save()};
  for(const key of ["crowd","effects"]){const el=by("audio-"+key);el.oninput=()=>{s[key]=Number(el.value);by("audio-"+key+"-value").textContent=s[key]+"%";this.save()}}
  by("audio-commentary").onchange=e=>{s.commentary=e.target.checked;this.save()};
  by("audio-test").onclick=()=>{this.unlock();this.play("touchdown",true,.75)};
 }
};
wffAudio.load();
