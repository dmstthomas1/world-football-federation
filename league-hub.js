"use strict";
// WFF league hub. Team rankings use recorded league scores, not simulated box scores.
// Individual leaderboards use tracked live-game statistics only; no invented player totals.
function wffDivisionName(t){return t.conference+" — "+t.region}
function wffLeagueTeamGames(state,id){return Object.values(state.leagueResults||{}).filter(g=>g.home===id||g.away===id)}
function wffLeagueTeamMetrics(state){
 return wffStandings(state).map(r=>{const games=r.w+r.l+r.t;return {...r,team:teams[r.id],games,ppg:games?r.pf/games:0,allowed:games?r.pa/games:0,differential:r.pf-r.pa}})
}
function wffLeagueRankings(state,mode){
 const rows=wffLeagueTeamMetrics(state);
 if(mode==="offense")rows.sort((a,b)=>b.ppg-a.ppg||b.pf-a.pf||a.id-b.id);
 else if(mode==="defense")rows.sort((a,b)=>a.allowed-b.allowed||a.pa-b.pa||a.id-b.id);
 else rows.sort(wffRank);
 return rows;
}
function wffLeagueStatsView(state){
 wffEnsureLeagueBoxScores(state);const played=Object.keys(state.leagueResults||{}).length;
 let html='<section class="panel"><h2>League Rankings & Statistics</h2><p class="muted">Rankings update after completed weeks. Offensive and defensive rankings currently use points scored and points allowed per game. Full yardage, rushing, passing and individual statistical leaders require league-wide play-by-play tracking.</p><p>'+played+' of 272 regular-season games recorded.</p></section>';
 for(const [mode,label,metric] of [["record","Overall standings","Record"],["offense","Offensive rankings","Points per game"],["defense","Defensive rankings","Points allowed per game"]]){
  const rows=wffLeagueRankings(state,mode);
  html+='<section class="panel"><h2>'+label+'</h2><div class="line"><strong>Rank / Franchise</strong><strong>'+metric+'</strong></div>';
  rows.forEach((r,i)=>{const val=mode==="record"?r.w+"–"+r.l+(r.t?"–"+r.t:""):r.games?(mode==="offense"?r.ppg:r.allowed).toFixed(1):"—";
   html+='<div class="line"><span>'+(i+1)+'. '+wffLogo(r.team,28)+' '+esc(teamLabel(r.team))+' <small class="muted">('+esc(wffDivisionName(r.team))+')</small></span><strong>'+val+'</strong></div>'});
  html+='</section>';
 }
 html+='<section class="panel"><h2>Individual Player Statistics</h2><p class="muted">The current live simulator does not yet save complete individual passing, rushing, receiving, tackling and turnover box scores. Player leaderboards will appear here when those events are attributed and saved. No fictional individual totals are shown as facts.</p></section>';
 const categories=[["Passing Yards","passYds"],["Passing TDs","passTd"],["Rushing Yards","rushYds"],["Receiving Yards","recYds"],["Receiving TDs","recTd"],["Tackles","tackles"],["Sacks","sacks"],["Defensive Interceptions","defInt"],["Field Goals Made","fgm"]];
 const players=wffSeasonPlayers(state);
 for(const [label,key] of categories){
  const leaders=players.filter(p=>p[key]>0).sort((a,b)=>b[key]-a[key]).slice(0,12);
  html+='<section class="panel"><h2>'+label+' — Player Leaders</h2><p class="muted">Modeled estimates from completed games</p>';
  for(const [i,p] of leaders.entries())html+='<div class="line"><span>'+(i+1)+'. '+esc(p.name)+' ('+esc(p.position)+') • '+wffLogo(teams[p.teamId],24)+' '+esc(teamLabel(teams[p.teamId]))+'</span><strong>'+p[key]+'</strong></div>';
  html+='</section>';
 }
 return html;
}
function wffLeagueUpcoming(state){
 let html='<section class="panel"><h2>Upcoming League Schedule</h2><p class="muted">Scheduled fixtures across all 32 franchises. Scores appear only after a week is completed.</p>';
 const from=Math.max(0,Math.min(17,(state.week||1)-1));
 for(let week=from;week<Math.min(18,from+3);week++){
  html+='<h3>Week '+(week+1)+'</h3>';
  for(const g of state.leagueSchedule.weeks[week]){
   const result=state.leagueResults?.[g.id];
   html+='<div class="line"><span>'+wffLogo(teams[g.away],25)+' '+esc(teamLabel(teams[g.away]))+' at '+wffLogo(teams[g.home],25)+' '+esc(teamLabel(teams[g.home]))+'</span><strong>'+(result?result.awayScore+'–'+result.homeScore:'Scheduled')+'</strong></div>';
  }
 }
 return html+'</section>';
}
const WFF_SEASON_AWARDS=[
 ["leagueMvp","WFF Most Valuable Player","league"],
 ["eastMvp","East Conference MVP","East"],["westMvp","West Conference MVP","West"],
 ["eastOroy","East Offensive Rookie of the Year","East"],["westOroy","West Offensive Rookie of the Year","West"],
 ["eastDroy","East Defensive Rookie of the Year","East"],["westDroy","West Defensive Rookie of the Year","West"],
 ["opoy","Offensive Player of the Year","league"],["dpoy","Defensive Player of the Year","league"],
 ["bestQb","Best Quarterback","league"],["bestRb","Best Running Back","league"],
 ["bestWr","Best Wide Receiver","league"],["bestTe","Best Tight End","league"],
 ["bestOl","Best Offensive Lineman","league"],["bestEdge","Best Edge Rusher","league"],
 ["bestDt","Best Defensive Tackle","league"],["bestLb","Best Linebacker","league"],
 ["bestCb","Best Cornerback","league"],["bestS","Best Safety","league"],
 ["bestK","Best Kicker","league"],["bestP","Best Punter","league"],
 ["coach","Coach of the Year","league"]
];
const WFF_WEEKLY_AWARDS=[["offense","Offensive Player of the Week"],["defense","Defensive Player of the Week"],["special","Special Teams Player of the Week"]];
function wffAwardDisplay(a){
 if(!a||!a.playerName)return '<span class="muted">Pending modeled statistics</span>';
 const team=teams[a.teamId];
 return '<span>'+esc(a.playerName)+(team?' • '+wffLogo(team,24)+' '+esc(teamLabel(team)):'')+'</span>';
}
function wffLeagueAwardsView(state){
 const year=state.finance?.year||state.leagueSchedule?.year||2026;
 const completed=Math.min(18,Math.max(0,(state.week||1)-1));
 wffComputeAwards(state);const archive=state.awardHistory||{},seasonAwards=archive[year]?.season||{},weekly=archive[year]?.weekly||{};
 let html='<section class="panel"><h2>WFF Honors & Awards — '+year+'</h2><p class="muted">Awards are reserved for statistically supported performances. Winners will not be fabricated from overall ratings or arbitrary draws. Award selections use modeled box scores and are provisional until full play-by-play tracking is available.</p></section>';
 html+='<section class="panel"><h2>Season Awards</h2>';
 for(const [id,title,scope] of WFF_SEASON_AWARDS)html+='<div class="line"><span><strong>'+esc(title)+'</strong><small class="muted"> • '+esc(scope==="league"?"League-wide":scope+" Conference")+'</small></span>'+wffAwardDisplay(seasonAwards[id])+'</div>';
 html+='</section><section class="panel"><h2>Weekly Conference Honors</h2>';
 if(!completed)html+='<p class="muted">No completed regular-season weeks yet.</p>';
 for(let week=completed;week>=1;week--){
  html+='<h3>Week '+week+'</h3>';
  for(const conf of ["East","West"])for(const [id,title] of WFF_WEEKLY_AWARDS){
   const award=weekly[week]?.[conf]?.[id];
   html+='<div class="line"><span>'+conf+' — '+title+'</span>'+wffAwardDisplay(award)+'</div>';
  }
 }
 html+='</section>';
 return html;
}
function wffLeagueHubView(state){
 wffScheduleInit(state);
 let html='<section class="panel"><h2>League Headquarters</h2><p>East Conference • West Conference • Eight geographic divisions • 32 franchises</p></section>';
 for(const conf of ["West","East"]){
  html+='<section class="panel"><h2>'+conf+' Conference — Division Standings</h2>';
  const divisions=[...new Set(teams.filter(t=>t.conference===conf).map(t=>t.region))];
  for(const region of divisions){
   html+='<h3>'+esc(conf+' — '+region)+'</h3>';
   const rows=wffLeagueTeamMetrics(state).filter(r=>r.team.region===region).sort(wffRank);
   for(const r of rows)html+='<div class="line"><span>'+wffLogo(r.team,32)+' '+esc(teamLabel(r.team))+'</span><strong>'+r.w+'–'+r.l+(r.t?'–'+r.t:'')+'</strong></div>';
  }
  html+='</section>';
 }
 return html+wffLeagueUpcoming(state)+wffLeagueAwardsView(state);
}

