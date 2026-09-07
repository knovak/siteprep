// Build-time regression evidence from the original server implementation and full-precision data.
// Usage: node scripts/record-reference.mjs /path/to/global-coast-r1
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {forecastFromTile, distanceKm} from '../../../../tide-here/work/phase-9/src/forecast.mjs';
const root = process.argv[2];
const packageData = JSON.parse(await readFile(join(root,'package.json')));
const points=[];
for(const object of packageData.objects.filter(o=>o.name!=='tile-index')) points.push(...JSON.parse(await readFile(join(root,object.file))).tile.points);
const examples=[['Half Moon Bay',37.46,-122.44],['Galway',53.27,-9.05],['Cooktown',-15.47,145.25],
  ['Cape Town',-33.92,18.42],['Auckland',-36.85,174.76],['Vancouver',49.29,-123.12],
  ['Mumbai',18.94,72.83],['Rio',-22.9,-43.17],['Tromso',69.65,18.96],['Suva',-18.14,178.44],['Nice',43.7,7.27],['Galway 2036',53.27,-9.05]];
const records=[];
for(const [name,latitude,longitude] of examples){
  const ordered=points.map(point=>({point,distance:distanceKm({latitude,longitude},point)})).sort((a,b)=>a.distance-b.distance);
  const point=ordered[0].point;
  const start=name.endsWith('2036')?'2036-09-07T00:00:00Z':'2026-09-07T00:00:00Z';
  const end=new Date(Date.parse(start)+5*86400000).toISOString();
  const forecast=forecastFromTile({tile:{points:[point]},dataset:packageData.dataset},{latitude,longitude,start,end});
  records.push({name,place:{latitude,longitude},point:{latitude:point.latitude,longitude:point.longitude},start,end,
    events:forecast.tides.map(e=>({...e,height:e.height/100,unit:'m'}))});
}
await writeFile(new URL('../test/original-forecasts.json',import.meta.url),JSON.stringify(records,null,2)+'\n');
console.log(`Recorded ${records.length} original-engine forecast cases.`);
