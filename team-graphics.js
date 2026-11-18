"use strict";
// Original procedural vector identities; consistent across sessions and players.
// Graphics are stylized illustrations, not photorealistic likenesses.
const WFF_COLORS=[["#24b7a5","#082e3a"],["#edbb54","#27365c"],["#e36b65","#322443"],["#7fa8ff","#1d294b"],["#ad80e8","#263550"],["#e8a65a","#3b2733"],["#73c7a1","#183b4d"],["#ee788c","#332943"]];
function wffColors(t){return WFF_COLORS[(t.id*5+Math.floor(t.id/4))%WFF_COLORS.length]}
function wffLogo(t,size=48){
 const [primary,dark]=wffColors(t),initials=(t.name||"WF").replace(/[^a-zA-Z ]/g,"").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
 const shapes=['<path d="M50 8 87 24 82 68 50 91 18 68 13 24Z"/>','<path d="M50 9 87 42 73 83 27 83 13 42Z"/>','<circle cx="50" cy="50" r="40"/>','<path d="M50 6 92 50 50 94 8 50Z"/>'];
 const shape=shapes[t.id%shapes.length];
 return '<svg class="wff-logo" role="img" aria-label="'+esc(teamLabel(t))+' emblem" width="'+size+'" height="'+size+'" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g fill="'+dark+'" stroke="'+primary+'" stroke-width="5">'+shape+'</g><path d="M23 57 50 20 77 57 61 52 50 74 39 52Z" fill="'+primary+'" opacity=".24"/><text x="50" y="59" font-family="system-ui,sans-serif" font-weight="900" font-size="'+(initials.length>1?30:39)+'" fill="#fff" text-anchor="middle">'+esc(initials)+'</text></svg>';
}
function wffPlayerPortrait(p,team,size=104){
 const id=dnaHash(team.id+"|"+p.name+"|"+p.position),r=dnaRandom(id),[primary,dark]=wffColors(team);
 const height=Number(p.height)||74,weight=Number(p.weight)||220;
 const build=Math.max(.75,Math.min(1.4,weight/220)),torso=27*build,head=10+(r()-.5)*2;
 const skin=["#75462f","#9b6244","#b57a55","#d3a17b","#e5b995","#5d392b"][Math.floor(r()*6)];
 const hair=["#201a1b","#493127","#6e4831","#1a2027"][Math.floor(r()*4)];
 const jersey=primary,number=String(10+(id%90));
 const shoulder=torso+8,waist=torso*.66,leg=height>76?43:height<70?34:39;
 return '<svg class="wff-player-art" role="img" aria-label="Illustrated '+esc(p.position)+' '+esc(p.name)+', '+height+' inches and '+weight+' pounds" width="'+size+'" height="'+Math.round(size*1.35)+'" viewBox="0 0 120 165" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="165" rx="13" fill="#0e2032"/><path d="M0 133 120 104V165H0Z" fill="'+primary+'" opacity=".13"/><ellipse cx="60" cy="154" rx="38" ry="5" fill="#030b16" opacity=".6"/><path d="M'+(60-waist*.7)+' 101 L'+(60+waist*.7)+' 101 '+(60+waist*.65)+' '+(107+leg)+' '+(60+3)+' '+(107+leg)+' 60 121 '+(57)+' '+(107+leg)+' '+(60-waist*.65)+' '+(107+leg)+'Z" fill="'+dark+'" stroke="#8193a4" stroke-width="1.2"/><path d="M'+(60-shoulder)+' 58 Q60 46 '+(60+shoulder)+' 58 L'+(60+waist)+' 104 '+(60-waist)+' 104Z" fill="'+jersey+'" stroke="#dce8f5" stroke-width="2"/><path d="M'+(60-shoulder)+' 60 Q'+(60-shoulder-10)+' 77 '+(60-shoulder-8)+' 101 M'+(60+shoulder)+' 60 Q'+(60+shoulder+10)+' 77 '+(60+shoulder+8)+' 101" fill="none" stroke="'+skin+'" stroke-width="'+(9*build)+'" stroke-linecap="round"/><rect x="54" y="42" width="12" height="16" rx="4" fill="'+skin+'"/><ellipse cx="60" cy="29" rx="'+head+'" ry="14" fill="'+skin+'"/><path d="M'+(60-head)+' 29 Q'+(60-head-1)+' 12 60 14 Q'+(60+head+2)+' 14 '+(60+head)+' 29 L'+(60+head-2)+' 22 Q60 15 '+(60-head+2)+' 22Z" fill="'+hair+'"/><path d="M42 64H78" stroke="'+dark+'" stroke-width="3" opacity=".6"/><text x="60" y="88" font-size="20" font-weight="900" font-family="system-ui" text-anchor="middle" fill="#fff">'+number+'</text><path d="M42 147H78" stroke="#dce8f5" stroke-width="5" stroke-linecap="round"/><text x="60" y="160" font-size="8" font-family="system-ui" text-anchor="middle" fill="#dce8f5">'+esc(p.position)+' • '+weight+' lb</text></svg>';
}
