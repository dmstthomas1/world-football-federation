"use strict";
// Personnel-driven pre-snap packages; these labels describe the on-field visualization.
function wffPackage(l,side){
 const offense=side===0?l.state.offense:"Balanced Multiple";
 const front=side===0?"4-3":l.state.front||"4-3";
 const r=l.r,down=l.down,distance=l.toGo;
 let formation;
 if(/Air Raid|Spread|Run and Shoot/.test(offense))formation=r()<.76?"Shotgun":r()<.7?"Pistol":"Singleback";
 else if(/Power Run|Wide Zone/.test(offense))formation=r()<.62?"Singleback":r()<.65?"Pistol":"Shotgun";
 else if(/Vertical Passing/.test(offense))formation=r()<.6?"Shotgun":"Singleback";
 else formation=r()<.46?"Singleback":r()<.72?"Shotgun":"Pistol";
 const long=distance>=7||down>=3,personnel=formation==="Shotgun"?(long?"11":"11"):formation==="Pistol"?"11":r()<.55?"12":"21";
 const base=/3-4/.test(front)?"3-4":"4-3";
 let defense=base;
 if(personnel==="11")defense=(down>=3&&distance>=8)?"Dime":r()<.83?"Nickel":base;
 else if(down>=3&&distance>=9)defense="Nickel";
 const rushers=defense==="Dime"?4:defense==="Nickel"?4:base==="3-4"?3:4;
 return {formation,personnel,defense,rushers,playType:null};
}
