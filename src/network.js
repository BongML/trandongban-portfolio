import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The one 3D element on the page: the 500+ channel network, one block per
// channel, clustered around a hub per Amazon niche. It turns slowly, stops when
// off screen, and stays still for visitors who prefer reduced motion.
const NICHE_COLORS = [0xffa62b, 0xff8fb3, 0x8fc7ff, 0x2fd6b5, 0xff5a3c, 0xa89d87];
const N = 520;

export function startNetwork(canvas) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 32;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-8, 10, 12);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.5));

  const world = new THREE.Group();
  world.rotation.x = 0.16;
  scene.add(world);

  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const hubs = NICHE_COLORS.map((_, k) => {
    const y = 1 - (k / (NICHE_COLORS.length - 1)) * 2;
    const r = Math.sqrt(1 - y * y), th = k * 2.399963;
    return new THREE.Vector3(Math.cos(th) * r, y * 0.86, Math.sin(th) * r).multiplyScalar(7.6);
  });

  const material = new THREE.MeshStandardMaterial({ metalness: 0.2, roughness: 0.45 });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * 0.45;',
    );
  };
  const blocks = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.16), material, N);
  const edgePts = [];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < N; i++) {
    const isHub = i < hubs.length;
    const hub = hubs[i % hubs.length];
    if (isHub) {
      dummy.position.copy(hub);
      edgePts.push(hub.x, hub.y, hub.z, 0, 0, 0);
    } else {
      const a = rnd() * Math.PI * 2, b = rnd() * Math.PI * 2;
      const spread = 0.9 + Math.pow(rnd(), 0.7) * 3.1;
      dummy.position.set(Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a)).multiplyScalar(spread).add(hub);
      edgePts.push(dummy.position.x, dummy.position.y, dummy.position.z, hub.x, hub.y, hub.z);
    }
    dummy.rotation.set(rnd() * 6, rnd() * 6, 0);
    dummy.scale.setScalar(isHub ? 0.72 : 0.2 + rnd() * 0.15);
    dummy.updateMatrix();
    blocks.setMatrixAt(i, dummy.matrix);
    blocks.setColorAt(i, color.set(NICHE_COLORS[i % hubs.length]));
  }
  world.add(blocks);

  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3));
  world.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xf1e6cf, transparent: true, opacity: 0.13 })));
  world.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 1),
    new THREE.MeshBasicMaterial({ color: 0xffa62b, wireframe: true, transparent: true, opacity: 0.7 }),
  ));

  const render = () => renderer.render(scene, camera);
  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = Math.max(32, 25 / camera.aspect + 6);
    camera.updateProjectionMatrix();
    render();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  if (still) return;

  let visible = true, last = performance.now();
  const loop = (now) => {
    if (!visible) return;
    world.rotation.y += Math.min(0.05, (now - last) / 1000) * 0.07;
    last = now;
    render();
    requestAnimationFrame(loop);
  };
  const resume = (on) => {
    if (on && !visible) { visible = true; last = performance.now(); requestAnimationFrame(loop); }
    else if (!on) visible = false;
  };
  let onScreen = true;
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; resume(onScreen && !document.hidden); }).observe(canvas);
  document.addEventListener('visibilitychange', () => resume(onScreen && !document.hidden));
  requestAnimationFrame(loop);
}
