import {test} from 'node:test';
import assert from 'node:assert/strict';
import {automaticPlace,automaticStation,createOnlineTides,normalizeEvents,normalizeStations,predictionUrl} from '../src/online.mjs';
import {forecastRows} from '../src/forecast.mjs';
const rows=forecastRows('2026-09-08','America/Los_Angeles');
const predictions={predictions:[{t:'2026-09-08 09:00',v:'1.7',type:'H'},{t:'2026-09-08 15:00',v:'0.2',type:'L'},{t:'2026-09-07 09:00',v:'1',type:'H'}]};

test('automatic choices require a clear place or a nearby clearly closer station',()=>{
  const city={label:'San Diego, California, United States'},county={label:'San Diego (county), California, United States'};
  assert.equal(automaticPlace([city,county],'San Diego, California'),city);
  assert.equal(automaticPlace([{label:'Harbor, California'},{label:'Harbor, Oregon'}],'Harbor'),null);
  assert.equal(automaticStation([{distanceKm:2},{distanceKm:5}]).distanceKm,2);
  assert.equal(automaticStation([{distanceKm:2},{distanceKm:3}]),null);
  assert.equal(automaticStation([{distanceKm:26}]),null);
  assert.equal(automaticStation([]),null);
});

test('official providers keep UTC bounds, sort and deduplicate events, and reject missing data',()=>{
  const url=new URL(predictionUrl({id:'9414290',provider:'noaa'},rows));assert.equal(url.searchParams.get('time_zone'),'gmt');assert.equal(url.searchParams.get('datum'),'MLLW');
  assert.equal(normalizeEvents(predictions,'noaa',rows).length,2);
  const chs=[{eventDate:'2026-09-08T15:00Z',value:0.2},{eventDate:'2026-09-08T09:00Z',value:1.7},{eventDate:'2026-09-08T09:00Z',value:1.7}];
  assert.deepEqual(normalizeEvents(chs,'chs',rows).map(e=>e.type),['high','low']);
  assert.throws(()=>normalizeEvents([{eventDate:'2026-09-08T09:00Z',value:1.7}],'chs',rows),/Too few/);
  assert.throws(()=>normalizeEvents({error:'unavailable'},'noaa',rows),/did not return/);
  assert.equal(normalizeStations([{id:'a',officialName:'A',latitude:1,longitude:2,timeSeries:[]}],'chs').length,0);
});

test('saved official forecasts keep their provider/datum and stale notice without a service',async()=>{
  let failed=false;
  const api=createOnlineTides({fetchImpl:async()=>{if(failed)throw Error('offline');return Response.json(predictions)}});
  const station={id:'9414290',provider:'noaa',name:'San Francisco',latitude:37.806,longitude:-122.465,timeZone:'America/Los_Angeles',distanceKm:1};
  const args={place:{label:'San Francisco',latitude:37.8,longitude:-122.46},station,rows};
  const live=await api.forecast(args);assert.equal(live.online.cached,false);assert.equal(live.days[0].tides.length,2);assert.match(live.datum,/MLLW/);assert.equal(live.engine.provider,'noaa');
  failed=true;const saved=await api.forecast({...args,refresh:true});assert.equal(saved.online.stale,true);assert.equal(saved.sources[0].retrievedAt,live.sources[0].retrievedAt);assert.equal(saved.days[0].tides[0].at,live.days[0].tides[0].at);
});

test('partial station-service failures still offer valid stations and respect the distance bound',async()=>{
  const api=createOnlineTides({fetchImpl:async url=>{if(url.includes('dfo-mpo'))throw Error('unavailable');return Response.json({stations:[{id:'1',name:'Near',lat:37.8,lng:-122.4},{id:'2',name:'Far',lat:1,lng:1}]})}});
  const result=await api.stations({latitude:37.8,longitude:-122.4});assert.equal(result.stations.length,1);assert.match(result.warning,/incomplete/);
});
