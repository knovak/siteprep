import {test,expect} from '@playwright/test';
const url=new URL('../dist/index.html',import.meta.url).href;
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAI0lEQVR4AdzKMQ0AAAwCwQYHNVkLlQ8OYOeT3w57Tzcm1AEEAAD//121auAAAAAGSURBVAMA5MIPedMVKngAAAAASUVORK5CYII=','base64');
const sample={format:'bookmark-sorter/v1',items:[{url:'https://fixture.example/page',title:'My own title',note:'My note',tags:['topic:test']}]};
async function ready(page){await page.goto(url);await expect(page.locator('#collection-select')).toHaveValue('personal');}
async function online(page){if(!await page.locator('#online-tools').getAttribute('open'))await page.locator('#online-tools > summary').click();}
async function importUrl(page){await online(page);await page.locator('#online-import-url').fill('https://fixture.example/bookmarks.json');await page.locator('#online-import').click();await expect(page.locator('#online-status')).toContainText('Imported 1 new; merged 0.');}

test('URL import, direct metadata and image download persist without changing bookmark fields',async({page,context})=>{
  const errors=[],unexpected=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('unexpected.example'))unexpected.push(r.url())});
  await context.route('https://fixture.example/**',route=>{
    const path=new URL(route.request().url()).pathname;
    return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:path.endsWith('.png')?'image/png':path.endsWith('.json')?'application/json':'text/html',body:path.endsWith('.png')?image:path.endsWith('.json')?JSON.stringify(sample):'<title>Fetched title</title><meta name="description" content="Fetched description"><meta property="og:image" content="/image.png"><script>window.evil=1</script><img src="https://unexpected.example/track.png">'});
  });
  await ready(page);await importUrl(page);
  await page.locator('#online-preview').click();await expect(page.locator('#online-status')).toHaveText('1 of 1 previews saved.');
  const card=page.locator('.bookmark-card').first();await expect(card.locator('h2')).toHaveText('My own title');await expect(card.locator('.note')).toHaveText('My note');await expect(card.locator('.capture img')).toHaveAttribute('src',/^data:image\/png/);
  expect(await page.evaluate(()=>window.evil)).toBeUndefined();expect(errors).toEqual([]);expect(unexpected).toEqual([]);
  // Block all HTTP(S); WebKit's simulated offline mode cannot reload file URLs.
  await context.route(/^https?:/,route=>route.abort());await page.reload();await expect(page.locator('.capture img')).toHaveCount(1);await expect(page.locator('.bookmark-card h2')).toHaveText('My own title');
});

test('blocked direct request can use Microlink screenshot; cancellation and rate limits leave bookmarks usable',async({page,context})=>{
  let mode='success';let serviceCalls=0;
  await context.route('https://fixture.example/**',route=>route.request().url().endsWith('.json')?route.fulfill({json:sample}):route.abort());
  await context.route('https://api.microlink.io/**',async route=>{
    serviceCalls++;if(mode==='limit')return route.fulfill({status:429,body:'limited'});
    if(mode==='slow'){await new Promise(r=>setTimeout(r,1000));return route.abort();}
    expect(new URL(route.request().url()).searchParams.get('screenshot')).toBe('true');
    return route.fulfill({json:{status:'success',data:{title:'Remote title',description:'Remote description',screenshot:{url:'https://images.example/screen.png'}}}});
  });
  await context.route('https://images.example/**',route=>route.fulfill({contentType:'image/png',body:image}));
  await ready(page);await importUrl(page);await page.locator('#online-preview').click();await expect(page.locator('#online-results')).toContainText('CORS');expect(serviceCalls).toBe(0);
  await page.locator('#online-mode').selectOption('screenshot');await page.locator('#online-preview').click();await expect(page.locator('#online-status')).toHaveText('1 of 1 previews saved.');await expect(page.locator('.capture img')).toHaveCount(1);
  mode='limit';await page.locator('#online-preview').click();await expect(page.locator('#online-results')).toContainText('request limit');await expect(page.locator('.capture img')).toHaveCount(1);
  mode='slow';await page.locator('#online-preview').click();await page.locator('#online-cancel').click();await expect(page.locator('#online-status')).toContainText('Cancelled');await expect(page.locator('#count')).toHaveText('1');
});

test('downloaded picture URL is saved locally and online tools fit a phone',async({page,context})=>{
  await page.setViewportSize({width:390,height:844});
  await context.route('https://fixture.example/**',route=>route.fulfill({json:sample}));
  await context.route('https://images.example/**',route=>route.fulfill({contentType:'image/png',body:image}));
  await ready(page);await importUrl(page);await page.locator('#online-tools > summary').click();
  page.once('dialog',dialog=>dialog.accept('https://images.example/picture.png'));await page.getByRole('button',{name:'Download picture for My own title'}).click();await expect(page.locator('.capture img')).toHaveCount(1);
  await online(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
