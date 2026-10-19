import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../../../../',import.meta.url)));
const port=Number(process.env.MARUKO_PORT||4185);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.md':'text/plain; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary'};
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1'),name=decodeURIComponent(url.pathname==='/'?'/town/characters/maruko/preview.html':url.pathname);
  if(name==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw new Error('Outside dist');
  const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Maruko preview: http://127.0.0.1:${port}/town/characters/maruko/preview.html`));