function wffMyTeamStatsView(state){
 wffScheduleInit(state);wffEnsureLeagueBoxScores(state);
 const team=teams[state.teamId],games=wffLeagueTeamGames(state,state.teamId),rows=wffLeagueTeamMetrics(state),mine=rows.find(x=>x.id===state.teamId);
 const offenseRank=wffLeagueRankings(state,"offense").findIndex(x=>x.id===state.teamId)+1;
 const defenseRank=wffLeagueRankings(state,"defense").findIndex(x=>x.id===state.teamId)+1;
 const season=wffSeasonPlayers(state).filter(p=>p.teamId===state.teamId);
 const total=(field)=>season.reduce((n,p)=>n+(p[field]||0),0);
 const live=(state.games||[]).filter(g=>g.stats&&g.stats[0]).reduce((acc,g)=>{
  const x=g.stats[0];for(const k of ["plays","pass","rush","yards","firstDowns","turnovers"])acc[k]+=(x[k]||0);return acc;
 },{plays:0,pass:0,rush:0,yards:0,firstDowns:0,turnovers:0});
 const metric=(label,value)=>'<div class="stat"><small>'+label+'</small><b>'+value+'</b></div>';
 let html='<section class="panel"><h2>'+wffLogo(team,40)+' '+esc(teamLabel(team))+' — Season Statistics</h2><p class="muted">Selected franchise • '+(state.finance?.year||2026)+' season • '+games.length+' completed games. Rankings use recorded final scores; individual player totals are modeled estimates.</p><div class="grid">'+metric("Record",mine.w+"–"+mine.l+(mine.t?"–"+mine.t:""))+metric("Points scored",mine.pf)+metric("Points allowed",mine.pa)+metric("Points per game",games.length?mine.ppg.toFixed(1):"—")+metric("Points allowed / game",games.length?mine.allowed.toFixed(1):"—")+metric("Offensive rank (points)",games.length?"#"+offenseRank:"—")+metric("Defensive rank (points allowed)",games.length?"#"+defenseRank:"—")+'</div></section>';
 html+='<section class="panel"><h2>Recorded Live-Game Team Totals</h2><p class="muted">Aggregated from completed live games for your selected franchise. These are separate from the modeled individual box scores.</p><div class="grid">'+metric("Offensive plays",live.plays)+metric("Pass plays",live.pass)+metric("Rush plays",live.rush)+metric("Total offensive yards",live.yards)+metric("First downs",live.firstDowns)+metric("Turnovers",live.turnovers)+'</div></section>';
 html+='<section class="panel"><h2>Modeled Player Production</h2><p class="muted">Estimated season totals based on completed game scores, not individually tracked live plays.</p><div class="grid">'+metric("Passing yards",total("passYds"))+metric("Passing TD",total("passTd"))+metric("Rushing yards",total("rushYds"))+metric("Rushing TD",total("rushTd"))+metric("Receiving yards",total("recYds"))+metric("Sacks",total("sacks"))+metric("Defensive INT",total("defInt"))+'</div></section>';
 for(const [title,filter,fields] of WFF_PLAYER_STAT_SECTIONS){
  const players=season.filter(filter).sort((a,b)=>b[fields[1][1]]-a[fields[1][1]]);
  html+='<section class="panel"><h2>'+title+' — '+esc(team.city)+'</h2><div class="wff-stat-table"><table><thead><tr><th>Player</th>'+fields.map(([label])=>'<th>'+label+'</th>').join("")+'</tr></thead><tbody>'+players.map(p=>'<tr><td>'+wffPlayerProfileLink(p)+' <small>('+esc(p.position)+')</small></td>'+fields.map(([,key])=>'<td>'+wffPlayerMetric(p,key)+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>'+(players.length?'':'<p class="muted">No recorded games yet.</p>')+'</section>';
 }
 html+='<section class="panel"><h2>Game-by-Game Results</h2>';
 if(!games.length)html+='<p class="muted">Your season starts with no statistics. Results will appear after Week 1.</p>';
 for(const g of games){const home=g.home===state.teamId,our=home?g.homeScore:g.awayScore,their=home?g.awayScore:g.homeScore,opp=teams[home?g.away:g.home];html+='<div class="line"><span>Week '+g.week+' • '+(home?'vs ':'at ')+esc(teamLabel(opp))+'</span><strong>'+(our>their?'W':our<their?'L':'T')+' '+our+'–'+their+'</strong></div>'}
 return html+'</section>';
}

function wffGameBoxScoreView(state,game){
 if(!game)return '<section class="panel"><h2>Box Score</h2><p>No completed game selected.</p></section>';
 const ids=game.teamIds||[state.teamId,null],fixture=game.fixtureId;
 const saved=fixture?state.leagueBoxScores?.[fixture]:null;
 const players=Array.isArray(saved)?saved:[];
 const labels=[game.home,game.away];
 const scores=[game.homeScore,game.awayScore];
 const teamStats=game.stats||[];
 const statRows=[["Offensive plays","plays"],["Passing plays","pass"],["Rushing plays","rush"],["Total offensive yards","yards"],["First downs","firstDowns"],["Turnovers","turnovers"],["Sacks allowed","sacksAllowed"],["Sack yards lost","sackYardsLost"],["Defensive sacks","sacks"],["Blitzes called","blitzCalls"],["Blitzes faced","blitzFaced"],["Blitzes picked up","blitzPickedUp"],["Quick throws vs blitz","quickThrows"]];
 const safe=v=>esc(String(v));
 let html='<section class="panel"><h2>Final Game Box Score • Week '+safe(game.week)+'</h2><div class="score">'+safe(labels[0])+' '+safe(scores[0])+' — '+safe(scores[1])+' '+safe(labels[1])+'</div><p class="muted">Team totals are recorded from the live simulator. Individual player statistics are modeled estimates, not attributed live plays.</p></section>';
 html+='<section class="panel"><h2>Team Offense & Defense</h2><div class="wff-stat-table"><table><thead><tr><th>Statistic</th><th>'+safe(labels[0])+'</th><th>'+safe(labels[1])+'</th></tr></thead><tbody>';
 for(const [name,key] of statRows)html+='<tr><td>'+name+'</td><td>'+safe(teamStats[0]?.[key]??"—")+'</td><td>'+safe(teamStats[1]?.[key]??"—")+'</td></tr>';
 html+='<tr><td>Points scored</td><td>'+scores[0]+'</td><td>'+scores[1]+'</td></tr><tr><td>Points allowed</td><td>'+scores[1]+'</td><td>'+scores[0]+'</td></tr></tbody></table></div></section>';
 const actualSacks=game.liveSacks||[];
 if(actualSacks.length)html+='<section class="panel"><h2>Recorded Quarterback Sacks</h2>'+actualSacks.map(p=>'<div class="line"><span>'+safe(p.name)+' ('+safe(p.position)+') • '+safe(teams[p.teamId]?.city||"Defense")+'</span><strong>'+safe(p.yards)+' yards</strong></div>').join('')+'</section>';
 const sections=WFF_PLAYER_STAT_SECTIONS;
 for(let side=0;side<2;side++){
  const id=ids[side],roster=players.filter(p=>p.teamId===id);
  html+='<section class="panel"><h2>'+safe(labels[side])+' — Individual Player Statistics</h2>';
  if(!roster.length)html+='<p class="muted">Individual box score unavailable for this game. Older games may predate this feature.</p>';
  for(const [title,filter,cols] of sections){
   const group=roster.filter(filter);
   if(!group.length)continue;
   html+='<h3>'+title+'</h3><div class="wff-stat-table"><table><thead><tr><th>Player</th>'+cols.map(([label])=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>';
   for(const p of group)html+='<tr><td>'+wffPlayerProfileLink(p)+' <small>'+safe(p.position)+'</small></td>'+cols.map(([,key])=>'<td>'+safe(wffPlayerMetric(p,key))+'</td>').join('')+'</tr>';
   html+='</tbody></table></div>';
  }
  html+='</section>';
 }
 return html;
}

function wffPlayerProfileLink(p){return '<button type="button" class="wff-player-link" data-wff-player="'+esc(String(p.teamId))+'|'+esc(p.name)+'|'+esc(p.position)+'">'+esc(p.name)+'</button>'}
function wffPlayerPortrait(playerId,position,jerseyNumber){
 const seed=dnaHash(String(playerId));
 const skins=["#704a39","#a36e50","#c48d68","#dfb18d","#f0cba9"];
 const jerseys=["#176d85","#284f92","#7a3e88","#8b403c","#2b7460"];
 const skin=skins[seed%skins.length],jersey=jerseys[Math.floor(seed/13)%jerseys.length];
 const hair=["#241d1b","#4a3025","#181c27"][Math.floor(seed/7)%3];
 return '<svg class="wff-player-portrait" viewBox="0 0 200 240" role="img" aria-label="Fictional illustrated player portrait" xmlns="http://www.w3.org/2000/svg">'+
 '<rect width="200" height="240" rx="14" fill="#172d48"/><circle cx="100" cy="82" r="66" fill="#fff" opacity=".06"/>'+
 '<path d="M12 240 L24 180 Q35 154 75 148 L125 148 Q165 154 176 180 L188 240Z" fill="'+jersey+'"/>'+
 '<path d="M77 134 H123 V162 L100 178 L77 162Z" fill="'+skin+'"/>'+
 '<ellipse cx="100" cy="94" rx="40" ry="52" fill="'+skin+'"/>'+
 '<path d="M60 83 Q56 38 100 39 Q144 38 140 83 Q123 56 100 62 Q77 56 60 83Z" fill="'+hair+'"/>'+
 '<path d="M79 98 H90 M110 98 H121" stroke="'+hair+'" stroke-width="3" stroke-linecap="round"/>'+
 '<path d="M90 121 Q100 126 110 121" fill="none" stroke="#6b4436" stroke-width="2"/>'+
 '<path d="M71 152 L100 182 L129 152" stroke="#f1f5fa" stroke-width="7" fill="none"/>'+
 '<text x="100" y="224" text-anchor="middle" font-size="30" font-weight="900" fill="white">'+esc(String(jerseyNumber??(10+seed%89)))+'</text></svg>';
}
function wffPlayerProfileView(state,teamId,name,position){
 wffEnsurePlayerRegistry(state);
 const roster=wffStatRoster(state,teamId),player=roster.find(p=>p.name===name&&p.position===position);
 const record=wffRegisterPlayer(state,teamId,player||{name,position});
 const id=record.id,stats=wffSeasonPlayers(state).find(p=>wffPlayerId(p.teamId,p)===id);
 const team=teams[record.teamId]||teams[teamId],safe=x=>esc(String(x??"—"));
 const metric=(label,value)=>'<div class="stat"><small>'+label+'</small><b>'+safe(value)+'</b></div>';
 const contract=player?.contract||record.contract;
 const years=player?.yearsPro??player?.experience??record.yearsPro;
 let html='<section class="panel"><div class="wff-profile-header"><div class="wff-profile-portrait-frame">'+wffPlayerPortrait(id,record.position,player?.jerseyNumber??record.jerseyNumber)+'</div><div class="wff-profile-summary"><h2>'+safe(record.name)+' <small>'+safe(record.position)+'</small></h2><p>'+wffLogo(team,32)+' '+safe(teamLabel(team))+'</p><div class="wff-profile-chips"><span>OVR '+safe(player?.overall??"—")+'</span><span>'+safe(player?.archetype??"Player")+'</span></div><p class="muted">Fictional illustrated player portrait</p></div></div><div class="grid">'+metric("Position",record.position)+metric("Age",player?.age??record.age)+metric("Height",(player?.height??record.height)?dnaFormatHeight(player?.height??record.height):"Not recorded")+metric("Weight",(player?.weight??record.weight)?(player?.weight??record.weight)+" lb":"Not recorded")+metric("Overall",player?.overall)+metric("Archetype",player?.archetype)+metric("Experience",years!=null?years+" years":"Not recorded")+metric("Rookie",player?.rookie===true||record.rookie?"Yes":years===0?"Yes":"Not confirmed")+'</div><h3>Player background</h3><p>Hometown: '+safe(record.hometown)+' • College: '+safe(record.college)+'</p><p class="muted">Fictional biography saved to this franchise. Existing players receive a consistent generated background.</p><h3>Contract</h3><p>'+safe(contract?.years??player?.contractYears??"Contract term not recorded")+(contract?.years!=null?" years":"")+' • '+(contract?.salary!=null?safe(contract.salary):"Salary not recorded")+'</p></section>';
 html+='<section class="panel"><h2>Current Season Statistics</h2><p class="muted">Individual production is currently modeled, except explicitly tracked live events.</p>';
 if(!stats)html+='<p>No season statistics available.</p>';
 else for(const [title,filter,cols] of WFF_PLAYER_STAT_SECTIONS){if(!filter(stats))continue;html+='<h3>'+title+'</h3><div class="grid">'+cols.map(([label,key])=>metric(label,wffPlayerMetric(stats,key))).join("")+'</div>'}
 html+='</section><section class="panel"><h2>Career Statistics</h2>';
 const career=wffPlayerCareerTotals(state,id),currentYear=state.finance?.year;
 const rows=career.rows.slice();
 if(stats&&!rows.some(r=>r.year===currentYear))rows.push({...stats,year:currentYear,playerId:id});
 rows.sort((a,b)=>a.year-b.year);
 if(!rows.length)html+='<p>No completed statistical seasons yet.</p>';
 else{
  const total={};for(const field of WFF_STAT_FIELDS)total[field]=rows.reduce((sum,r)=>sum+(r[field]||0),0);
  html+='<p>'+rows.length+' season(s) of available WFF statistics. Historical seasons are saved independently of the current roster.</p>';
  for(const [title,filter,cols] of WFF_PLAYER_STAT_SECTIONS){if(!filter(total))continue;
   html+='<h3>'+title+' — Career Totals</h3><div class="grid">'+cols.map(([label,key])=>metric(label,wffPlayerMetric(total,key))).join("")+'</div>';
  }
  html+='<h3>Season-by-Season</h3><div class="wff-stat-table"><table><thead><tr><th>Year</th><th>Team</th><th>Pass YDS</th><th>Rush YDS</th><th>Rec YDS</th><th>TKL</th><th>SACK</th></tr></thead><tbody>';
  for(const r of rows)html+='<tr><td>'+safe(r.year)+'</td><td>'+safe(teams[r.teamId]?.city)+'</td><td>'+safe(r.passYds||0)+'</td><td>'+safe(r.rushYds||0)+'</td><td>'+safe(r.recYds||0)+'</td><td>'+safe(r.tackles||0)+'</td><td>'+safe(r.sacks||0)+'</td></tr>';
  html+='</tbody></table></div>';
 }
 return html+'</section>';
}
