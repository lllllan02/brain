import {AdditiveBlending, BufferAttribute, BufferGeometry, Group, LineBasicMaterial, LineSegments} from 'three';

// Only the transient explosion is decorative. Settled categories consist of real note nodes.
export class CategoryEffects {
  constructor(scene, groups, data, colors) {
    this.groups = groups;
    this.object = new Group();
    const burstGeo = new BufferGeometry();
    this.directions = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      const y = 1 - 2 * (i + .5) / 240, r = Math.sqrt(1 - y * y), theta = i * 2.399963;
      this.directions.set([Math.cos(theta) * r, y, Math.sin(theta) * r], i * 3);
    }
    burstGeo.setAttribute('position', new BufferAttribute(new Float32Array(240 * 6), 3));
    this.burst = new LineSegments(burstGeo, new LineBasicMaterial({color:'#c2dcff',transparent:true,opacity:0,depthWrite:false,blending:AdditiveBlending}));
    this.burst.frustumCulled = false;
    this.object.add(this.burst); scene.add(this.object);
    this.previous = new Float32Array(data.nodes.length * 3);
    this.trailActive = false;
    const trailGeo = new BufferGeometry(), tint = new Float32Array(data.nodes.length * 6);
    trailGeo.setAttribute('position', new BufferAttribute(new Float32Array(tint.length), 3));
    data.nodes.forEach((node,i)=>{
      const color=colors.get(node.folderTop);
      if(color){color.toArray(tint,i*6);color.clone().multiplyScalar(.1).toArray(tint,i*6+3);}
    });
    trailGeo.setAttribute('color',new BufferAttribute(tint,3));
    this.trails=new LineSegments(trailGeo,new LineBasicMaterial({vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:AdditiveBlending}));
    this.trails.frustumCulled=false;this.object.add(this.trails);
  }
  update(burstProgress, positions, dt) {
    const active=burstProgress>.18&&burstProgress<.94&&positions;
    this.trails.visible=Boolean(active);
    if(active) {
      if(!this.trailActive)this.previous.set(positions);
      const attr=this.trails.geometry.attributes.position;
      for(let i=0;i<positions.length;i+=3) {
        const delta=[0,1,2].map(a=>positions[i+a]-this.previous[i+a]);
        const scale=Math.min(.075/Math.max(dt,.001),25/(Math.hypot(...delta)||1));
        for(let a=0;a<3;a++) {attr.array[i*2+a]=positions[i+a];attr.array[i*2+3+a]=positions[i+a]-delta[a]*scale;}
      }
      attr.needsUpdate=true;this.previous.set(positions);
      this.trails.material.opacity=.3*Math.sin(burstProgress*Math.PI);
    }
    this.trailActive=Boolean(active);
    const p = (burstProgress - .16) / .65;
    this.burst.visible = p > 0 && p < 1;
    if (this.burst.visible) {
      const extent = Math.max(180, ...this.groups.map(g => Math.hypot(...g.center) + g.radius));
      const radius = extent * 1.5 * (1 - Math.pow(1-p, 2));
      const tail = radius - extent * .12 * Math.sin(p * Math.PI);
      const points = this.burst.geometry.getAttribute('position');
      for(let i=0;i<240;i++)for(let a=0;a<3;a++) {
        points.array[i*6+a] = this.directions[i*3+a]*radius;
        points.array[i*6+3+a] = this.directions[i*3+a]*tail;
      }
      points.needsUpdate = true;
      this.burst.material.opacity = .65 * Math.pow(1-p, 2);
    }
  }
  dispose() {
    this.object.removeFromParent();
    this.burst.geometry.dispose(); this.burst.material.dispose();
    this.trails.geometry.dispose(); this.trails.material.dispose();
  }
}
