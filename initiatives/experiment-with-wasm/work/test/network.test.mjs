import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchResource, createWebCache, webUrl} from '../src/network.mjs';

test('network transport omits credentials and enforces URL, byte and request limits',async()=>{
  assert.throws(()=>webUrl('javascript:alert(1)'));
  assert.throws(()=>webUrl('https://user:pass@example.org/'));
  let options;
  const response=await fetchResource('https://example.org/',{fetchImpl:async(_url,o)=>{options=o;return new Response('hello');}});
  assert.equal(response.text(),'hello');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
  await assert.rejects(fetchResource('https://example.org/',{maxBytes:2,fetchImpl:async()=>new Response('hello')}),/too large/);
  await assert.rejects(fetchResource('https://example.org/',{fetchImpl:async()=>new Response('',{status:429})}),e=>e.status===429);
  await assert.rejects(fetchResource('https://example.org/',{timeout:5,fetchImpl:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))))}),/timed out/);
});

test('web cache is bounded, preserves timestamps and labels stale fallback; cancellation never returns cache',async()=>{
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  const cache=createWebCache(storage,'test',2);
  const first=await cache.get('one',100000,async()=>({ok:1}));
  const hit=await cache.get('one',100000,async()=>{throw Error('should not fetch')});assert.equal(hit.cached,true);assert.equal(hit.at,first.at);
  const stale=await cache.get('one',-1,async()=>{throw Error('offline')});assert.equal(stale.stale,true);assert.equal(stale.at,first.at);
  await assert.rejects(cache.get('one',-1,async()=>{throw new DOMException('Cancelled','AbortError')}),/Cancelled/);
  await cache.get('two',100,async()=>2);await cache.get('three',100,async()=>3);assert.equal(Object.keys(JSON.parse(values.get('test'))).length,2);
  const broken=createWebCache({getItem(){throw Error()},setItem(){throw Error()}},'broken');assert.equal((await broken.get('a',1,async()=>4)).value,4);
});
