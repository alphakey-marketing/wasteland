'use strict';
// Faction data: who exists, who fights whom, which strongholds they hold.
const FACTIONS={
  takeda:{name:'武田家',lord:'武田信玄',color:'#b95c48'},
  uesugi:{name:'上杉家',lord:'上杉謙信',color:'#7396bd'},
  village:{name:'青葉村',color:'#8da66d'}
};
// 'enemy' fights on sight. Missing pair = neutral. Keep table symmetric.
const FACTION_REL={takeda:{uesugi:'enemy'},uesugi:{takeda:'enemy'}};
const factionRel=(a,b)=>a===b?'self':FACTION_REL[a]?.[b]||'neutral';
// Strongholds. owner holds it at start; successor moves in after it falls.
// 'misaka' keeps the old unit kind names (outpost_<side>_<role>) so old saves still load.
const OUTPOSTS=[
  {id:'misaka',name:'霧坂關所',area:'temple',x:19,y:6,owner:'takeda',successor:'uesugi',occupation:45,
    commanders:{takeda:'武田守將・矢代重政',uesugi:'上杉守將・村井景久'}},
  {id:'kanaya',name:'金屋寨',area:'forge',x:23,y:10,owner:'uesugi',successor:'takeda',occupation:45,
    commanders:{uesugi:'上杉守將・久我景吉',takeda:'武田守將・矢島昌久'}}
];
const OUTPOST_BY_ID=Object.fromEntries(OUTPOSTS.map(o=>[o.id,o]));
const outpostKind=(def,side,role)=>`outpost_${def.id==='misaka'?'':def.id+'_'}${side}_${role}`;
function outpostInfo(u){const m=/^outpost_(?:([a-z]+)_)?(takeda|uesugi)_(commander|soldier)$/.exec(u?.kind||'');return m?{id:m[1]||'misaka',side:m[2],role:m[3]}:null}
// Headquarters: the lord and his picked guards live here. Lord stands at (x,y+.8), tent behind.
const CAMPS=[
  {side:'takeda',area:'temple',x:24,y:2.8,name:'武田本陣'},
  {side:'uesugi',area:'forge',x:24,y:2.8,name:'上杉本陣'}
];
// Faction identity of any faction-bound unit: outpost garrison, lord, camp guard, patrol, raider.
const outpostSide=u=>outpostInfo(u)?.side||/^(?:border_lord|camp_guard|patrol|raid)_(takeda|uesugi)/.exec(u?.kind||'')?.[1]||null;
