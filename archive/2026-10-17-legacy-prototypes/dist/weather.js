import { THREE, world, random } from './world.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const uniforms={uTime:{value:0}};
export let wetStreet;
export function buildWeather() {
  const shader={
    uniforms:THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),
    vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 vGround;').replace('vUv = textureMatrix','vGround = uv; vUv = textureMatrix'),
    fragmentShader:`
      uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTime;
      varying vec4 vUv; varying vec2 vGround;
      #include <logdepthbuf_pars_fragment>
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        #include <logdepthbuf_fragment>
        vec2 uv=vUv.xy/vUv.w;
        vec2 p=vGround*14.0;
        float warp=sin(p.y*29.+uTime*2.)*sin(p.x*33.-uTime)*.0006;
        uv+=vec2(warp,warp*.5);
        vec3 reflection=texture2D(tDiffuse,uv).rgb;
        reflection+=texture2D(tDiffuse,uv+vec2(.0016,0.)).rgb;
        reflection+=texture2D(tDiffuse,uv-vec2(.0016,0.)).rgb; reflection/=3.;
        float puddle=smoothstep(-.3,.7,sin(p.x*1.8+sin(p.y*2.))*cos(p.y*1.5)+sin(p.x*3.7+p.y)*.3);
        float grain=hash(floor(p*130.))*.013;
        vec3 asphalt=vec3(.039,.071,.088)+grain;
        gl_FragColor=vec4(mix(asphalt,reflection, .19+puddle*.37),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  };
  shader.uniforms.uTime=uniforms.uTime;
  wetStreet=new Reflector(new THREE.PlaneGeometry(13.92,13.92),{textureWidth:768,textureHeight:768,clipBias:.003,color:0x657f88,shader,multisample:0});
  wetStreet.position.y=.084;wetStreet.rotation.x=-Math.PI/2;wetStreet.userData.dynamic=true;world.add(wetStreet);
  const count=1450;
  const positions=new Float32Array(count*6);const ends=new Float32Array(count*2);
  for(let i=0;i<count;i++){
    const x=(random()-.5)*13.5,z=(random()-.5)*13.5,y=random()*9.1;
    positions.set([x,y,z,x,y,z],i*6);ends[i*2]=0;ends[i*2+1]=1;
  }
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(positions,3));rg.setAttribute('aEnd',new THREE.BufferAttribute(ends,1));
  const rainMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`
    uniform float uTime; attribute float aEnd; varying float vAlpha;
    void main(){
      vec3 p=position; p.y=mod(p.y-uTime*5.8,9.1);p.x+=p.y*.025;p.z+=p.y*.014;
      float floorY=(p.x>-4.7&&p.x<3.5&&p.z>-4.83&&p.z<1.98)?4.02:((p.x<4.5&&p.z<3.5)?.25:.12);
      vAlpha=step(floorY+.1,p.y)*(.06+.22*(1.-p.y/10.));
      p.y+=aEnd*.17;p.x+=aEnd*.012;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    }`,fragmentShader:`varying float vAlpha;void main(){gl_FragColor=vec4(.61,.79,.86,vAlpha);}`});
  const rain=new THREE.LineSegments(rg,rainMaterial);rain.frustumCulled=false;rain.userData.dynamic=true;world.add(rain);
  // Small, expanding rings sit on roads, pavement and the flat roof.
  const ring=new THREE.RingGeometry(.82,1,28);
  const ripples=new THREE.InstancedBufferGeometry();ripples.index=ring.index;ripples.attributes.position=ring.attributes.position;ripples.attributes.uv=ring.attributes.uv;
  const offsets=[],phases=[];
  for(let i=0;i<110;i++){
    const x=(random()-.5)*13.6,z=(random()-.5)*13.6;
    const y=x>-4.62&&x<3.42&&z>-4.78&&z<1.62?3.925:x<4.5&&z<3.48?.265:.105;
    offsets.push(x,y,z);phases.push(random());
  }
  ripples.setAttribute('aOffset',new THREE.InstancedBufferAttribute(new Float32Array(offsets),3));ripples.setAttribute('aPhase',new THREE.InstancedBufferAttribute(new Float32Array(phases),1));ripples.instanceCount=phases.length;
  const rippleMat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:`
    uniform float uTime;attribute vec3 aOffset;attribute float aPhase;varying float vFade;
    void main(){float age=fract(uTime*.59+aPhase);float scale=.018+age*.21;vFade=pow(1.-age,2.)*.23;
      vec3 p=aOffset+vec3(position.x*scale,0.,position.y*scale);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}
    `,fragmentShader:`varying float vFade;void main(){gl_FragColor=vec4(.57,.78,.78,vFade);}`});
  const rings=new THREE.Mesh(ripples,rippleMat);rings.frustumCulled=false;rings.userData.dynamic=true;world.add(rings);
  // Separate drips come from the edge of the shop canopy.
  const dp=[],de=[];
  for(let i=0;i<64;i++){
    const x=-4.6+random()*8.2,z=1.98,y=random()*2.8;
    dp.push(x,y,z,x,y,z);de.push(0,1);
  }
  const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.Float32BufferAttribute(dp,3));dg.setAttribute('aEnd',new THREE.Float32BufferAttribute(de,1));
  const dm=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`uniform float uTime;attribute float aEnd;varying float vAlpha;void main(){vec3 p=position;p.y=.3+mod(p.y-uTime*3.8,2.65);p.y+=aEnd*.085;vAlpha=.27;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying float vAlpha;void main(){gl_FragColor=vec4(.83,.89,.82,vAlpha);}`});
  const drips=new THREE.LineSegments(dg,dm);drips.frustumCulled=false;drips.userData.dynamic=true;world.add(drips);
  // Procedural rivulets flow down the outside faces of the glass only.
  const streakMat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
    uniform float uTime;varying vec2 vUv;
    float hash(float p){return fract(sin(p*83.17)*43758.545);}
    void main(){float col=floor(vUv.x*46.);float ran=hash(col);float xx=fract(vUv.x*46.);float center=.3+sin(vUv.y*17.+ran*20.)*.035;
      float line=1.-smoothstep(.006,.028,abs(xx-center));float yy=fract(vUv.y+uTime*(.025+ran*.018)+ran*8.);
      float tail=smoothstep(.56,.97,yy)*step(yy,.985);float alpha=line*tail*.18*step(.45,ran);
      gl_FragColor=vec4(.73,.86,.87,alpha);
    }`});
  for(const [x,w] of [[-3.31,2.02],[-1.68,1.18],[1.98,2.31]]){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,2.3),streakMat);m.position.set(x,1.78,1.45);world.add(m);
  }
  const side=new THREE.Mesh(new THREE.PlaneGeometry(5.94,2.3),streakMat);side.rotation.y=Math.PI/2;side.position.set(3.25,1.79,-1.6);world.add(side);
}
export function updateWeather(time){uniforms.uTime.value=time;if(wetStreet)wetStreet.material.uniforms.uTime.value=time;}
