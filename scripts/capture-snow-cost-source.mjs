// Pin only runtime text for isolated performance comparisons; never restore it over the worktree.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const label=process.argv[2]??'before',out='artifacts/editor/snow-query-render-cost';
assert(/^[a-z0-9-]+$/.test(label));
await mkdir(out,{recursive:true});const dir=`${out}/${label}-source`;await mkdir(dir);
const manifest={},hashes={};
async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){
 const path=`${dir}/${e.name}`;if(e.isDirectory()){if(e.name!=='vendor')await scan(path);continue;}
 if(!/\.(js|html|css|gz)$/.test(path))continue;
 const body=await readFile(path),sha256=createHash('sha256').update(body).digest('hex');hashes[path]=sha256;
 if(path.endsWith('.js')){const url=path.slice(5),file=url.replaceAll('/','__');manifest[url]={file,sha256};await writeFile(`${out}/${label}-source/${file}`,body,{flag:'wx'});}
}}
await scan('dist');await writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
await writeFile(`${out}/${label}-state.json`,JSON.stringify({created:new Date().toISOString(),hashes,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'})},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({snapshot:dir,files:Object.keys(manifest).length}));
