// A static file server used only by browser verification. Neither app needs it to calculate.
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, sep, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(process.env.WASM_DEMO_ROOT || fileURLToPath(new URL('../../../../demos/experiment-with-wasm/',import.meta.url)));
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.pdf':'application/pdf'};
createServer(async(request,response)=>{
  try {
    const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    let path = resolve(root,'.'+pathname);
    if (path !== root && !path.startsWith(root+sep)) throw Error('Outside demo');
    if ((await stat(path)).isDirectory()) path = resolve(path,'index.html');
    response.setHeader('Content-Type',types[extname(path)] || 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(8794,'127.0.0.1');
