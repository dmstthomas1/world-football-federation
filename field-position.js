"use strict";
// Field position is measured 0-100 from the current offense's own goal line.
// Display conventional 1-50 yard-line labels with the team that owns that half.
function wffFieldSpot(l,yard=l.field,side=l.possession){
 const n=Math.max(0,Math.min(100,Math.round(Number(yard)||0)));
 const offense=side===0?l.us:l.opp,defense=side===0?l.opp:l.us;
 if(n===50)return "midfield";
 const team=n<50?offense:defense;
 return team.city+" "+(n<50?n:100-n);
}
function wffFieldDown(l){return l.down+" & "+(l.toGo>=100-l.field?"Goal":l.toGo)+" at "+wffFieldSpot(l)}
function wffFieldSwitch(l,spot){
 l.possession=1-l.possession;
 l.field=spot==null?25:Math.max(1,Math.min(99,100-spot));
 l.down=1;l.toGo=Math.min(10,100-l.field);l.clock.running=false;
}
