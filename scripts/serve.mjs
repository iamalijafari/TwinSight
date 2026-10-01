import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2),portIndex=args.indexOf('--port');
const port=Number(portIndex>=0?args[portIndex+1]:process.env.PORT||8080);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Use a valid port, e.g. npm run dev -- --port 8081');
const root=resolve(fileURLToPath(new URL('../',import.meta.url)),args.includes('--dist')?'dist':'public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const path=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(!path.startsWith(root+sep)||pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(403);res.end('Forbidden');return;}
    const info=await stat(path);if(!info.isFile())throw new Error('Not found');
    res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:await readFile(path));
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is busy. Try: npm run dev -- --port ${port+1}`:e.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`TwinSight → http://localhost:${port} (${root})`));
