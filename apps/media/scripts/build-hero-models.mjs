import * as T from '../../web/node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from '../../web/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from '../../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// GLTFExporter uses FileReader even for texture-free binary models in Node.
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const mat = (color, metalness = 0, roughness = 0.4) => new T.MeshStandardMaterial({ color, metalness, roughness });
const steel = mat('#bcc8cd', 0.85, 0.24);
const graphite = mat('#252c30', 0.65, 0.33);
const rubber = mat('#16191b', 0, 0.82);
const gold = mat('#c9a45c', 0.75, 0.28);
const green = mat('#155d4d', 0.3, 0.3);
const ivory = mat('#f0eee5', 0, 0.48);
const glass = mat('#182e39', 0.48, 0.13);
const red = new T.MeshPhysicalMaterial({ color: '#a90c25', metalness: 0.65, roughness: 0.24, clearcoat: 1 });
const v = (p) => new T.Vector3(...p);
function mesh(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const object = new T.Mesh(geometry, material);
  object.position.set(...position); object.rotation.set(...rotation);
  object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}
function box(g, size, p, m, r = 0.035, rotation) {
  return mesh(g, new RoundedBoxGeometry(...size, 3, Math.min(r, ...size.map(n => n / 3))), m, p, rotation);
}
function cyl(g, radius, height, p, m = steel, rotation = [0, 0, 0], top = radius, segments = 48) {
  return mesh(g, new T.CylinderGeometry(top, radius, height, segments), m, p, rotation);
}
function tube(g, points, radius, m, closed = false) {
  return mesh(g, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v), closed), 64, radius, 8, closed), m);
}
function sphere(g, radius, p, m, scale = [1, 1, 1]) {
  const o = mesh(g, new T.SphereGeometry(radius, 16, 12), m, p); o.scale.set(...scale); return o;
}
function ring(g, radius, thickness, p, m = steel, rotation = [Math.PI / 2, 0, 0]) {
  return mesh(g, new T.TorusGeometry(radius, thickness, 10, 64), m, p, rotation);
}
function bolt(g, p, radius = 0.035) { return cyl(g, radius, radius * 0.8, p, gold, [Math.PI / 2, 0, 0], radius, 6); }
function extrude(g, coords, depth, p, m, bevel = 0.03) {
  const shape = new T.Shape(coords.map(([x, y]) => new T.Vector2(x, y)));
  return mesh(g, new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 3,
    steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 16 }), m, p);
}
function loft(g, sections, m, segments = 32) {
  // Sections run along X; smooth elliptical cross-sections form continuous hulls.
  const points = [], indices = [];
  for (const [x, y, width, height] of sections) for (let j = 0; j <= segments; j++) {
    const a = j / segments * Math.PI * 2;
    points.push(x, y + Math.sin(a) * height, Math.cos(a) * width);
  }
  for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < segments; j++) {
    const a = i * (segments + 1) + j, b = a + segments + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const left = points.length / 3;
  points.push(sections[0][0], sections[0][1], 0);
  const right = points.length / 3;
  const last = sections.at(-1);
  points.push(last[0], last[1], 0);
  for (let j = 0; j < segments; j++) {
    const end = (sections.length - 1) * (segments + 1);
    indices.push(left, j, j + 1, right, end + j + 1, end + j);
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  geo.setIndex(indices); geo.computeVertexNormals(); return mesh(g, geo, m);
}
function wheel(g, x, z) {
  const w = new T.Group(); w.position.set(x, 0.49, z); g.add(w);
  cyl(w, 0.45, 0.27, [0, 0, 0], rubber, [Math.PI / 2, 0, 0]);
  for (const side of [-1, 1]) {
    ring(w, 0.32, 0.022, [0, 0, side * 0.144], steel, [0, 0, 0]);
    cyl(w, 0.29, 0.018, [0, 0, side * 0.14], graphite, [Math.PI / 2, 0, 0]);
    cyl(w, 0.075, 0.04, [0, 0, side * 0.17], steel, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 10; k++) {
      const a = k * Math.PI / 5;
      box(w, [0.045, 0.26, 0.025], [Math.sin(a) * 0.17, Math.cos(a) * 0.17, side * 0.16], steel, 0.01, [0, 0, -a]);
    }
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 0.4;
      bolt(w, [Math.sin(a) * 0.1, Math.cos(a) * 0.1, side * 0.19], 0.014);
    }
  }
  for (let k = 0; k < 48; k++) {
    const a = k * Math.PI / 24;
    box(w, [0.028, 0.016, 0.21], [Math.sin(a) * 0.451, Math.cos(a) * 0.451, 0], graphite, 0.004, [0, 0, -a]);
  }
}
function car() {
  const g = new T.Group();
  loft(g, [[-2.25,0.55,0.1,0.05],[-2.13,0.6,0.75,0.22],[-1.65,0.65,0.89,0.3],[-1.2,0.67,0.9,0.31],[-0.5,0.67,0.84,0.27],[0.3,0.65,0.84,0.28],[1.1,0.64,0.89,0.29],[1.65,0.62,0.87,0.25],[2.12,0.53,0.76,0.18],[2.23,0.52,0.1,0.05]], red, 48);
  loft(g, [[-1.12,0.85,0.5,0.01],[-0.64,1.04,0.66,0.26],[-0.2,1.11,0.67,0.3],[0.44,1.08,0.62,0.27],[0.99,0.85,0.48,0.01]], glass, 32);
  for (const z of [-1,1]) {
    wheel(g,-1.36,z*0.85); wheel(g,1.39,z*0.85);
    tube(g,[[-1.05,0.9,z*0.54],[-0.58,1.32,z*0.57],[0.24,1.37,z*0.56],[0.92,0.88,z*0.52]],0.025,red);
    tube(g,[[-0.6,0.85,z*0.82],[0.05,0.83,z*0.85],[0.9,0.8,z*0.8]],0.014,steel);
    box(g,[0.18,0.035,0.03],[0.33,0.88,z*0.83],steel,0.01);
    box(g,[0.22,0.1,0.18],[-0.61,1.03,z*0.81],red,0.04);
    box(g,[2.36,0.08,0.06],[0,0.35,z*0.8],graphite,0.02);
    box(g,[0.08,0.12,0.39],[-2.13,0.69,z*0.49],ivory,0.03,[0,0,-0.12]);
    box(g,[0.06,0.065,0.49],[2.1,0.66,z*0.48],mat('#f02d36',0.3,0.2),0.02);
  }
  box(g,[0.06,0.2,1.0],[-2.19,0.46,0],graphite,0.06);
  for (let j=-6;j<=6;j++) box(g,[0.025,0.14,0.014],[-2.23,0.46,j*0.066],steel,0.004);
  box(g,[0.07,0.07,1.5],[2.12,0.32,0],graphite);
  for (const z of [-0.59,0.59]) cyl(g,0.075,0.16,[2.13,0.31,z],steel,[0,0,Math.PI/2]);
  return g;
}
function tree(g,x,z,scale=1) {
  const t = new T.Group(); t.position.set(x,0,z); t.scale.setScalar(scale); g.add(t);
  cyl(t,0.07,0.75,[0,0.38,0],mat('#655240'),[0,0,0],0.045,12);
  for(let i=0;i<24;i++) {
    const a=i*2.399963, y=0.73+(i%5)*0.1, r=0.12+(i%4)*0.075;
    sphere(t,0.22,[Math.cos(a)*r,y,Math.sin(a)*r],mat(['#4c7545','#6b884f','#315c40'][i%3]),[1,1.12,1]);
  }
}
function house() {
  const g = new T.Group(), wall = mat('#dedbcf'), roof = mat('#39464a',0.45,0.4), wood = mat('#876650');
  box(g,[3.5,0.13,2.8],[0,0.065,0],mat('#5b7852'));
  box(g,[2.75,1.8,1.9],[0,1.02,0],wall);
  extrude(g,[[-1.52,0],[0,0.9],[1.52,0]],2.12,[0,1.94,-1.06],roof,0.015);
  for(const z of [-0.965,0.965]) for(const x of [-0.88,0.85]) for(const y of [0.67,1.52]) {
    box(g,[0.65,0.67,0.055],[x,y,z],graphite,0.018);
    box(g,[0.55,0.57,0.06],[x,y,z+Math.sign(z)*0.025],glass,0.008);
    box(g,[0.018,0.57,0.075],[x,y,z+Math.sign(z)*0.045],steel,0.004);
    box(g,[0.55,0.018,0.075],[x,y,z+Math.sign(z)*0.045],steel,0.004);
    box(g,[0.74,0.055,0.14],[x,y-0.36,z],ivory,0.01);
  }
  for(const x of [-1.385,1.385]) for(const z of [-0.5,0.5]) for(const y of [0.67,1.5]) {
    box(g,[0.055,0.6,0.55],[x,y,z],graphite,0.01);
    box(g,[0.07,0.51,0.46],[x,y,z],glass,0.01);
  }
  box(g,[0.47,0.92,0.09],[0,0.61,1.0],wood);
  cyl(g,0.022,0.1,[0.15,0.61,1.07],gold,[Math.PI/2,0,0]);
  for(let i=0;i<3;i++) box(g,[0.85+0.18*i,0.08,0.24],[0,0.3-i*0.08,1.14+i*0.2],ivory,0.015);
  for(let i=0;i<12;i++) {
    const x=-1.45+i*0.265;
    tube(g,[[x,1.96,-1.07],[x,2.85,0],[x,1.96,1.07]],0.008,steel);
  }
  box(g,[0.27,0.84,0.28],[-0.96,2.55,-0.44],wall);
  box(g,[0.35,0.055,0.36],[-0.96,3,-0.44],graphite);
  tree(g,-1.5,-1,0.8); tree(g,1.5,-0.7,0.75);
  for(const x of [-1.2,-0.87,0.87,1.2]) sphere(g,0.18,[x,0.26,1.17],mat('#375d39'));
  return g;
}
function land() {
  const g = new T.Group();
  for(let i=0;i<4;i++) box(g,[3.2,0.14,2.65],[0,0.08+i*0.14,0],mat(['#85837c','#aca18b','#705b47','#587847'][i]),0.045);
  for(let i=0;i<70;i++) {
    const a=i*2.399963, r=0.3+(i%13)*0.11;
    sphere(g,0.035+(i%3)*0.014,[Math.cos(a)*r,0.59,Math.sin(a)*r*0.72],mat(['#9fa78a','#64804f','#416c43'][i%3]),[1,0.5,1]);
  }
  tube(g,[[-1.5,0.6,0.9],[-0.65,0.6,0.2],[0.4,0.6,-0.1],[1.5,0.6,-1]],0.09,mat('#b2aca0'));
  const water=sphere(g,0.6,[0.72,0.59,0.55],mat('#5791a1',0.5,0.12),[1,0.035,0.68]); water.rotation.y=-0.4;
  tree(g,-1,-0.5,0.95); tree(g,0.1,-0.8,0.8); tree(g,-0.55,0.7,0.6);
  for(const x of [-1.45,1.45]) for(const z of [-1.18,1.18]) cyl(g,0.02,0.22,[x,0.71,z],mat('#df7950'),[0,0,0],0.02,8);
  return g;
}
function creditCard() {
  const g=new T.Group();
  box(g,[2.3,1.45,0.07],[0,0.85,0],steel,0.08,[0,0,0.12]);
  const back=new T.Group(); back.position.set(0.25,0.95,-0.27); back.rotation.z=-0.12; g.add(back);
  box(back,[2.3,1.45,0.07],[0,0,0],green,0.08);
  box(back,[2.15,0.24,0.02],[0,0.3,-0.045],rubber,0.008);
  box(g,[0.38,0.29,0.02],[-0.7,1.04,0.055],gold,0.035,[0,0,0.12]);
  for(let i=0;i<3;i++) box(g,[0.36,0.008,0.025],[-0.7,0.95+i*0.08,0.071],graphite,0.002,[0,0,0.12]);
  for(let i=0;i<2;i++) box(g,[0.008,0.27,0.025],[-0.77+i*0.14,1.04,0.071],graphite,0.002);
  for(let i=0;i<4;i++) box(g,[0.31,0.028,0.022],[-0.71+i*0.43,0.55,0.07],graphite,0.007);
  for(let i=0;i<3;i++) ring(g,0.16+i*0.05,0.007,[0.7,1.1,0.07],graphite,[0,0,0]);
  cyl(g,0.39,0.075,[0.9,0.39,0.39],steel,[Math.PI/2,0,0]);
  ring(g,0.34,0.015,[0.9,0.39,0.44],gold,[0,0,0]);
  for(let i=0;i<50;i++) { const a=i*Math.PI/25; box(g,[0.01,0.025,0.07],[0.9+Math.sin(a)*0.39,0.39+Math.cos(a)*0.39,0.39],graphite,0.002,[0,0,-a]); }
  return g;
}
function book(g,y,color,angle) {
  const b=new T.Group(); b.position.y=y; b.rotation.y=angle; g.add(b);
  box(b,[1.9,0.23,1.4],[0,0,0],ivory,0.025);
  for(const h of [-0.14,0.14]) box(b,[2,0.045,1.5],[0,h,0],mat(color),0.025);
  box(b,[0.1,0.3,1.5],[-0.97,0,0],mat(color),0.04);
  for(let j=-4;j<=4;j++) box(b,[1.84,0.006,0.012],[0,j*0.022,0.708],mat('#b9b4a5'),0.001);
}
function studentLoan() {
  const g=new T.Group(), navy=mat('#223849',0,0.86);
  book(g,0.18,'#61463d',-0.12); book(g,0.53,'#214c40',0.12);
  cyl(g,0.57,0.43,[0,0.93,0],navy,[0,0,0],0.62);
  box(g,[1.7,0.07,1.7],[0,1.2,0],navy,0.02,[0,0.2,0]);
  sphere(g,0.06,[0,1.27,0],navy,[1,0.35,1]);
  tube(g,[[0,1.27,0],[0.42,1.27,0.17],[0.76,1.22,0.49],[0.82,0.65,0.57]],0.018,gold);
  for(let i=0;i<20;i++) tube(g,[[0.82,0.65,0.57],[0.78+Math.sin(i)*0.045,0.49,0.57+Math.cos(i)*0.045],[0.8+Math.sin(i)*0.07,0.25,0.57+Math.cos(i)*0.07]],0.006,gold);
  cyl(g,0.13,1.7,[0,0.27,1.03],ivory,[0,0,Math.PI/2]);
  ring(g,0.14,0.023,[0,0.27,1.03],green,[0,0,Math.PI/2]);
  return g;
}
function handle(g,x,y,z,width=0.6,m=steel) {
  tube(g,[[x-width/2,y,z],[x-width/2,y+0.23,z],[x,y+0.28,z],[x+width/2,y+0.23,z],[x+width/2,y,z]],0.04,m);
}
function medical() {
  const g=new T.Group();
  box(g,[2,1.45,0.65],[0,0.77,0],ivory,0.11);
  handle(g,0,1.49,0,0.68);
  for(const x of [-0.74,0.74]) {
    box(g,[0.18,0.26,0.05],[x,1.19,0.35],steel,0.025);
    bolt(g,[x,1.2,0.39]);
    for(const y of [0.16,1.38]) box(g,[0.24,0.18,0.06],[x,y,0.35],steel,0.035);
  }
  const cross=mat('#b42e3b',0.1,0.3);
  box(g,[0.67,0.21,0.06],[0,0.75,0.36],cross,0.025);
  box(g,[0.21,0.67,0.065],[0,0.75,0.36],cross,0.025);
  tube(g,[[-0.8,0.15,0.8],[-1.12,0.45,0.3],[-0.8,0.8,0.2],[-0.42,0.62,0.55],[-0.25,0.13,1],[0.6,0.11,0.98],[0.9,0.22,0.56]],0.035,rubber);
  cyl(g,0.22,0.05,[0.9,0.15,0.6],steel); cyl(g,0.17,0.055,[0.9,0.18,0.6],graphite);
  return g;
}
function personal() {
  const g=new T.Group(), leather=mat('#86553b',0,0.56);
  box(g,[2.1,1.45,0.64],[0,0.79,0],leather,0.13);
  box(g,[2.12,0.65,0.12],[0,1.14,0.35],leather,0.1);
  handle(g,0,1.49,0,0.72,leather);
  for(const x of [-0.65,0.65]) {
    box(g,[0.16,1.2,0.045],[x,0.83,0.44],leather,0.025);
    box(g,[0.23,0.27,0.055],[x,0.61,0.48],gold,0.03);
    box(g,[0.15,0.19,0.06],[x,0.61,0.49],leather,0.018);
    for(let j=0;j<20;j++) for(const dx of [-0.055,0.055]) box(g,[0.006,0.018,0.009],[x+dx,0.29+j*0.052,0.473],ivory,0.002);
  }
  ring(g,0.18,0.045,[0.75,0.15,0.85],steel);
  box(g,[0.64,0.045,0.09],[0.3,0.15,0.85],steel,0.015);
  for(let i=0;i<3;i++) box(g,[0.055,0.05,0.08],[0.1+i*0.12,0.15,0.92],steel,0.01);
  box(g,[1.15,0.6,0.025],[0.2,1.5,-0.1],ivory,0.008,[0,0,-0.1]);
  return g;
}
function recreation() {
  const g=new T.Group();
  loft(g,[[-1.65,0.48,0.01,0.01],[-1.25,0.37,0.38,0.32],[-0.6,0.34,0.54,0.35],[0.3,0.34,0.55,0.36],[1.2,0.38,0.42,0.3],[1.5,0.42,0.23,0.22]],ivory);
  box(g,[2.45,0.06,0.78],[0,0.66,0],mat('#a28a61'),0.11);
  box(g,[0.72,0.23,0.53],[0,0.77,0],ivory,0.08);
  box(g,[0.34,0.12,0.57],[0,0.83,0],glass,0.025);
  cyl(g,0.022,2.6,[-0.3,1.97,0],steel);
  tube(g,[[-0.3,0.83,0],[1.18,0.83,0]],0.022,steel);
  function sail(points, bulge) {
    const [a,b,c]=points.map(v), coords=[],indices=[], n=24;
    for(let i=0;i<=n;i++) for(let j=0;j<=n-i;j++) {
      const u=i/n,w=j/n; const p=a.clone().multiplyScalar(1-u-w).addScaledVector(b,u).addScaledVector(c,w);
      p.z+=Math.sin(u*Math.PI)*Math.sin(w*Math.PI)*bulge;
      coords.push(...p.toArray());
    }
    let start=0;
    for(let i=0;i<n;i++) { const len=n-i+1,next=start+len;
      for(let j=0;j<len-1;j++) { indices.push(start+j,next+j,start+j+1); if(j<len-2) indices.push(start+j+1,next+j,next+j+1); }
      start=next;
    }
    const geometry=new T.BufferGeometry(); geometry.setAttribute('position',new T.Float32BufferAttribute(coords,3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const cloth=ivory.clone(); cloth.side=T.DoubleSide; mesh(g,geometry,cloth);
    for(let i=0;i<3;i++) tube(g,[points[i],points[(i+1)%3]],0.006,gold);
  }
  sail([[-0.33,3.25,0],[-0.33,0.9,0],[1.12,0.9,0]],0.38);
  sail([[-0.36,3.22,-0.01],[-1.5,0.79,-0.01],[-0.38,0.9,-0.01]],0.24);
  for(const z of [-0.43,0.43]) {
    tube(g,[[-1.35,0.85,z*0.4],[-0.7,0.9,z],[0.8,0.9,z],[1.35,0.82,z*0.7]],0.009,steel);
    for(let i=0;i<7;i++) tube(g,[[-1+i*0.35,0.65,z],[-1+i*0.35,0.9,z]],0.008,steel);
  }
  tube(g,[[-1.5,0.75,0],[-0.3,3.27,0],[1.4,0.7,0]],0.005,graphite);
  box(g,[0.65,0.65,0.08],[0.15,0.03,0],green,0.07,[0,0,-0.18]);
  return g;
}
function custom() {
  const g=new T.Group();
  cyl(g,0.94,0.23,[0,0.24,0],steel);
  cyl(g,0.82,0.04,[0,0.38,0],graphite);
  ring(g,0.88,0.03,[0,0.39,0]);
  for(let i=0;i<72;i++) { const a=i*Math.PI/36;
    box(g,[0.012,0.01,i%6===0?0.14:0.06],[Math.sin(a)*0.73,0.413,Math.cos(a)*0.73],steel,0.003,[0,a,0]);
  }
  const needle=extrude(g,[[0,0.67],[-0.09,0],[0,-0.15],[0.09,0]],0.02,[0,0.44,0],green,0.005);
  needle.rotation.x=-Math.PI/2;
  const tail=extrude(g,[[0,0],[-0.08,-0.1],[0,-0.66],[0.08,-0.1]],0.02,[0,0.44,0],red,0.005); tail.rotation.x=-Math.PI/2;
  cyl(g,0.085,0.06,[0,0.46,0],gold);
  const lid=new T.Group(); lid.position.set(0,0.31,-0.92); lid.rotation.x=-1.0; g.add(lid);
  cyl(lid,0.93,0.06,[0,0,-0.93],steel); cyl(lid,0.85,0.065,[0,0.01,-0.93],graphite);
  ring(g,0.2,0.04,[0,0.23,1.16]);
  return g;
}
function vault() {
  const g=new T.Group();
  box(g,[2.1,2.05,1.15],[0,1.12,0],graphite,0.1);
  box(g,[1.94,1.91,0.09],[0,1.12,0.61],steel,0.035);
  cyl(g,0.76,0.12,[0,1.12,0.68],gold,[Math.PI/2,0,0]);
  cyl(g,0.66,0.125,[0,1.12,0.7],graphite,[Math.PI/2,0,0]);
  const hinge=new T.Group(); hinge.position.set(0.79,1.12,0.76); hinge.rotation.y=0.27; g.add(hinge);
  cyl(hinge,0.75,0.15,[-0.79,0,0],steel,[Math.PI/2,0,0]);
  ring(hinge,0.65,0.016,[-0.79,0,0.09],graphite,[0,0,0]);
  ring(hinge,0.4,0.014,[-0.79,0,0.11],gold,[0,0,0]);
  cyl(hinge,0.14,0.21,[-0.79,0,0.19],graphite,[Math.PI/2,0,0]);
  for(let i=0;i<6;i++) { const a=i*Math.PI/3;
    tube(hinge,[[-0.79,0,0.29],[-0.79+Math.sin(a)*0.38,Math.cos(a)*0.38,0.29]],0.032,steel);
    cyl(hinge,0.045,0.12,[-0.79+Math.sin(a)*0.38,Math.cos(a)*0.38,0.29],gold,[Math.PI/2,0,0]);
  }
  for(let i=0;i<16;i++) { const a=i*Math.PI/8; bolt(hinge,[-0.79+Math.sin(a)*0.7,Math.cos(a)*0.7,0.09],0.025); }
  for(const y of [0.45,1.75]) cyl(g,0.07,0.26,[0.9,y,0.76],steel);
  for(const x of [-0.82,0.82]) {
    box(g,[0.25,0.18,0.8],[x,0.1,0],steel,0.04);
    for(const y of [0.3,1.95]) bolt(g,[x,y,0.69]);
  }
  return g;
}

const constructors={car,house,land,creditCard,studentLoan,medical,personal,recreation,custom,vault};
const output=new URL('../../web/public/heroes/',import.meta.url);
await mkdir(output,{recursive:true});
const inventory=[];
for(const [id,create] of Object.entries(constructors)) {
  const object=create(); object.name=`InterestShield-${id}-authored-v1`;
  const bounds=new T.Box3().setFromObject(object), size=bounds.getSize(new T.Vector3()), center=bounds.getCenter(new T.Vector3());
  const scale=3.2/Math.max(size.x,size.y,size.z);
  const root=new T.Group(); object.position.set(-center.x,-bounds.min.y,-center.z); root.add(object); root.scale.setScalar(scale);
  const geometries=new Map(), materials=new Map();
  root.traverse(node=>{
    if(!node.isMesh) return;
    const hash=createHash('sha256');
    for(const [name,attribute] of Object.entries(node.geometry.attributes)) {
      hash.update(name); hash.update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));
    }
    if(node.geometry.index) hash.update(Buffer.from(node.geometry.index.array.buffer));
    const key=hash.digest('hex');
    if(geometries.has(key)) { const old=node.geometry; node.geometry=geometries.get(key); old.dispose(); }
    else geometries.set(key,node.geometry);
    const m=node.material, materialKey=[m.type,m.color.getHex(),m.metalness,m.roughness,m.side,m.clearcoat].join(':');
    if(materials.has(materialKey)) node.material=materials.get(materialKey);
    else materials.set(materialKey,m);
  });
  root.updateMatrixWorld(true);
  const bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true}));
  await writeFile(new URL(`${id}.glb`,output),bytes);
  let triangles=0, meshes=0;
  root.traverse(node=>{if(node.isMesh){meshes++;triangles+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3;}});
  inventory.push({id,bytes:bytes.length,meshes,triangles,sha256:createHash('sha256').update(bytes).digest('hex'),
    provenance:'Locally authored deterministic geometry. Not a TRELLIS reconstruction of the generated poster.', units:'normalized stage units',version:1});
  console.log(`${id}: ${meshes} parts, ${triangles} triangles, ${(bytes.length/1024).toFixed(0)} KiB`);
}
await writeFile(new URL('../hero-models.json',import.meta.url),JSON.stringify(inventory,null,2)+'\n');
