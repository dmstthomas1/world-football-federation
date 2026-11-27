const {test,expect}=require('@playwright/test');

async function startGame(page){
 await page.clock.install();
 await page.goto('/');
 page.on('dialog',dialog=>dialog.accept());
 await page.locator('[data-team="23"]').click();
 await page.getByRole('button',{name:'Game Day',exact:true}).click();
 await page.getByRole('button',{name:'Start game',exact:true}).click();
}

test('the offense and defense stop the clock when trailing and save the warning',async({page})=>{
 await startGame(page);
 const steps=await page.evaluate(()=>{
  const l=wffLive,c=l.clock;
  wffLiveStop();
  l.specialTeams=null;
  l.field=50;
  l.down=1;
  l.score=[17,20];
  Object.assign(c,{quarter:4,remaining:49,running:true,playClock:40,twoMinuteWarning:[true,true]});
  wffLiveStep();
  const offense={message:l.events[0].message,time:c.remaining,clock:c.playClock,timeouts:[...c.timeouts]};
  l.possession=1;
  Object.assign(c,{remaining:145,running:true,playClock:40,twoMinuteWarning:[true,false]});
  wffLiveStep();
  const defense={message:l.events[0].message,time:c.remaining,timeouts:[...c.timeouts]};
  Object.assign(c,{remaining:128,running:true,playClock:40});
  wffLiveStep();
  const warning={message:l.events[0].message,time:c.remaining,clock:c.playClock,timeouts:[...c.timeouts]};
  Object.assign(c,{remaining:123,running:false,twoMinuteWarning:[true,false]});
  wffClockSnap(c,'run',{duration:6});
  wffLiveStep();
  const afterPlay={message:l.events[0].message,time:c.remaining,timeouts:[...c.timeouts]};
  wffLiveStop();
  return {offense,defense,warning,afterPlay};
 });
 expect(steps.offense).toEqual({message:expect.stringContaining('Moscow calls an offensive timeout'),time:49,clock:25,timeouts:[2,3]});
 expect(steps.defense).toEqual({message:expect.stringContaining('Moscow calls a defensive timeout'),time:145,timeouts:[1,3]});
 expect(steps.warning).toEqual({message:expect.stringContaining('Two-minute warning'),time:120,clock:25,timeouts:[1,3]});
 expect(steps.afterPlay).toEqual({message:expect.stringContaining('Two-minute warning'),time:117,timeouts:[1,3]});
});

test('clock stoppages and victory formation respect the remaining timeouts',async({page})=>{
 await page.goto('/');
 const cases=await page.evaluate(()=>{
  const clock=wffClockCreate();
  Object.assign(clock,{quarter:4,remaining:304});
  wffClockSnap(clock,'run',{duration:5,outOfBounds:true});
  const lateSideline=clock.running;
  Object.assign(clock,{quarter:2,remaining:151});
  wffClockSnap(clock,'run',{duration:5,outOfBounds:true});
  const earlySideline=clock.running;
  wffClockSnap(clock,'pass_incomplete');
  const incomplete=clock.running;
  const kneel=(remaining,down,timeouts)=>wffClockCanKneel({...clock,quarter:4,remaining,down},7,timeouts);
  return {lateSideline,earlySideline,incomplete,safe:kneel(74,2,0),unsafe:kneel(74,2,1),warning:kneel(121,1,0),fourth:kneel(1,4,0)};
 });
 expect(cases).toEqual({lateSideline:false,earlySideline:true,incomplete:false,safe:true,unsafe:false,warning:false,fourth:false});
});

test('stationary team markers, a single result line and the active QB on a sack',async({page})=>{
 await startGame(page);
 const quarterback=await page.evaluate(()=>{
  const l=wffLive;
  wffLiveStop();
  l.specialTeams=null;
  l.field=50;
  l.state.depth.QB=[2,1,0];
  l.state.roster[2].health.status='Out';
  const starter=l.state.roster[1].name;
  wffCallPlay=()=>({formation:'Shotgun',personnel:'11',defenseFormation:'4-3',play:{kind:'pass',variant:'Trips',concept:'Flood'},defense:{concept:'Cover 3'}});
  wffPenaltyRoll=()=>null;
  l.r=()=>0;
  wffLiveStep();
  return {starter,backup:l.state.roster[0].name};
 });
 await expect(page.locator('.wff-field-play-summary')).toHaveText('Teams are set.');
 const dots=page.locator('.wff-player-marker');
 await expect(dots).toHaveCount(22);
 const positions=()=>dots.evaluateAll(list=>list.map(el=>{
  const circle=el.querySelector('circle');
  return [circle.getAttribute('cx'),circle.getAttribute('cy'),circle.getAttribute('fill'),getComputedStyle(el).animationName];
 }));
 const before=await positions();
 expect([...new Set(before.map(row=>row[2]))].sort()).toEqual(['#111318','#ffffff']);
 expect(before.every(row=>row[3]==='none')).toBe(true);
 await page.clock.runFor(1100);
 expect(await positions()).toEqual(before);
 await expect(page.locator('.wff-big-moment')).toHaveAttribute('aria-label','Sack!');
 await expect(page.locator('.wff-field-play-summary')).toContainText(quarterback.starter+' sacked');
 await expect(page.locator('.wff-field-play-summary')).not.toContainText(quarterback.backup);
 await expect(page.getByText('Live Play-by-Play',{exact:true})).toHaveCount(0);
 await expect(page.locator('#audio-enabled, #audio-test, script[src*="stadium-audio"], script[src*="broadcast-commentary"]')).toHaveCount(0);
});

