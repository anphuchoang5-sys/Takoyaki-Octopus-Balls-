import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const files=[];
async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())await walk(p);else if(p.endsWith('.js'))files.push(p);}}
await walk(root);
const imports={};
function moduleId(spec,relative){
  if(spec==='three')return '@ame/vendor/three.module.js';
  if(spec.startsWith('three/addons/'))return '@ame/vendor/addons/'+spec.slice('three/addons/'.length);
  if(spec.startsWith('.'))return '@ame/'+path.posix.normalize(path.posix.join(path.posix.dirname(relative),spec));
  return spec;
}
for(const file of files){
  const relative=path.relative(root,file).split(path.sep).join('/');
  const source=(await readFile(file,'utf8')).replace(/(\bfrom\s*|\bimport\s*)(['"])([^'"]+)\2/g,(match,prefix,quote,spec)=>prefix+quote+moduleId(spec,relative)+quote);
  imports['@ame/'+relative]='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
}
const source=await readFile(path.join(root,'index.html'),'utf8');
const html=source.replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">'+JSON.stringify({imports})+'</script>')
  .replace('<script type="module" src="./scene.js"></script>','<script type="module">import "@ame/scene.js";</script>');
await mkdir('artifacts',{recursive:true});
const destination=path.resolve('artifacts/雨夜便利店.html');
await writeFile(destination,html);console.log(JSON.stringify({file:destination,modules:files.length,bytes:Buffer.byteLength(html)}));
