import { Group, Mesh, SphereGeometry, MeshBasicMaterial, Vector3, CylinderGeometry, AdditiveBlending } from 'three';
export function createEffects(scene) {
  const group=new Group();scene.add(group);const active=[];
  const sphere=new SphereGeometry(1,5,4);
  const materials={spark:new MeshBasicMaterial({color:'#ffcb76',transparent:true,blending:AdditiveBlending,depthWrite:false}),dust:new MeshBasicMaterial({color:'#a8ada0',transparent:true,depthWrite:false}),blood:new MeshBasicMaterial({color:'#9b2925',transparent:true,depthWrite:false})};
  let clock=0, previous=0;
  function add(mesh, velocity, life) {group.add(mesh);active.push({mesh,velocity,life,born:clock});}
  function burst(point,blood=false) {
    for(let i=0;i<17;i++) {
      const kind=blood?'blood':i<8?'spark':'dust';const m=new Mesh(sphere,materials[kind].clone());
      const velocity=new Vector3((Math.random()-.5)*2,(Math.random()-.2)*2,(Math.random()-.5)*2);
      m.position.copy(point).addScaledVector(velocity,.08);m.scale.setScalar(kind==='spark'?.018:.035+Math.random()*.035);
      add(m,velocity,kind==='spark'?.28:.65);
    }
  }
  return {burst,shot(start,end){
    const d=new Vector3().subVectors(end,start);const m=new Mesh(new CylinderGeometry(.008,.008,d.length(),5),materials.spark.clone());
    m.position.copy(start).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(new Vector3(0,1,0),d.normalize());add(m,new Vector3(),.09);
  },render(t){const dt=Math.max(0,Math.min(.05,t-previous));previous=t;clock+=dt;for(let i=active.length-1;i>=0;i--){const e=active[i],age=clock-e.born;if(age>e.life){group.remove(e.mesh);if(e.mesh.geometry!==sphere)e.mesh.geometry.dispose();e.mesh.material.dispose();active.splice(i,1);continue;}
    e.mesh.material.opacity=1-age/e.life;e.mesh.position.addScaledVector(e.velocity,dt);e.velocity.y-=dt*1.5;
  }}};
}