test('scores and turnovers display a graphic without replacing the result line',async({page})=>{
 await startGame(page);
 const scenarios=[
  ['touchdown','Touchdown!'],['field-goal','Field goal good!'],['missed-field-goal','Field goal missed'],
  ['safety','Safety!'],['interception','Interception!'],['fumble-offense','Fumble recovered!'],['fumble-defense','Fumble recovered!']
 ];
 for(const [kind,title] of scenarios){
  await page.evaluate(kind=>{
   const l=wffLive;
   wffLiveStop();
   l.specialTeams=null;l.possession=0;l.field=kind==='touchdown'?99:kind==='safety'?1:70;
   l.down=1;l.toGo=kind==='touchdown'?1:10;
   l.score=[0,3];
   Object.assign(l.clock,{quarter:1,remaining:300,running:false});
   const pass=['touchdown','interception','safety'].includes(kind);
   wffCallPlay=()=>({formation:'Shotgun',personnel:'11',defenseFormation:'4-3',play:{kind:pass?'pass':'run',variant:'Trips',concept:'Flood'},defense:{concept:'Cover 3'}});
   wffPenaltyRoll=()=>null;
   wffPassRushOutcome=()=>({sack:kind==='safety',yards:5,quarterback:wffTurnoverQB(l,0),defender:{name:'Defender'}});
   wffTurnoverPass=()=>kind==='interception'?{type:'interception',qb:'Quarterback',defender:'Defender'}:null;
   wffTurnoverFumble=()=>kind.startsWith('fumble')?{type:kind==='fumble-defense'?'fumbleLost':'fumbleRetained',carrier:'Runner',defender:'Defender',recoveredByDefense:kind==='fumble-defense'}:null;
   l.r=()=>kind==='missed-field-goal'?.99:.3;
   if(kind.includes('field-goal')){
    l.moments=[];l.playResult=null;l.snapLineup=null;
    wffLiveFieldGoal(l,{name:'Test Kicker'},{distance:47,probability:.75});
   }else wffLiveStep();
  },kind);
  await page.clock.runFor(1100);
  await expect(page.locator('.wff-big-moment')).toHaveAttribute('aria-label',title);
  await expect(page.locator('.wff-field-play-summary')).toBeVisible();
  await expect(page.locator('.wff-big-moment')).toHaveCSS('background-image',/stadium-broadcast\.webp/);
 }
});

test('a live game shows the halftime graphic for 15 seconds, then resets second-half timeouts',async({page})=>{
 await startGame(page);
 await page.evaluate(()=>{
  wffLiveStop();
  wffLive.specialTeams=null;
  const clock=wffLive.clock;
  Object.assign(clock,{quarter:2,remaining:0,timeouts:[1,0]});
  wffLiveEndPeriod();wffLiveRender();wffLiveSchedule();
 });
 await expect(page.getByRole('heading',{name:'HALFTIME',exact:true})).toBeVisible();
 await expect(page.locator('#wff-halftime-countdown')).toContainText('15 seconds');
 await page.clock.runFor(14000);
 await expect(page.locator('#wff-halftime-countdown')).toContainText('1 second');
 await page.clock.runFor(1000);
 await expect(page.getByRole('heading',{name:'HALFTIME',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>[wffLive.clock.quarter,wffLive.clock.timeouts])).toEqual([3,[3,3]]);
});

test('the late offense can spike without timeouts and attempt a field goal before fourth down',async({page})=>{
 await startGame(page);
 const results=await page.evaluate(()=>{
  const l=wffLive,c=l.clock;
  wffLiveStop();
  l.specialTeams=null;l.possession=0;l.field=75;l.down=1;l.toGo=10;l.score=[10,13];
  Object.assign(c,{quarter:4,remaining:18,running:true,playClock:40,timeouts:[0,0],twoMinuteWarning:[true,true]});
  l.r=()=>0;
  wffLiveStep();
  const spike={message:l.playResult.message,down:l.down,remaining:c.remaining,running:c.running};
  c.remaining=7;
  wffLiveStep();
  const kick={score:[...l.score],graphic:l.moments.at(-1).kind,down:l.down};
  wffLiveStop();
  return {spike,kick};
 });
 expect(results.spike).toEqual({message:expect.stringContaining('spikes'),down:2,remaining:12,running:false});
 expect(results.kick).toEqual({score:[13,13],graphic:'field-goal',down:2});
});

test('a score as the first quarter ends leads to a kickoff in the second quarter',async({page})=>{
 await startGame(page);
 const phase=await page.evaluate(()=>{
  const l=wffLive;
  wffLiveStop();
  l.specialTeams=null;
  l.clock.remaining=3;
  l.r=()=>0;
  wffLiveFieldGoal(l,{name:'Test Kicker'},{distance:47,probability:.75});
  wffSpecialTeamsAdvance(l);
  wffLiveStop();
  return [l.clock.quarter,l.clock.remaining,l.specialTeams?.type];
 });
 expect(phase).toEqual([2,900,'kickoff']);
});
