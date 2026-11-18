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
