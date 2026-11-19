const {test,expect}=require('@playwright/test');
test('site loads without uncaught JavaScript errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('body')).toBeVisible();
 expect(errors).toEqual([]);
});
test('halftime countdown stays visible for 15 seconds then resumes exactly once',async({page})=>{
 await page.clock.install();
 await page.goto('/');
 const setup=await page.evaluate(()=>{
  if(typeof wffLiveStartHalftimeCountdown!=='function')return 'countdown function unavailable';
  document.body.insertAdjacentHTML('beforeend','<div id="wff-halftime-countdown" role="timer"></div>');
  window.__testTransitions=0;
  window.__originalContinue=wffLiveContinue;
  wffLiveContinue=()=>{window.__testTransitions++;wffLive.breakType=null};
  wffLive={breakType:'halftime',paused:true,complete:false,halftimeRemaining:15};
  wffLiveStartHalftimeCountdown(wffLive);
  wffLiveSchedule();
  return 'ready';
 });
 expect(setup).toBe('ready');
 await page.clock.runFor(14000);
 expect(await page.evaluate(()=>wffLive.halftimeRemaining)).toBe(1);
 expect(await page.evaluate(()=>window.__testTransitions)).toBe(0);
 await page.clock.runFor(1000);
 expect(await page.evaluate(()=>window.__testTransitions)).toBe(1);
 expect(await page.evaluate(()=>wffLive.halftimeRemaining)).toBe(0);
 await page.clock.runFor(3000);
 expect(await page.evaluate(()=>window.__testTransitions)).toBe(1);
 await page.evaluate(()=>{wffLiveStop();wffLiveContinue=window.__originalContinue;wffLive=null});
});
test('halftime graphic shows two teams and no more than three players each',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(()=>{
  if(typeof wffHalftimeView!=='function'||typeof wffTurnoverRoster!=='function')return null;
  const teamsAvailable=typeof teams!=='undefined'&&teams.length>=2;
  if(!teamsAvailable)return null;
  // Avoid mutating a saved franchise: supply a minimal in-memory game fixture.
  const l={us:teams[0],opp:teams[1],score:[10,7],stats:[{plays:22,pass:14,rush:8,yards:180,firstDowns:9},{plays:25,pass:15,rush:10,yards:165,firstDowns:8}],state:{teamId:teams[0].id}};
  try{return wffHalftimeView(l)}catch(e){return 'ERROR: '+e.message}
 });
 expect(result).not.toBeNull();
 expect(result).not.toMatch(/^ERROR:/);
 const wrapper=page.locator('body');
 await wrapper.evaluate((el,html)=>el.insertAdjacentHTML('beforeend',html),result);
 await expect(page.locator('.wff-halftime-graphic')).toBeVisible();
 expect(await page.locator('.wff-half-team').count()).toBe(2);
 for(const team of await page.locator('.wff-half-team').all())expect(await team.locator('.wff-half-player').count()).toBeLessThanOrEqual(3);
});
