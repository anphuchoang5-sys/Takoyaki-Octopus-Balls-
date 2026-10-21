// Lossless prepared support data. The live generator remains the only snow
// algorithm; this asset skips repeating its invariant clipping/fitting work.
// Bump when preparation math/topology changes, then rerun prepare-building-snow.
export const PREPARED_VERSION=1;
const fields=[['vertexData',Float64Array],['faces',Uint32Array],['shared',Uint8Array],['occlusions',Float32Array]];
const align=n=>Math.ceil(n/8)*8;
export async function snowSourceFingerprint(source,options){
  const buffers=[source.positions,source.parts,new TextEncoder().encode(JSON.stringify({...options,preparedURL:undefined}))];
  const hashes=await Promise.all(buffers.map(a=>crypto.subtle.digest('SHA-256',a)));
  return hashes.map(b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('')).join(':');
}
export function encodePreparedSnow(state,fingerprint){
  const meta={version:PREPARED_VERSION,fingerprint};
  for(const [key,value]of Object.entries(state))if(!ArrayBuffer.isView(value))meta[key]=value;
  meta.lengths=fields.map(([key])=>state[key].length);
  const header=new TextEncoder().encode(JSON.stringify(meta));
  let size=align(8+header.length);for(const [key]of fields)size=align(size+state[key].byteLength);
  const data=new Uint8Array(size);new DataView(data.buffer).setUint32(0,0x534e4f57);new DataView(data.buffer).setUint32(4,header.length);
  data.set(header,8);let offset=align(8+header.length);
  for(const [key]of fields){const a=state[key];data.set(new Uint8Array(a.buffer,a.byteOffset,a.byteLength),offset);offset=align(offset+a.byteLength);}
  return data.buffer;
}
export function decodePreparedSnow(buffer,fingerprint){
  const view=new DataView(buffer);
  if(buffer.byteLength<8||view.getUint32(0)!==0x534e4f57)throw new Error('Invalid snow preparation header');
  const length=view.getUint32(4);
  if(length>65536||length+8>buffer.byteLength)throw new Error('Invalid snow preparation metadata');
  const meta=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,8,length)));
  if(meta.version!==PREPARED_VERSION||meta.fingerprint!==fingerprint)throw new Error('Snow preparation source changed');
  if(!Array.isArray(meta.lengths)||meta.lengths.length!==4||meta.lengths.some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('Invalid snow preparation lengths');
  const state={...meta};let offset=align(8+length);
  for(let i=0;i<fields.length;i++){
    const [key,Type]=fields[i],bytes=meta.lengths[i]*Type.BYTES_PER_ELEMENT;
    if(offset+bytes>buffer.byteLength)throw new Error('Truncated snow preparation');
    state[key]=new Type(buffer,offset,meta.lengths[i]);offset=align(offset+bytes);
  }
  if(offset!==buffer.byteLength||state.vertexData.length%13||state.faces.length!==meta.facetCount*3||state.shared.length!==meta.facetCount||state.occlusions.length!==meta.facetCount)throw new Error('Invalid snow preparation topology');
  const vertices=state.vertexData.length/13;
  if(state.faces.some(i=>i>=vertices)||state.vertexData.some(n=>!Number.isFinite(n)))throw new Error('Invalid snow preparation vertices');
  return state;
}
