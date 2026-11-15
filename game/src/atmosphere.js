import { Mesh, SphereGeometry, ShaderMaterial, BackSide, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, Color } from 'three';
import { PALETTE } from './palette.js';
export function createAtmosphere(scene) {
  const sky = new Mesh(new SphereGeometry(90,24,16),new ShaderMaterial({side:BackSide,depthWrite:false,
    uniforms:{low:{value:new Color(PALETTE.sky)},high:{value:new Color('#356579')}},
    vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 v;uniform vec3 low;uniform vec3 high;void main(){gl_FragColor=vec4(mix(low,high,smoothstep(0.,70.,v.y)),1.);}'
  }));scene.add(sky);
  const positions=[];for(let i=0;i<280;i++)positions.push(Math.random()*32-16,Math.random()*7,Math.random()*36-18);
  const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(positions,3));
  const dust=new Points(geo,new PointsMaterial({color:PALETTE.ink,size:.024,transparent:true,opacity:.28,depthWrite:false}));scene.add(dust);
  return {render(t){dust.position.x=Math.sin(t*.08)*.5;dust.position.y=Math.sin(t*.12)*.25;}};
}
