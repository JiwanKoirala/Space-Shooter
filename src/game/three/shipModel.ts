import * as THREE from 'three';

export interface OdysseyShipHandles {
  group: THREE.Group;
  thrusterCones: THREE.Mesh[];
  thrusterLight: THREE.PointLight;
  sensorDish: THREE.Mesh;
  landingStruts: THREE.Group;
  muzzleLeft: THREE.Object3D;
  muzzleRight: THREE.Object3D;
}

export function createOdysseyShip(isSoftwareGl = false): OdysseyShipHandles {
  const group = new THREE.Group();

  // Materials with calibrated metalness/roughness contrast (>= 0.25 delta)
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xdce6f2,
    metalness: 0.72,
    roughness: 0.28,
  });

  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.42,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.45,
    roughness: 0.32,
    emissive: 0x0369a1,
    emissiveIntensity: 0.25,
  });

  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.1,
    roughness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.65,
    transparent: true,
    opacity: isSoftwareGl ? 0.55 : 0.9,
    ior: 1.5,
    clearcoat: 1.0,
  });

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  });

  // 1. Primary sculpted fuselage (ExtrudeGeometry with bevels, oriented along -Z forward)
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(0, 4.4); // Nose tip
  bodyShape.lineTo(1.25, 1.4);
  bodyShape.lineTo(1.55, -2.5);
  bodyShape.lineTo(0.8, -3.7);
  bodyShape.lineTo(-0.8, -3.7);
  bodyShape.lineTo(-1.55, -2.5);
  bodyShape.lineTo(-1.25, 1.4);
  bodyShape.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.75,
    bevelEnabled: true,
    bevelThickness: 0.22,
    bevelSize: 0.18,
    bevelSegments: 2,
  });
  bodyGeo.rotateX(Math.PI / 2);
  bodyGeo.translate(0, 0.35, 0);
  bodyGeo.computeVertexNormals();
  const fuselage = new THREE.Mesh(bodyGeo, hullMat);
  fuselage.castShadow = true;
  fuselage.receiveShadow = true;
  group.add(fuselage);

  // 2. Dorsal spine & reactor housing
  const spineGeo = new THREE.BoxGeometry(1.1, 0.55, 4.2);
  const spine = new THREE.Mesh(spineGeo, darkFrameMat);
  spine.position.set(0, 0.58, 0.55);
  spine.castShadow = true;
  group.add(spine);

  // 3. Pressurized bridge canopy
  const canopyGeo = new THREE.CapsuleGeometry(0.55, 1.4, 6, 12);
  canopyGeo.rotateX(Math.PI / 2);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, 0.68, -1.25);
  canopy.scale.set(1.05, 0.72, 1.15);
  group.add(canopy);

  // 4. Swept delta wings (left & right)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 1.2);
  wingShape.lineTo(4.2, -1.6);
  wingShape.lineTo(4.4, -2.6);
  wingShape.lineTo(0.9, -2.4);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.05,
    bevelSegments: 1,
  });
  wingGeo.rotateX(Math.PI / 2);

  const rightWing = new THREE.Mesh(wingGeo, hullMat);
  rightWing.position.set(0.95, 0.05, 0.8);
  rightWing.castShadow = true;
  group.add(rightWing);

  const leftWing = new THREE.Mesh(wingGeo, hullMat);
  leftWing.scale.x = -1;
  leftWing.position.set(-0.95, 0.05, 0.8);
  leftWing.castShadow = true;
  group.add(leftWing);

  // 5. Wing accent stripes
  const stripeGeo = new THREE.BoxGeometry(2.6, 0.08, 0.35);
  const stripeR = new THREE.Mesh(stripeGeo, accentMat);
  stripeR.position.set(2.5, 0.16, 1.8);
  stripeR.rotation.y = -0.52;
  group.add(stripeR);

  const stripeL = new THREE.Mesh(stripeGeo, accentMat);
  stripeL.position.set(-2.5, 0.16, 1.8);
  stripeL.rotation.y = 0.52;
  group.add(stripeL);

  // 6. Port & Starboard Warp Nacelles (LatheGeometry)
  const nacellePts = [
    new THREE.Vector2(0.0, -1.9),
    new THREE.Vector2(0.38, -1.7),
    new THREE.Vector2(0.46, 0.0),
    new THREE.Vector2(0.42, 1.6),
    new THREE.Vector2(0.28, 1.9),
  ];
  const nacelleGeo = new THREE.LatheGeometry(nacellePts, 16);
  nacelleGeo.rotateX(Math.PI / 2);

  const thrusterCones: THREE.Mesh[] = [];
  const exhaustGeo = new THREE.ConeGeometry(0.34, 2.2, 14);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  [-1.95, 1.95].forEach((xOffset) => {
    const nacelle = new THREE.Mesh(nacelleGeo, darkFrameMat);
    nacelle.position.set(xOffset, 0.22, 1.65);
    nacelle.castShadow = true;
    group.add(nacelle);

    const intakeRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 18), glowMat);
    intakeRing.position.set(xOffset, 0.22, -0.15);
    group.add(intakeRing);

    const nozzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 18), glowMat);
    nozzleRing.position.set(xOffset, 0.22, 3.5);
    group.add(nozzleRing);

    const cone = new THREE.Mesh(exhaustGeo, exhaustMat.clone());
    cone.position.set(xOffset, 0.22, 4.65);
    group.add(cone);
    thrusterCones.push(cone);
  });

  // Central auxiliary thruster cone
  const centerCone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.6, 16).rotateX(Math.PI / 2), exhaustMat.clone());
  centerCone.position.set(0, 0.2, 4.9);
  group.add(centerCone);
  thrusterCones.push(centerCone);

  // 7. Dorsal Quantum Sensor Dish
  const dishGeo = new THREE.CylinderGeometry(0.45, 0.15, 0.22, 16);
  const sensorDish = new THREE.Mesh(dishGeo, accentMat);
  sensorDish.position.set(0, 0.96, 1.35);
  group.add(sensorDish);

  // 8. Wingtip Plasma Cannons + Muzzle anchor points
  const barrelGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.3, 8).rotateX(Math.PI / 2);
  const cannonL = new THREE.Mesh(barrelGeo, darkFrameMat);
  cannonL.position.set(-4.1, 0.05, 2.2);
  group.add(cannonL);

  const cannonR = new THREE.Mesh(barrelGeo, darkFrameMat);
  cannonR.position.set(4.1, 0.05, 2.2);
  group.add(cannonR);

  const muzzleLeft = new THREE.Object3D();
  muzzleLeft.position.set(-4.1, 0.05, 1.4);
  group.add(muzzleLeft);

  const muzzleRight = new THREE.Object3D();
  muzzleRight.position.set(4.1, 0.05, 1.4);
  group.add(muzzleRight);

  // 9. Ventral Landing Struts (toggled visible when landed on planet surface)
  const landingStruts = new THREE.Group();
  const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
  const footGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.14, 12);
  [
    [0, -1.0, -2.1],
    [-1.6, -1.0, 1.6],
    [1.6, -1.0, 1.6],
  ].forEach(([sx, sy, sz]) => {
    const leg = new THREE.Mesh(strutGeo, darkFrameMat);
    leg.position.set(sx, sy, sz);
    landingStruts.add(leg);
    const foot = new THREE.Mesh(footGeo, hullMat);
    foot.position.set(sx, sy - 0.8, sz);
    landingStruts.add(foot);
  });
  landingStruts.visible = false;
  group.add(landingStruts);

  // 10. Engine PointLight
  const thrusterLight = new THREE.PointLight(0x38bdf8, 3.2, 24, 1.8);
  thrusterLight.position.set(0, 0.3, 4.6);
  group.add(thrusterLight);

  return {
    group,
    thrusterCones,
    thrusterLight,
    sensorDish,
    landingStruts,
    muzzleLeft,
    muzzleRight,
  };
}

