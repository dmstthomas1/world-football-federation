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
 const played=Object.keys(state.leagueResults||{}).length;
 let html='<section class="panel"><h2>League Rankings & Statistics</h2><p class="muted">Rankings update after completed weeks. Offensive and defensive rankings currently use points scored and points allowed per game. Full yardage, rushing, passing and individual statistical leaders require league-wide play-by-play tracking.</p><p>'+played+' of 272 regular-season games recorded.</p></section>';
 for(const [mode,label,metric] of [["record","Overall standings","Record"],["offense","Offensive rankings","Points per game"],["defense","Defensive rankings","Points allowed per game"]]){
  const rows=wffLeagueRankings(state,mode);
  html+='<section class="panel"><h2>'+label+'</h2><div class="line"><strong>Rank / Franchise</strong><strong>'+metric+'</strong></div>';
  rows.forEach((r,i)=>{const val=mode==="record"?r.w+"–"+r.l+(r.t?"–"+r.t:""):r.games?(mode==="offense"?r.ppg:r.allowed).toFixed(1):"—";
   html+='<div class="line"><span>'+(i+1)+'. '+wffLogo(r.team,28)+' '+esc(teamLabel(r.team))+' <small class="muted">('+esc(wffDivisionName(r.team))+')</small></span><strong>'+val+'</strong></div>'});
  html+='</section>';
 }
 html+='<section class="panel"><h2>Individual Player Statistics</h2><p class="muted">The current live simulator does not yet save complete individual passing, rushing, receiving, tackling and turnover box scores. Player leaderboards will appear here when those events are attributed and saved. No fictional individual totals are shown as facts.</p></section>';
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
function wffLeagueAwardsView(state){
 const games=state.games||[];
 let html='<section class="panel"><h2>Conference Players of the Week</h2><p class="muted">One award for each conference after each completed week. Awards require recorded individual player performances and are not assigned from overall ratings or arbitrary draws.</p>';
 const week=Math.min(18,Math.max(1,(state.week||1)-1));
 html+='<h3>Week '+week+'</h3>';
 for(const conf of ["West","East"])html+='<div class="line"><strong>'+conf+' Conference</strong><span class="muted">Pending individual game statistics</span></div>';
 html+='<p class="muted">Awards history and offensive, defensive and special-teams categories will be enabled once the league records individual box scores.</p></section>';
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
