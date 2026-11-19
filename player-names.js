"use strict";
// Fictional naming origins represent cultural name traditions, not inferred ethnicity or appearance.
// Teams recruit internationally; no name tradition is exclusive to a city or a skin tone.
const WFF_NAME_POOLS={"US":[["Marcus","Andre","Caleb","Ethan","Jalen","Noah","Isaiah","Darius","Jordan","Malik","Owen","Elijah","Victor","Adrian","Tariq","Jonah","Devin","Xavier","Micah","Cameron","Tyler","Quentin","Bryce","Desmond","Kendrick","Terrence","Damon","Julian","Ashton","Colton"],["Carter","Reed","Hayes","Bennett","Brooks","Morgan","Price","Walker","Collins","Ward","Turner","Cole","Johnson","Williams","Jackson","Harris","Mitchell","Washington","Robinson","Thompson","Parker","Davis","Miller","Cooper","Anderson","Henderson","Foster","Bishop","McKenzie","Sullivan"]],"Canada":[["Liam","Noah","Ethan","Oliver","Lucas","Nathan","Ryan","Connor","Evan","Mason","Gabriel","Samuel","Logan","Aiden","Cameron","Owen"],["Campbell","Fraser","Tremblay","Gagnon","Bouchard","Roy","Lavoie","MacDonald","Wilson","Martin","Beaulieu","Lefebvre","Clarke","Murray","Singh","Chen"]],"Mexico":[["Santiago","Diego","Emiliano","Mateo","Sebastián","Luis","Javier","Andrés","Ángel","Rafael","Héctor","Daniel","Eduardo","Iván","Nicolás","Rodrigo"],["Hernández","García","López","Martínez","Ramírez","Flores","Torres","Vargas","Castillo","Mendoza","Reyes","Ortega","Navarro","Cruz","Rojas","Salazar"]],"Brazil":[["João","Gabriel","Lucas","Pedro","Rafael","Matheus","Gustavo","Bruno","Thiago","Caio","Vinícius","Felipe","André","Leonardo","Diego","Henrique"],["Silva","Santos","Oliveira","Souza","Pereira","Costa","Rodrigues","Almeida","Nascimento","Ferreira","Carvalho","Ribeiro","Lima","Barbosa","Martins","Gomes"]],"Spanish":[["Mateo","Nicolás","Alejandro","Sergio","Pablo","Álvaro","Javier","Daniel","Hugo","Adrián","Marcos","Iker","Diego","Raúl","Andrés","Luis"],["García","Fernández","López","Martínez","Sánchez","Rodríguez","Pérez","Gómez","Díaz","Moreno","Álvarez","Romero","Navarro","Ruiz","Vega","Castro"]],"UK":[["Oliver","Harry","George","Jack","William","Thomas","James","Charlie","Alfie","Oscar","Freddie","Arthur","Henry","Lewis","Callum","Daniel"],["Smith","Jones","Taylor","Brown","Wilson","Evans","Thomas","Roberts","Johnson","Walker","Wright","Hughes","Clarke","Bennett","Morgan","Cooper"]],"Irish":[["Cian","Conor","Seán","Oisín","Darragh","Fionn","Ronan","Eoin","Liam","Finn","Niall","Cillian","Patrick","Declan","Aidan","Cormac"],["Murphy","Kelly","O'Brien","Walsh","Ryan","O'Connor","Doyle","McCarthy","Gallagher","Byrne","O'Sullivan","Kennedy","Fitzgerald","Nolan","Brennan","Quinn"]],"French":[["Louis","Hugo","Gabriel","Arthur","Raphaël","Lucas","Nathan","Mathis","Théo","Antoine","Baptiste","Maxime","Julien","Enzo","Noé","Alexandre"],["Martin","Bernard","Dubois","Petit","Moreau","Laurent","Lefebvre","Michel","Garcia","Roux","Fontaine","Chevalier","François","Girard","Lambert","Marchand"]],"German":[["Leon","Lukas","Finn","Paul","Jonas","Felix","Ben","Maximilian","Emil","Elias","Moritz","Niklas","Tim","Florian","Julian","Tobias"],["Müller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Hoffmann","Schulz","Koch","Richter","Klein","Wolf","Schröder","Neumann"]],"Dutch":[["Daan","Sem","Lars","Finn","Luuk","Milan","Bram","Jesse","Thijs","Sven","Niels","Jasper","Ruben","Mees","Timo","Joost"],["De Jong","Jansen","De Vries","Van Dijk","Bakker","Visser","Smit","Meijer","Mulder","De Boer","Bos","Vos","Peters","Van Leeuwen","Dekker","Kok"]],"Nordic":[["Erik","Oskar","Axel","Viktor","Lukas","Emil","Nils","Hugo","Arvid","Albin","Gustav","Anton","Elias","Isak","Felix","Noel"],["Andersson","Johansson","Karlsson","Nilsson","Eriksson","Larsson","Olsson","Persson","Svensson","Gustafsson","Lindberg","Bergström","Lundqvist","Holm","Ekström","Nyström"]],"Polish":[["Jakub","Jan","Szymon","Antoni","Filip","Michał","Kacper","Mateusz","Adam","Piotr","Wojciech","Tomasz","Bartosz","Paweł","Karol","Marek"],["Nowak","Kowalski","Wiśniewski","Wójcik","Kowalczyk","Kamiński","Lewandowski","Zieliński","Szymański","Woźniak","Dąbrowski","Kozłowski","Jankowski","Mazur","Krawczyk","Piotrowski"]],"Japanese":[["Haruto","Yuto","Sota","Ren","Yuki","Kaito","Daiki","Takumi","Ryota","Shota","Hiroto","Riku","Hayato","Kenta","Naoki","Tsubasa"],["Sato","Suzuki","Takahashi","Tanaka","Watanabe","Ito","Yamamoto","Nakamura","Kobayashi","Kato","Yoshida","Yamada","Sasaki","Yamaguchi","Matsumoto","Inoue"]],"Korean":[["Min-jun","Seo-jun","Ji-ho","Do-yun","Hyun-woo","Jun-seo","Jae-hyun","Ji-hun","Tae-min","Seung-ho","Dong-hyun","Woo-jin","Joon-ho","Min-ho","Sung-min","Jin-woo"],["Kim","Lee","Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim","Han","Shin","Oh","Seo","Kwon","Hwang"]],"Chinese":[["Wei","Jun","Hao","Ming","Jian","Tao","Bo","Lei","Peng","Zhihao","Yuchen","Haoran","Zixuan","Yifan","Cheng","Junjie"],["Wang","Li","Zhang","Liu","Chen","Yang","Huang","Zhao","Wu","Zhou","Xu","Sun","Ma","Zhu","Hu","Guo"]],"Indian":[["Arjun","Aarav","Rohan","Aditya","Kabir","Vihaan","Ishaan","Rahul","Karan","Dev","Siddharth","Nikhil","Varun","Ravi","Aakash","Pranav"],["Sharma","Patel","Singh","Kumar","Gupta","Mehta","Rao","Nair","Iyer","Kapoor","Verma","Desai","Joshi","Shah","Menon","Chaudhary"]],"Australian":[["Jack","Oliver","Noah","William","Henry","Charlie","Thomas","Cooper","Lachlan","Hudson","Harrison","Archie","Oscar","Levi","Mason","Riley"],["Smith","Jones","Williams","Brown","Wilson","Taylor","Martin","Anderson","Thompson","White","Walker","Harris","King","Young","Roberts","Mitchell"]],"NZ":[["Liam","Oliver","Noah","Jack","Ariki","Tama","Wiremu","Nikau","Kauri","Manaia","Hemi","Rangi","Tane","Ethan","Finn","Lucas"],["Williams","Smith","Wilson","Brown","Taylor","Ngata","Rangi","Te Rangi","Kereama","Tautari","Walker","Martin","Kingi","Thompson","Murray","Heke"]],"SouthernAfrica":[["Thabo","Sipho","Siyabonga","Lethabo","Mandla","Sibusiso","Kabelo","Tshepo","Lwazi","Bongani","Themba","Andile","Neo","Mpho","Jabulani","Sandile"],["Dlamini","Nkosi","Mokoena","Ndlovu","Khumalo","Mthembu","Mahlangu","Mabena","Molefe","Sithole","Naidoo","Pillay","Botha","Van der Merwe","Maseko","Zulu"]],"Nigerian":[["Chinedu","Emeka","Ifeanyi","Chukwuemeka","Obinna","Tunde","Adeola","Femi","Oluwaseun","Kunle","Chidi","Ikenna","Babatunde","Kelechi","Nnamdi","Ayodele"],["Okafor","Okonkwo","Nwosu","Eze","Nwankwo","Adebayo","Adeyemi","Ogunleye","Balogun","Olawale","Ibrahim","Chukwu","Onyekachi","Obi","Ojo","Akintola"]],"Kenyan":[["Brian","Kevin","Daniel","David","Samuel","Peter","James","Collins","Victor","Joseph","Dennis","Elijah","Martin","John","Michael","Eric"],["Mwangi","Otieno","Kiptoo","Omondi","Kamau","Njoroge","Wanjala","Kiprotich","Mutua","Ochieng","Kariuki","Maina","Odhiambo","Korir","Kibet","Kimani"]],"Arabic":[["Omar","Ahmed","Youssef","Mohamed","Karim","Hassan","Ibrahim","Ali","Khalid","Tariq","Hamza","Zayd","Faris","Sami","Nasser","Rashid"],["Hassan","Ibrahim","Mahmoud","Saleh","Khalil","Mansour","Farouk","Nasser","Abdullah","Al-Mansouri","Al-Farsi","Al-Harbi","Al-Khatib","El-Sayed","Hamdan","Qasim"]],"Turkish":[["Emir","Yusuf","Mehmet","Ahmet","Arda","Kerem","Burak","Can","Mert","Eren","Oğuz","Deniz","Kaan","Berk","Selim","Hakan"],["Yılmaz","Kaya","Demir","Çelik","Şahin","Yıldız","Yıldırım","Öztürk","Aydın","Arslan","Doğan","Kılıç","Aslan","Koç","Kurt","Özdemir"]]};
const WFF_COUNTRY_NAME_POOL={"USA":"US","Canada":"Canada","Mexico":"Mexico","Brazil":"Brazil","Argentina":"Spanish","Chile":"Spanish","Colombia":"Spanish","United Kingdom":"UK","France":"French","Spain":"Spanish","Ireland":"Irish","Germany":"German","Netherlands":"Dutch","Sweden":"Nordic","Poland":"Polish","Japan":"Japanese","South Korea":"Korean","China":"Chinese","India":"Indian","Australia":"Australian","New Zealand":"NZ","South Africa":"SouthernAfrica","Egypt":"Arabic","Nigeria":"Nigerian","Kenya":"Kenyan","United Arab Emirates":"Arabic","Saudi Arabia":"Arabic","Qatar":"Arabic","Türkiye":"Turkish"};
function wffNameSeed(s){let h=2166136261;for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0}
function wffNameOrigin(teamId,index,practice=false){
 const t=teams[teamId]||teams[0],local=WFF_COUNTRY_NAME_POOL[t.country]||"US";
 const seed=wffNameSeed(teamId+"|"+index+"|"+(practice?"practice":"active"));
 const r=rng(seed),roll=r();
 if(roll<.56)return local;
 const region=teams.filter(x=>x.region===t.region).map(x=>WFF_COUNTRY_NAME_POOL[x.country]).filter(Boolean);
 if(roll<.72)return region[Math.floor(r()*region.length)]||local;
 const global=Object.keys(WFF_NAME_POOLS);
 return global[Math.floor(r()*global.length)];
}
function wffNamedPlayer(teamId,index,practice=false){
 const origin=wffNameOrigin(teamId,index,practice),pool=WFF_NAME_POOLS[origin],r=rng(wffNameSeed("name|"+teamId+"|"+index+"|"+practice));
 const first=pool[0][Math.floor(r()*pool[0].length)],last=pool[1][Math.floor(r()*pool[1].length)];
 return {name:first+" "+last,nameOrigin:origin};
}
function wffApplyRosterNames(roster,teamId,practice=false){
 const used=new Set();
 return roster.map((p,i)=>{
  const stableId=p.playerId||"wff-"+wffNameSeed("identity|"+teamId+"|"+i+"|"+practice).toString(36);
  let n=wffNamedPlayer(teamId,i,practice),attempt=0;
  while(used.has(n.name)&&attempt<30){attempt++;n=wffNamedPlayer(teamId,i+attempt*113,practice)}
  used.add(n.name);
  return {...p,...n,playerId:stableId,nameVersion:1};
 });
}
function wffMigrateNames(state){
 if(!state||state.nameRosterVersion===1)return false;
 // Preserve player IDs, ratings, contracts and careers; only names/origins are migrated.
 for(const [key,practice] of [["roster",false],["practiceSquad",true]]){
  if(!Array.isArray(state[key]))continue;
  state[key]=wffApplyRosterNames(state[key],state.teamId,practice);
 }
 if(state.playerRegistry){
  for(const p of [...(state.roster||[]),...(state.practiceSquad||[])]){
   if(state.playerRegistry[p.playerId]){state.playerRegistry[p.playerId].name=p.name;state.playerRegistry[p.playerId].nameOrigin=p.nameOrigin}
  }
 }
 state.nameRosterVersion=1;
 return true;
}

 // NFL-inspired jersey ranges. Numbers are unique within each active roster.
 const WFF_JERSEY_RANGES={
  QB:[[0,19]],HB:[[0,49]],FB:[[20,49]],WR:[[0,19],[80,89]],TE:[[0,49],[80,89]],
  OL:[[50,79]],EDGE:[[50,79],[90,99]],DT:[[50,79],[90,99]],
  LB:[[0,59],[90,99]],CB:[[0,49]],S:[[0,49]],K:[[0,19]],P:[[0,19]]
 };
 function wffJerseyGroup(position){return ["LT","LG","C","RG","RT","OL"].includes(position)?"OL":["MLB","OLB","ILB","SAM","WILL"].includes(position)?"LB":["FS","SS","DB"].includes(position)?"S":["DL"].includes(position)?"DT":position}
 function wffAllowedJersey(position,n){return (WFF_JERSEY_RANGES[wffJerseyGroup(position)]||[[0,99]]).some(([a,b])=>n>=a&&n<=b)}
 function wffAssignJerseys(roster,teamId,reservedNumbers=[]){
  if(!Array.isArray(roster))return false;
  const used=new Set(reservedNumbers);let changed=false;
  // Preserve valid existing jersey numbers where possible.
  for(const p of roster){const n=Number(p.jerseyNumber);if(p.jerseyNumber!=null&&Number.isInteger(n)&&wffAllowedJersey(p.position,n)&&!used.has(n)){p.jerseyNumber=n;used.add(n)}else p.jerseyNumber=null}
  for(let i=0;i<roster.length;i++){
   const p=roster[i];if(p.jerseyNumber!=null)continue;
   const ranges=WFF_JERSEY_RANGES[wffJerseyGroup(p.position)]||[[0,99]],options=[];
   for(const [a,b] of ranges)for(let n=a;n<=b;n++)if(!used.has(n))options.push(n);
   if(!options.length)throw Error("No legal jersey number for "+p.position+" on team "+teamId);
   const seed=wffNameSeed("jersey|"+teamId+"|"+(p.playerId||i));
   p.jerseyNumber=options[seed%options.length];used.add(p.jerseyNumber);changed=true;
  }
  return changed;
 }

