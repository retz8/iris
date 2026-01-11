import * as X from "three";

const a = new X.Scene();
const b = new X.PerspectiveCamera(57, window.innerWidth / window.innerHeight, 0.01, 1000);
const c = new X.WebGLRenderer({ antialias: true });
c.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(c.domElement);

const d = new X.BufferGeometry();
const e = [];
const f = [];

for (let i = 0; i < 600; i++) {
  const r = Math.random() * Math.PI * 2;
  const t = Math.random() * Math.PI;
  const s = 1 + Math.sin(i * 0.1) * 0.3;
  e.push(
    Math.cos(r) * Math.sin(t) * s,
    Math.sin(r) * Math.sin(t) * s,
    Math.cos(t) * s
  );
  f.push(Math.random(), Math.random(), Math.random());
}

d.setAttribute("position", new X.Float32BufferAttribute(e, 3));
d.setAttribute("color", new X.Float32BufferAttribute(f, 3));
d.computeVertexNormals();

const g = new X.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.6,
  metalness: 0.2
});

const h = new X.Mesh(d, g);
a.add(h);

const i = new X.DirectionalLight(0xffffff, 1);
i.position.set(2, 3, 4);
a.add(i);

const j = new X.AmbientLight(0x404040);
a.add(j);

b.position.z = 4;

let k = 0;

function m() {
  requestAnimationFrame(m);
  k += 0.01;

  const p = d.attributes.position;
  for (let n = 0; n < p.count; n++) {
    const x = p.getX(n);
    const y = p.getY(n);
    const z = p.getZ(n);
    const w = Math.sin(k + x * 3 + y * 3) * 0.02;
    p.setXYZ(n, x + w, y - w, z + w);
  }

  p.needsUpdate = true;
  d.computeVertexNormals();

  h.rotation.x += 0.002;
  h.rotation.y += 0.003;

  c.render(a, b);
}

m();