export function createSentinelDrone(): THREE.Group {
  const group = new THREE.Group();

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    metalness: 0.85,
    roughness: 0.25,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    emissive: 0xbe123c,
    emissiveIntensity: 0.8,
    metalness: 0.6,
    roughness: 0.2,
  });

  // Core
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 1), shellMat);
  group.add(core);

  // Glowing Sensor Eye
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), eyeMat);
  eye.position.set(0, 0, -1.1);
  group.add(eye);

  // Orbiting Ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.14, 8, 28), ringMat);
  ring.rotation.x = Math.PI / 3;
  group.add(ring);

  // 3 Blade Pylons
  const bladeGeo = new THREE.ConeGeometry(0.35, 2.8, 4);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const blade = new THREE.Mesh(bladeGeo, shellMat);
    blade.position.set(Math.cos(angle) * 2.1, Math.sin(angle) * 2.1, 0.4);
    blade.rotation.z = angle - Math.PI / 2;
    group.add(blade);
  }

  return group;
}

export function createSurfaceSkimmer(): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.65,
    roughness: 0.3,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.4,
    roughness: 0.4,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.35,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.9,
    roughness: 0.1,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.5), hullMat);
  chassis.position.y = 0.5;
  chassis.castShadow = true;
  group.add(chassis);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), visorMat);
  canopy.scale.set(0.95, 0.65, 1.3);
  canopy.position.set(0, 0.88, -0.2);
  group.add(canopy);

  const podL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.8, 10).rotateX(Math.PI / 2), trimMat);
  podL.position.set(-1.0, 0.4, 0.1);
  group.add(podL);

  const podR = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.8, 10).rotateX(Math.PI / 2), trimMat);
  podR.position.set(1.0, 0.4, 0.1);
  group.add(podR);

  const hoverLight = new THREE.PointLight(0x38bdf8, 2.2, 16);
  hoverLight.position.set(0, 0.2, 0);
  group.add(hoverLight);

  return group;
}
