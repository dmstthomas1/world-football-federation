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
 for(const [title,filter,fields] of [
  ["Quarterbacks",p=>p.passAtt>0,[["CMP","passComp"],["ATT","passAtt"],["YDS","passYds"],["TD","passTd"],["INT","int"]]],
  ["Rushing",p=>p.rushAtt>0,[["ATT","rushAtt"],["YDS","rushYds"],["TD","rushTd"]]],
  ["Receiving",p=>p.rec>0,[["REC","rec"],["YDS","recYds"],["TD","recTd"]]],
  ["Defense",p=>p.tackles+p.sacks+p.defInt>0,[["TKL","tackles"],["SACK","sacks"],["INT","defInt"]]]
 ]){
  const players=season.filter(filter).sort((a,b)=>b[fields[1][1]]-a[fields[1][1]]);
  html+='<section class="panel"><h2>'+title+' — '+esc(team.city)+'</h2><div class="wff-stat-table"><table><thead><tr><th>Player</th>'+fields.map(([label])=>'<th>'+label+'</th>').join("")+'</tr></thead><tbody>'+players.map(p=>'<tr><td>'+esc(p.name)+' <small>('+esc(p.position)+')</small></td>'+fields.map(([,key])=>'<td>'+p[key]+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>'+(players.length?'':'<p class="muted">No recorded games yet.</p>')+'</section>';
 }
 html+='<section class="panel"><h2>Game-by-Game Results</h2>';
 if(!games.length)html+='<p class="muted">Your season starts with no statistics. Results will appear after Week 1.</p>';
 for(const g of games){const home=g.home===state.teamId,our=home?g.homeScore:g.awayScore,their=home?g.awayScore:g.homeScore,opp=teams[home?g.away:g.home];html+='<div class="line"><span>Week '+g.week+' • '+(home?'vs ':'at ')+esc(teamLabel(opp))+'</span><strong>'+(our>their?'W':our<their?'L':'T')+' '+our+'–'+their+'</strong></div>'}
 return html+'</section>';
}