const WFF_ACTIVE_POSITION_TARGET=["QB","QB","QB","HB","HB","HB","FB","WR","WR","WR","WR","WR","TE","TE","LT","LT","LG","LG","C","C","RG","RG","RT","RT","EDGE","EDGE","EDGE","EDGE","DT","DT","DT","DT","MLB","SAM","WILL","CB","CB","CB","CB","CB","FS","FS","SS","SS","K","P"];
function wffEnsureRosterBalance(state){
 if(!Array.isArray(state?.roster)||state.roster.length!==46)return false;
 const roster=state.roster,target=WFF_ACTIVE_POSITION_TARGET,used=new Set(),assign=Array(46).fill(null);
 // Keep as many existing player positions as possible, including their identity and ratings.
 for(let j=0;j<target.length;j++){
  const candidates=roster.map((p,i)=>({p,i})).filter(({p,i})=>!used.has(i)&&p.position===target[j]);
  if(candidates.length){const chosen=candidates.sort((a,b)=>b.p.overall-a.p.overall)[0];used.add(chosen.i);assign[j]=chosen.i}
 }
 const similarity=(p,pos)=>{
  if(p.position===pos)return 100;
  const g=x=>["SAM","WILL","MLB","OLB","ILB"].includes(x)?"LB":["FS","SS","DB"].includes(x)?"S":["LT","LG","C","RG","RT","OL"].includes(x)?"OL":x;
  return g(p.position)===g(pos)?40:0;
 };
 for(let j=0;j<target.length;j++)if(assign[j]==null){
  const candidates=roster.map((p,i)=>({p,i})).filter(({i})=>!used.has(i));
  candidates.sort((a,b)=>similarity(b.p,target[j])-similarity(a.p,target[j])||b.p.overall-a.p.overall);
  const pick=candidates[0];assign[j]=pick.i;used.add(pick.i);
 }
 let changed=false;
 for(let j=0;j<target.length;j++){
  const p=roster[assign[j]];
  if(p.position!==target[j]){p.position=target[j];changed=true}
 }
 if(changed){
  // Recompute position-relevant ratings for converted players while keeping stable identity.
  for(let j=0;j<target.length;j++){const p=roster[assign[j]];if(p.dnaPosition&&p.dnaPosition!==p.position)p.dnaVersion=0;p.dnaPosition=p.position}
  wffAssignJerseys(roster,state.teamId);
  state.depth=wffAutoDepth(state);
 }
 state.rosterCompositionVersion=1;
 return changed;
}
