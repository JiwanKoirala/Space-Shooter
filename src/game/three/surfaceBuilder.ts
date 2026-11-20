import * as THREE from 'three';
import { PlanetConfig, ResourceId } from '../types';
import { createOdysseyShip } from './shipModel';
import { createTerrainDetailTexture } from './textures';

export interface SurfaceInteractable {
  id: string;
  label: string;
  type: 'resource' | 'artifact' | 'signal' | 'ship';
  resourceId?: ResourceId;
  amount?: number;
  position: THREE.Vector3;
  mesh: THREE.Object3D;
  collected: boolean;
  revealed: boolean;
}

export interface SurfaceWorldBundle {
  group: THREE.Group;
  interactables: SurfaceInteractable[];
  heightAt: (x: number, z: number) => number;
  scannerWave: THREE.Mesh;
}

export function surfaceHeightAt(x: number, z: number, biome: PlanetConfig['biome']): number {
  // Keep landing pad at origin flat
  const distOrigin = Math.hypot(x, z);
  const padFlatten = THREE.MathUtils.smoothstep(distOrigin, 12, 34);

  let h = 0;
  if (biome === 'ocean') {
    h = Math.sin(x * 0.045) * Math.cos(z * 0.045) * 4.5 + Math.sin((x + z) * 0.02) * 2.5;
    h = Math.max(-1.6, h);
  } else if (biome === 'volcanic') {
    h =
      Math.abs(Math.sin(x * 0.05) * Math.cos(z * 0.05)) * 10.5 +
      Math.sin(x * 0.12) * Math.sin(z * 0.12) * 2.2;
  } else if (biome === 'forest') {
    h = Math.sin(x * 0.035) * 4.0 + Math.cos(z * 0.04) * 4.0 + Math.sin((x - z) * 0.08) * 1.5;
  } else if (biome === 'ice') {
    h = Math.abs(Math.sin(x * 0.03 + z * 0.02)) * 7.0 + Math.cos(z * 0.07) * 1.8;
  } else if (biome === 'desert') {
    h = Math.sin(x * 0.05 + Math.sin(z * 0.03) * 2.0) * 5.2 + Math.cos(z * 0.025) * 2.5;
  } else {
    // ancient Vexis stepped plateaus
    const raw = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 7.5;
    h = Math.round(raw * 0.6) * 1.6;
  }

  return h * padFlatten;
}

