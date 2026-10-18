import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
const files = [
  ['build/three.module.js','three.module.js'],['build/three.core.js','three.core.js'],['LICENSE','LICENSE.three'],
  ...['controls/OrbitControls.js','utils/BufferGeometryUtils.js',
    'postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/ShaderPass.js','postprocessing/MaskPass.js','postprocessing/Pass.js','postprocessing/UnrealBloomPass.js','postprocessing/OutputPass.js',
    'shaders/CopyShader.js','shaders/LuminosityHighPassShader.js','shaders/OutputShader.js'].map(f=>['examples/jsm/'+f,'addons/'+f])
];
for (const [source,target] of files) {
  const to=path.resolve('dist/vendor',target); await mkdir(path.dirname(to),{recursive:true});await copyFile(path.resolve('node_modules/three',source),to);
}
console.log(`Vendored ${files.length} runtime files; no third-party requests are needed at runtime.`);
