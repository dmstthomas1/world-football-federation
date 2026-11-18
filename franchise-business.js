"use strict";
// WFF fictional business economy. Monetary amounts USD millions; no salary-cap linkage.
const WFF_BUSINESS_CATEGORIES=["tickets","premium","merchandise","concessions","sponsorships","broadcast"];
const WFF_BUSINESS_PRODUCTS=[
["Jerseys",.34],["Sweatshirts & Hoodies",.22],["Hats",.15],["T-Shirts",.16],["Other Merchandise",.13]
];
const WFF_CONCESSIONS=[
["Hot Dogs & Meals",.35],["Beer",.27],["Soda & Water",.24],["Candy & Snacks",.14]
];
function wffBusinessInit(state){
 if(state.business){return wffBusinessUpgrade(state)}
 const r=wffRandom(state.teamId,"business-v1");
 const seats=44000+Math.round(r()*34000/1000)*1000;
 state.business={auto:true,capacity:seats,premiumShare:.07+r()*.11,
 market:Math.round((.65+r()*.75)*100)/100,fanLoyalty:Math.round((.55+r()*.35)*100)/100,
 executive:{name:["Morgan","Avery","Casey","Jordan","Taylor"][Math.floor(r()*5)]+" "+["Bennett","Santos","Reed","Kim","Morgan"][Math.floor(r()*5)],skill:50+Math.floor(r()*46),specialty:WFF_BUSINESS_CATEGORIES[Math.floor(r()*WFF_BUSINESS_CATEGORIES.length)]},
 prices:{ticket:70+Math.round(r()*65),premium:230+Math.round(r()*240),merch:1,concessions:1},
 ledger:[],revenue:0,expenses:0,profit:0,homeGames:0,ownerReaction:"Awaiting first financial report",lastReportWeek:0};
 wffBusinessUpgrade(state);return true;
}
function wffBusinessProjection(state,gameIndex=0){
 const b=state.business,skill=b.executive.skill/100,record=(state.wins+state.losses)>0?state.wins/(state.wins+state.losses):.5;
 const baseDemand=Math.min(.97,Math.max(.35,.58+b.fanLoyalty*.22+(record-.5)*.25+(b.market-1)*.13+(skill-.7)*.07));
 const effectiveTicket=b.prices.ticket, effectivePremium=b.prices.premium;
 const generalElastic=Math.max(.45,1-(effectiveTicket-105)/300);
 const premiumElastic=Math.max(.42,1-(effectivePremium-350)/1000);
 const premiumSeats=Math.round(b.capacity*b.premiumShare),standardSeats=b.capacity-premiumSeats;
 const standardAttendance=Math.round(standardSeats*Math.min(.99,baseDemand*generalElastic));
 const premiumAttendance=Math.round(premiumSeats*Math.min(.99,(baseDemand+.10)*premiumElastic));
 const promo=wffPromotionForGame(state,gameIndex);const lift=promo==="family"?1.09:promo==="jersey"?1.035:promo==="food"?1.025:1;const attendance=Math.min(b.capacity,Math.round((standardAttendance+premiumAttendance)*lift));
 const ticketRevenue=standardAttendance*effectiveTicket/1e6*(promo==="family"?.91:1);
 const premiumRevenue=premiumAttendance*effectivePremium/1e6;
 const merchPerFan=(19+skill*8)*b.prices.merch*Math.max(.55,1-(b.prices.merch-1)*.7);
 const foodPerFan=(18+skill*7)*b.prices.concessions*Math.max(.55,1-(b.prices.concessions-1)*.8);
 const merchandise=attendance*merchPerFan/1e6*(promo==="jersey"?1.18:1),concessions=attendance*foodPerFan/1e6*(promo==="food"?1.13:1);
 const sponsorships=(.75+b.market*.85+skill*.45)*(1+(record-.5)*.22);
 const broadcast=(2.8+b.market*1.3)*(1+(record-.5)*.12);
 const revenue=ticketRevenue+premiumRevenue+merchandise+concessions+sponsorships+broadcast;
 const expenses=1.8+attendance*.000018+merchandise*.58+concessions*.64+sponsorships*.11+broadcast*.04+(promo==="none"?0:.12);
 return {promotion:promo,attendance,occupancy:attendance/b.capacity,standardAttendance,premiumAttendance,tickets:ticketRevenue,premium:premiumRevenue,merchandise,concessions,sponsorships,broadcast,revenue,expenses,profit:revenue-expenses};
}
function wffBusinessAuto(state){
 const b=state.business,skill=b.executive.skill/100;
 const record=(state.wins+state.losses)>0?state.wins/(state.wins+state.losses):.5;
 // Better executives avoid extreme prices and respond gradually to demand.
 b.prices.ticket=Math.round(Math.max(55,Math.min(180,88+b.market*23+(record-.5)*25+skill*12)));
 b.prices.premium=Math.round(Math.max(180,Math.min(650,275+b.market*95+(record-.5)*60+skill*40)));
 b.prices.merch=Math.round((.94+skill*.12)*100)/100;
 b.prices.concessions=Math.round((.93+skill*.12)*100)/100;
}
function wffBusinessRecordGame(state,game){
 const b=state.business;if(!b)return null;
 if(b.auto)wffBusinessAuto(state);
 const p=wffBusinessProjection(state,b.homeGames);
 const entry={year:state.finance?.year||2026,week:game.week,opponent:game.away,...p,prices:{...b.prices}};
 b.ledger.push(entry);b.homeGames++;b.revenue+=p.revenue;b.expenses+=p.expenses;b.profit+=p.profit;wffBusinessAnnualUpdate(state);
 const concern=b.profit<0||p.occupancy<.55;
 const pleased=p.occupancy>.85&&p.profit>3;
 b.ownerReaction=concern?"Owner concerned: improve attendance and operating results.":pleased?"Owner pleased: strong attendance and positive operating results.":"Owner monitoring business performance.";
 if(state.owner){state.owner.trust=Math.max(0,Math.min(100,state.owner.trust+(concern?-1:pleased?1:0)))}
 return entry;
}
function wffBusinessMoney(n){return "$"+(Number(n)||0).toFixed(2)+"M"}
function wffBusinessView(state){
 const b=state.business;wffBusinessUpgrade(state);const p=wffBusinessProjection(state,b.homeGames),annual=wffBusinessAnnualUpdate(state);
 const rows=[["Standard tickets",p.tickets],["Premium seating",p.premium],["Jerseys, apparel & merchandise",p.merchandise],["Food, beer, soda & snacks",p.concessions],["Advertising & sponsorships",p.sponsorships],["Broadcast rights allocation",p.broadcast]];
 const merchandise=WFF_BUSINESS_PRODUCTS.map(([name,share])=>'<span>'+name+' '+Math.round(share*100)+'%</span>').join(" • ");
 const food=WFF_CONCESSIONS.map(([name,share])=>'<span>'+name+' '+Math.round(share*100)+'%</span>').join(" • ");
 return '<section class="panel"><h2>Franchise Business Operations</h2><p class="muted">Fictional operating model in USD millions. Separate from the football salary cap. Revenue and expense figures are estimates, not real team financials.</p><div class="grid"><div class="stat"><small>Season revenue</small><b>'+wffBusinessMoney(b.revenue)+'</b></div><div class="stat"><small>Operating expenses</small><b>'+wffBusinessMoney(b.expenses)+'</b></div><div class="stat"><small>Operating profit*</small><b>'+wffBusinessMoney(b.profit)+'</b></div><div class="stat"><small>Home games recorded</small><b>'+b.homeGames+'</b></div></div><p class="muted">*Venue-day operating profit before player payroll, financing, taxes, and other annual overhead. Not franchise net income.</p><div class="line"><strong>Business executive</strong><span>'+esc(b.executive.name)+' • '+esc(b.executive.specialty)+' • '+b.executive.skill+'/100</span></div><div class="line"><strong>Stadium capacity</strong><span>'+b.capacity.toLocaleString()+' • '+Math.round(b.premiumShare*100)+'% premium</span></div><div class="notice">'+esc(b.ownerReaction)+'</div></section>'+
 '<section class="panel"><h2>Annual Business Budget</h2><div class="grid"><div class="stat"><small>Projected annual revenue</small><b>'+wffBusinessMoney(annual.projectedRevenue)+'</b></div><div class="stat"><small>Projected annual expenses</small><b>'+wffBusinessMoney(annual.projectedExpenses)+'</b></div><div class="stat"><small>Projected annual net income</small><b>'+wffBusinessMoney(annual.projectedNet)+'</b></div><div class="stat"><small>Cash reserves</small><b>'+wffBusinessMoney(b.cashReserves)+'</b></div></div><p class="muted">Annual expenses include estimated player payroll, coaching/front-office salaries, stadium upkeep, travel, administration, financing and taxes. League distributions are budgeted separately from per-game broadcast allocation. Projections assume nine home games and remain illustrative until the full schedule and season rollover exist.</p>'+annual.lines.map(([label,value])=>'<div class="line"><span>'+label+'</span><strong>'+wffBusinessMoney(value)+'</strong></div>').join("")+'<p class="notice">'+esc(b.ownerReaction)+'</p></section><section class="panel"><h2>Pricing & Management</h2><label><input type="checkbox" id="business-auto" '+(b.auto?'checked':'')+'> Auto Manage Business</label><p class="muted">Auto mode uses executive ability, market demand, and team performance to adjust pricing. Manual changes are retained until Auto Manage is enabled.</p><div class="grid">'+[["ticket","Standard ticket ($)",45,250,1],["premium","Premium ticket ($)",140,1000,5],["merch","Merchandise price multiplier",.7,1.6,.05],["concessions","Concessions price multiplier",.7,1.6,.05]].map(([key,label,min,max,step])=>'<label class="stat"><strong>'+label+'</strong><br><input style="width:100%" type="number" data-business-price="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+b.prices[key]+'" '+(b.auto?'disabled':'')+'></label>').join("")+'</div></section>'+
 '<section class="panel"><h2>Sunday Promotions</h2><p class="muted">Select a promotion for the next home game or let the business executive choose. Promotions have a cost and can improve attendance or spending; results are not guaranteed.</p><label>Promotion <select id="business-promotion"><option value="auto" '+(b.promotion==="auto"?"selected":"")+'>Auto Select</option>'+[["none","No Promotion"],["family","Family Ticket Sunday"],["jersey","Jersey & Apparel Sunday"],["food","Concessions Sunday"]].map(([key,label])=>'<option value="'+key+'" '+(b.promotion===key?"selected":"")+'>'+label+'</option>').join("")+'</select></label></section><section class="panel"><h2>Projected Next Home Game</h2><p class="muted">Promotion: '+esc(wffPromotionLabel(p.promotion))+'</p><p>Estimated attendance: <strong>'+p.attendance.toLocaleString()+'</strong> ('+Math.round(p.occupancy*100)+'% capacity)</p>'+rows.map(([label,value])=>'<div class="line"><span>'+label+'</span><strong>'+wffBusinessMoney(value)+'</strong></div>').join("")+'<div class="line"><strong>Projected game-day operating profit</strong><strong>'+wffBusinessMoney(p.profit)+'</strong></div><p class="muted">Merchandise mix: '+merchandise+'</p><p class="muted">Concessions mix: '+food+'</p></section>'+
 '<section class="panel"><h2>Recent Home-Game Financial Reports</h2>'+(b.ledger.length?b.ledger.slice(-6).reverse().map(x=>'<div class="line"><span>Week '+x.week+' • '+esc(x.opponent)+' • '+x.attendance.toLocaleString()+' fans</span><strong>'+wffBusinessMoney(x.profit)+'</strong></div>').join(""):'<p class="muted">No home games recorded yet.</p>')+'</section>';
}
function wffBusinessBind(state,redraw){
 const b=state.business;document.getElementById("business-promotion").onchange=e=>{b.promotion=e.target.value;save();redraw()};document.getElementById("business-auto").onchange=e=>{b.auto=e.target.checked;if(b.auto)wffBusinessAuto(state);save();redraw()};
 document.querySelectorAll("[data-business-price]").forEach(el=>el.onchange=()=>{if(b.auto)return;const key=el.dataset.businessPrice;const n=Number(el.value);const bounds={ticket:[45,250],premium:[140,1000],merch:[.7,1.6],concessions:[.7,1.6]};if(Number.isFinite(n)){b.prices[key]=Math.min(bounds[key][1],Math.max(bounds[key][0],n));save()}redraw()});
}

function wffBusinessUpgrade(state){
 const b=state.business;let changed=false;
 if(!b.promotion){b.promotion="auto";changed=true}
 if(!Number.isFinite(b.cashReserves)){b.cashReserves=Math.round((12+b.market*28)*100)/100;changed=true}
 if(!b.annual){b.annual={};changed=true}
 if(!b.budgetVersion){b.budgetVersion=1;changed=true}
 return changed;
}
function wffPromotionForGame(state,index){
 const b=state.business;if(b.promotion!=="auto")return b.promotion;
 const skill=b.executive.skill,choices=["none","family","jersey","food"];
 return choices[(state.teamId+index+Math.floor(skill/20))%choices.length];
}
function wffPromotionLabel(key){return ({none:"No Promotion",family:"Family Ticket Sunday",jersey:"Jersey & Apparel Sunday",food:"Concessions Sunday"})[key]||"No Promotion"}
function wffBusinessAnnualUpdate(state){
 const b=state.business;wffBusinessUpgrade(state);
 const year=state.finance?.year||2026;
 const games=9,played=b.ledger.filter(x=>x.year===year);
 const actualRevenue=played.reduce((n,x)=>n+x.revenue,0),actualExpenses=played.reduce((n,x)=>n+x.expenses,0);
 const futureCount=Math.max(0,games-played.length);
 const next=wffBusinessProjection(state,b.homeGames);
 const market=b.market,skill=b.executive.skill/100;
 const sharedDistribution=62+market*10;
 const commercial=6+market*9+skill*3;
 const payroll=state.roster.reduce((sum,p)=>sum+(p.contract?.annual||0),0)+state.practiceSquad.reduce((sum,p)=>sum+(p.contract?.annual||0),0);
 const staff=9+skill*5;
 const upkeep=9+b.capacity/9000;
 const travel=8+market*3;
 const operations=13+market*4;
 const financing=3+market*2;
 const gross=actualRevenue+futureCount*next.revenue+sharedDistribution+commercial;
 const variable=actualExpenses+futureCount*next.expenses;
 const pretax=gross-variable-payroll-staff-upkeep-travel-operations-financing;
 const taxes=Math.max(0,pretax)*.22;
 const totalExpenses=variable+payroll+staff+upkeep+travel+operations+financing+taxes;
 const annual={year,projectedRevenue:gross,projectedExpenses:totalExpenses,projectedNet:gross-totalExpenses,lines:[["League revenue-sharing distribution",sharedDistribution],["Non-game commercial partnerships",commercial],["Player cash payroll",payroll],["Coaching & front-office staff",staff],["Stadium upkeep",upkeep],["Travel & logistics",travel],["Administration & operations",operations],["Financing",financing],["Estimated taxes",taxes]]};
 b.annual=annual;
 if(state.owner){
 const priority=state.owner.type==="Financial Steward"?12:state.owner.type==="Win Now"?-8:0;
 const threshold=priority;
 b.ownerReaction=annual.projectedNet<threshold?"Owner concerned about the projected annual bottom line.":annual.projectedNet>threshold+15?"Owner pleased with projected annual financial performance.":"Owner monitoring annual profitability and team performance.";
 }
 return annual;
}