export function buildSurfaceWorld(planet: PlanetConfig, isSoftwareGl = false): SurfaceWorldBundle {
  const group = new THREE.Group();
  const terrainSize = 460;
  const segments = 110;

  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    pos.setY(i, surfaceHeightAt(vx, vz, planet.biome));
  }
  terrainGeo.computeVertexNormals();

  const detailTex = createTerrainDetailTexture(planet.primaryColor, planet.secondaryColor);
  const terrainMat = new THREE.MeshStandardMaterial({
    map: detailTex,
    roughness: planet.biome === 'ice' ? 0.25 : 0.85,
    metalness: planet.biome === 'ancient' ? 0.45 : 0.08,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Water or Magma plane for ocean / volcanic worlds
  if (planet.biome === 'ocean' || planet.biome === 'volcanic') {
    const liquidGeo = new THREE.PlaneGeometry(terrainSize, terrainSize);
    liquidGeo.rotateX(-Math.PI / 2);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: planet.biome === 'ocean' ? 0x0284c7 : 0xf97316,
      emissive: planet.biome === 'ocean' ? 0x0369a1 : 0xea580c,
      emissiveIntensity: planet.biome === 'ocean' ? 0.25 : 1.15,
      roughness: planet.biome === 'ocean' ? 0.12 : 0.35,
      metalness: planet.biome === 'ocean' ? 0.3 : 0.1,
      transparent: planet.biome === 'ocean',
      opacity: planet.biome === 'ocean' ? 0.84 : 1.0,
    });
    const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    liquidMesh.position.y = planet.biome === 'ocean' ? -0.45 : 0.35;
    group.add(liquidMesh);
  }

  // Landing Pad + Parked ODYSSEY-7 at origin
  const padGeo = new THREE.CylinderGeometry(9.5, 11.0, 0.5, 24);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.75,
    roughness: 0.35,
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.set(0, 0.25, 0);
  pad.receiveShadow = true;
  group.add(pad);

  const padRing = new THREE.Mesh(
    new THREE.RingGeometry(8.2, 8.8, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }),
  );
  padRing.position.set(0, 0.52, 0);
  group.add(padRing);

  const landedShip = createOdysseyShip(isSoftwareGl);
  landedShip.landingStruts.visible = true;
  landedShip.thrusterCones.forEach((c) => {
    c.visible = false;
  });
  landedShip.thrusterLight.intensity = 0.6;
  landedShip.group.position.set(0, 2.35, 0);
  landedShip.group.rotation.y = Math.PI * 0.2;
  group.add(landedShip.group);

  // Biome Instanced Props (80 grounded features)
  const propCount = 80;
  let propGeo: THREE.BufferGeometry;
  let propColor = new THREE.Color(planet.accentColor);
  if (planet.biome === 'forest') {
    propGeo = new THREE.ConeGeometry(1.6, 8.5, 7);
    propGeo.translate(0, 4.25, 0);
  } else if (planet.biome === 'ancient') {
    propGeo = new THREE.BoxGeometry(1.8, 11.0, 1.8);
    propGeo.translate(0, 5.5, 0);
  } else if (planet.biome === 'ice') {
    propGeo = new THREE.OctahedronGeometry(2.2, 0);
    propGeo.scale(0.8, 2.6, 0.8);
    propGeo.translate(0, 4.0, 0);
  } else {
    propGeo = new THREE.DodecahedronGeometry(2.1, 0);
    propGeo.scale(1.1, 1.9, 1.1);
    propGeo.translate(0, 2.2, 0);
  }

  const propMat = new THREE.MeshStandardMaterial({
    color: propColor,
    roughness: planet.biome === 'ice' ? 0.2 : 0.72,
    metalness: planet.biome === 'ancient' ? 0.65 : 0.1,
    emissive: planet.biome === 'ancient' || planet.biome === 'forest' ? propColor : new THREE.Color(0x000000),
    emissiveIntensity: planet.biome === 'ancient' ? 0.35 : planet.biome === 'forest' ? 0.15 : 0,
  });

  const propInst = new THREE.InstancedMesh(propGeo, propMat, propCount);
  propInst.castShadow = true;
  propInst.receiveShadow = true;
  const dummy = new THREE.Object3D();

  for (let i = 0; i < propCount; i++) {
    const angle = (i / propCount) * Math.PI * 2 + Math.sin(i * 3.1) * 0.4;
    const dist = 28 + ((i * 37) % 165);
    const px = Math.cos(angle) * dist;
    const pz = Math.sin(angle) * dist;
    const py = surfaceHeightAt(px, pz, planet.biome);
    dummy.position.set(px, py - 0.3, pz);
    dummy.rotation.set((Math.sin(i) - 0.5) * 0.12, i * 1.1, (Math.cos(i) - 0.5) * 0.12);
    const s = 0.75 + (i % 5) * 0.24;
    dummy.scale.set(s, s * (0.9 + (i % 3) * 0.25), s);
    dummy.updateMatrix();
    propInst.setMatrixAt(i, dummy.matrix);
  }
  propInst.instanceMatrix.needsUpdate = true;
  propInst.computeBoundingSphere();
  group.add(propInst);

  // Interactive Collectibles, Ancient Ruins & Signal Beacons
  const interactables: SurfaceInteractable[] = [
    {
      id: 'ship_return',
      label: 'Board ODYSSEY-7 & Launch to Orbit',
      type: 'ship',
      position: new THREE.Vector3(0, 0.5, 0),
      mesh: landedShip.group,
      collected: false,
      revealed: true,
    },
  ];

  // 7 Resource Mineral Veins
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + 0.3;
    const dist = 34 + (i % 3) * 32;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    const ry = surfaceHeightAt(rx, rz, planet.biome);
    const resId = planet.resources[i % planet.resources.length];

    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(rx, ry, rz);

    const crystalMat = new THREE.MeshStandardMaterial({
      color: planet.accentColor,
      emissive: planet.accentColor,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.5,
    });
    for (let c = 0; c < 3; c++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), crystalMat);
      shard.scale.set(0.65, 1.8 - c * 0.25, 0.65);
      shard.position.set((c - 1) * 0.7, 0.9, (c % 2) * 0.5);
      shard.rotation.z = (c - 1) * 0.28;
      nodeGroup.add(shard);
    }

    const beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.1, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: planet.accentColor, side: THREE.DoubleSide }),
    );
    beaconRing.position.y = 0.15;
    nodeGroup.add(beaconRing);

    group.add(nodeGroup);
    interactables.push({
      id: `res_${planet.id}_${i}`,
      label: `Harvest ${resId.replace(/([A-Z])/g, ' $1').trim()}`,
      type: 'resource',
      resourceId: resId,
      amount: 3 + (i % 3),
      position: new THREE.Vector3(rx, ry, rz),
      mesh: nodeGroup,
      collected: false,
      revealed: i < 2,
    });
  }

  // 2 Ancient Alien Artifacts / Ruins
  for (let i = 0; i < 2; i++) {
    const angle = i * Math.PI + 0.9;
    const dist = 78 + i * 35;
    const ax = Math.cos(angle) * dist;
    const az = Math.sin(angle) * dist;
    const ay = surfaceHeightAt(ax, az, planet.biome);

    const ruinGroup = new THREE.Group();
    ruinGroup.position.set(ax, ay, az);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x312e81,
      metalness: 0.7,
      roughness: 0.35,
    });
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xe879f9 });

    const archL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 7.5, 1.1), stoneMat);
    archL.position.set(-2.2, 3.75, 0);
    ruinGroup.add(archL);

    const archR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 7.5, 1.1), stoneMat);
    archR.position.set(2.2, 3.75, 0);
    ruinGroup.add(archR);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.0, 1.4), stoneMat);
    lintel.position.set(0, 7.8, 0);
    ruinGroup.add(lintel);

    const floatingRelic = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), runeMat);
    floatingRelic.position.set(0, 3.8, 0);
    ruinGroup.add(floatingRelic);

    group.add(ruinGroup);
    interactables.push({
      id: `artifact_${planet.id}_${i}`,
      label: 'Extract Ancient Precursor Relic',
      type: 'artifact',
      resourceId: 'ancientRelics',
      amount: 1,
      position: new THREE.Vector3(ax, ay, az),
      mesh: ruinGroup,
      collected: false,
      revealed: false,
    });
  }

  // 1 Unknown Alien Signal Monolith
  {
    const sx = -95;
    const sz = -65;
    const sy = surfaceHeightAt(sx, sz, planet.biome);
    const sigGroup = new THREE.Group();
    sigGroup.position.set(sx, sy, sz);

    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 9.0, 6),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.65,
        metalness: 0.8,
        roughness: 0.2,
      }),
    );
    spire.position.y = 4.5;
    sigGroup.add(spire);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.14, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
    );
    halo.position.y = 5.5;
    sigGroup.add(halo);

    group.add(sigGroup);
    interactables.push({
      id: `signal_${planet.id}`,
      label: `Decode ${planet.alien.species} Signal`,
      type: 'signal',
      position: new THREE.Vector3(sx, sy, sz),
      mesh: sigGroup,
      collected: false,
      revealed: true,
    });
  }

  // Scanner Pulse Ring mesh
  const scannerWave = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.6, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scannerWave.visible = false;
  group.add(scannerWave);

  return {
    group,
    interactables,
    heightAt: (x, z) => surfaceHeightAt(x, z, planet.biome),
    scannerWave,
  };
}
