// Offline analysis of the isolated diagnostic browser's V8 snapshots.
import {readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/editor/snow-retention';
const names=process.argv.slice(2);if(names.length!==2)throw Error('Pass two heap snapshot file names');
const summaries=[],oldIds=new Set();let current;
for(const [which,name]of names.entries()){
 const heap=JSON.parse(await readFile(`${dir}/${name}`,'utf8'));
 const {nodes,strings}=heap,m=heap.snapshot.meta,fields=m.node_fields,step=fields.length;
 const f=Object.fromEntries(fields.map((x,i)=>[x,i])),types=m.node_types[0],groups=new Map();let total=0;
 const fresh=[];
 for(let at=0;at<nodes.length;at+=step){
  const id=nodes[at+f.id],size=nodes[at+f.self_size],type=types[nodes[at+f.type]],label=strings[nodes[at+f.name]],key=`${type}:${label}`;
  const g=groups.get(key)||{key,count:0,bytes:0,newCount:0,newBytes:0};g.count++;g.bytes+=size;total+=size;
  if(which===0)oldIds.add(id);else if(!oldIds.has(id)){g.newCount++;g.newBytes+=size;if(size>=100000)fresh.push({id,at,size,key});}
  groups.set(key,g);
 }
 summaries.push({file:name,total,nodes:nodes.length/step,groups:[...groups.values()].sort((a,b)=>b.bytes-a.bytes),fresh:fresh.sort((a,b)=>b.size-a.size)});
 if(which===1)current=heap;
}
const before=new Map(summaries[0].groups.map(g=>[g.key,g]));
const growth=summaries[1].groups.map(g=>({...g,deltaBytes:g.bytes-(before.get(g.key)?.bytes||0),deltaCount:g.count-(before.get(g.key)?.count||0)})).sort((a,b)=>b.deltaBytes-a.deltaBytes);
// Reverse strong edges once; shortest root paths describe actual retainers.
const {nodes,edges,strings}=current,m=current.snapshot.meta,ns=m.node_fields.length,es=m.edge_fields.length;
const nf=Object.fromEntries(m.node_fields.map((x,i)=>[x,i])),ef=Object.fromEntries(m.edge_fields.map((x,i)=>[x,i]));
const nodeTypes=m.node_types[0],edgeTypes=m.edge_types[0],count=nodes.length/ns,offsets=new Uint32Array(count+1);
for(let i=0;i<edges.length;i+=es)if(edgeTypes[edges[i+ef.type]]!=='weak')offsets[edges[i+ef.to_node]/ns+1]++;
for(let i=1;i<offsets.length;i++)offsets[i]+=offsets[i-1];
const incoming=new Uint32Array(offsets.at(-1)),owners=new Uint32Array(edges.length/es),cursor=offsets.slice();let edgeAt=0;
for(let n=0;n<count;n++)for(let k=0;k<nodes[n*ns+nf.edge_count];k++,edgeAt+=es){
 owners[edgeAt/es]=n;if(edgeTypes[edges[edgeAt+ef.type]]!=='weak')incoming[cursor[edges[edgeAt+ef.to_node]/ns]++]=edgeAt/es;
}
const describe=n=>({id:nodes[n*ns+nf.id],type:nodeTypes[nodes[n*ns+nf.type]],name:strings[nodes[n*ns+nf.name]],selfSize:nodes[n*ns+nf.self_size]});
function rootPath(target){
 const queue=[target],seen=new Uint8Array(count),next=new Int32Array(count).fill(-1),via=new Int32Array(count).fill(-1);seen[target]=1;
 for(let q=0;q<queue.length&&!seen[0];q++){
  const child=queue[q];for(let p=offsets[child];p<offsets[child+1];p++){
   const e=incoming[p],parent=owners[e];if(seen[parent])continue;seen[parent]=1;next[parent]=child;via[parent]=e;queue.push(parent);
  }
 }
 if(!seen[0])return [];
 const path=[];for(let n=0;n!==target;n=next[n]){const at=via[n]*es,type=edgeTypes[edges[at+ef.type]],raw=edges[at+ef.name_or_index];path.push({...describe(n),edge:type==='element'||type==='hidden'?`${type}[${raw}]`:strings[raw]});}
 path.push(describe(target));return path;
}
const paths=summaries[1].fresh.slice(0,12).map(n=>({...n,path:rootPath(n.at/ns)}));
const result={snapshots:summaries.map(({file,total,nodes,groups,fresh})=>({file,total,nodes,top:groups.slice(0,25),tracked:groups.filter(g=>/^(object|native):(system \/ JSArrayBufferData|ArrayBuffer|Float32Array|BufferGeometry|WebGLBuffer|Worker)$/.test(g.key)),freshLarge:fresh.length})),growth:growth.slice(0,35),paths};
await writeFile(`${dir}/heap-analysis.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({snapshots:result.snapshots.map(s=>({file:s.file,total:s.total,nodes:s.nodes,freshLarge:s.freshLarge})),growth:result.growth.slice(0,12),paths},null,2));
