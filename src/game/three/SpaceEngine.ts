import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLANETS } from '../planets';
import { computeMaxStats } from '../storage';
import {
  CameraMode,
  PlanetConfig,
  PlayMode,
  ResourceId,
  TelemetrySnapshot,
  UpgradeLevels,
} from '../types';
import { buildPlanet3D, PlanetMeshBundle } from './planetBuilder';
import {
  createOdysseyShip,
  createSentinelDrone,
  createSurfaceSkimmer,
  OdysseyShipHandles,
} from './shipModel';
import { buildSurfaceWorld, SurfaceWorldBundle } from './surfaceBuilder';
import { createGlowSpriteTexture } from './textures';

// Pre-allocated math helpers (zero GC inside render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _mat4 = new THREE.Matrix4();

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  fromPlayer: boolean;
  damage: number;
}

interface EnemyEntity {
  id: string;
  name: string;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  homePos: THREE.Vector3;
  cooldown: number;
  alive: boolean;
}

interface AsteroidData {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  rotSpeed: THREE.Vector3;
  scale: number;
  radius: number;
  hp: number;
  alive: boolean;
}

interface AnomalyData {
  id: string;
  label: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  triggered: boolean;
}

export interface EngineCallbacks {
  onTelemetry: (snap: TelemetrySnapshot) => void;
  onInteractPrompt?: () => void;
  onLandRequest: (planetId: string) => void;
  onLaunchRequest: () => void;
  onCollectResource: (resId: ResourceId, amount: number, isArtifact: boolean) => void;
  onDecodeSignal: (planetId: string) => void;
  onTriggerAnomaly: (anomalyId: string) => void;
  onEnemyDestroyed: (name: string) => void;
  onPlayerDamaged: (amount: number) => void;
  onConsumeFuelEnergy: (fuelUsed: number, energyUsed: number) => void;
  onScanCompleted: (nodesRevealed: number) => void;
  onPlanetDiscovered: (planetId: string) => void;
  onPlaySound: (
    kind: 'laser' | 'explosion' | 'pickup' | 'scan' | 'warp',
  ) => void;
  onEngineAudio: (speedRatio: number, boosting: boolean, active: boolean) => void;
}

export class SpaceEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  private callbacks: EngineCallbacks;
  private mode: 'menu' | PlayMode = 'menu';
  private paused = true;
  private cameraMode: CameraMode = 'third-person';
  private upgrades: UpgradeLevels = {
    engines: 1,
    shields: 1,
    weapons: 1,
    scanners: 1,
    fuelTank: 1,
    lifeSupport: 1,
  };
  private currentFuel = 100;
  private currentEnergy = 100;

  // Groups for mode switching
  private spaceGroup = new THREE.Group();
  private menuGroup = new THREE.Group();
  private surfaceBundle: SurfaceWorldBundle | null = null;
  private activeSurfacePlanet: PlanetConfig = PLANETS[0];

  // Player Ship & Skimmer
  private ship: OdysseyShipHandles;
  private menuShip: OdysseyShipHandles;
  private menuPlanet!: PlanetMeshBundle;
  private skimmer: THREE.Group;
  private shipPos = new THREE.Vector3(0, 10, -140);
  private shipVel = new THREE.Vector3();
  private shipYaw = 0;
  private shipPitch = 0;
  private shipRoll = 0;
  private skimmerPos = new THREE.Vector3(0, 1.5, 16);
  private skimmerYaw = 0;

  // Space Entities
  private planets: PlanetMeshBundle[] = [];
  private asteroids: AsteroidData[] = [];
  private asteroidMesh!: THREE.InstancedMesh;
  private enemies: EnemyEntity[] = [];
  private anomalies: AnomalyData[] = [];
  private projectiles: Projectile[] = [];
  private starPoints!: THREE.Points;
  private warpStreaks!: THREE.LineSegments;
  private warpTimer = 0;

  // Scanner Pulse
  private scanTimer = 0;
  private scanMaxTime = 1.6;
  private spaceScannerRing!: THREE.Mesh;

  // Input State
  private keys = new Set<string>();
  private pointerDeltaX = 0;
  private pointerDeltaY = 0;
  private pointerNormX = 0;
  private pointerNormY = 0;
  private mouseSteerActive = false;
  private fireCooldown = 0;
  private telemetryAccum = 0;
  private consumeAccum = 0;

  // Shared Projectile Geometry/Materials
  private playerLaserGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.8, 6).rotateX(Math.PI / 2);
  private playerLaserMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  private enemyLaserMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

  // Lights
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private defaultSpaceBg = new THREE.Color(0x030612);

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    this.scene = new THREE.Scene();
    this.scene.background = this.defaultSpaceBg.clone();
    this.scene.fog = new THREE.FogExp2(0x030612, 0.00042);

    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.2, 4200);

    // Studio IBL Environment for crisp PBR hull & glass reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff4e0, 2.3);
    this.keyLight.position.set(220, 180, 260);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 650;
    const d = 120;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-180, -90, -240);
    this.scene.add(rimLight);

    // Build Ships
    this.ship = createOdysseyShip(this.isSoftwareGl);
    this.spaceGroup.add(this.ship.group);

    this.menuShip = createOdysseyShip(this.isSoftwareGl);
    this.menuGroup.add(this.menuShip.group);

    this.skimmer = createSurfaceSkimmer();

    // Build Menu Scene & Space Scene
    this.buildMenuShowcase();
    this.buildSpaceSector();

    this.scene.add(this.menuGroup);
    this.scene.add(this.spaceGroup);
    this.spaceGroup.visible = false;

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.tick();
  }

  private buildMenuShowcase(): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.menuPlanet = buildPlanet3D(
      {
        ...PLANETS[0],
        position: [26, -6, -62],
        radius: 34,
      },
      maxAniso,
    );
    this.menuGroup.add(this.menuPlanet.group);

    // Menu distant starfield
    const starCount = 1400;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 180 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 80;
      const tint = Math.random();
      colors[i * 3] = tint > 0.7 ? 0.7 : 0.95;
      colors[i * 3 + 1] = tint > 0.3 ? 0.9 : 0.75;
      colors[i * 3 + 2] = 1.0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: 0.9 }),
    );
    this.menuGroup.add(stars);

    // Nebula Glow Sprites
    const nebTex1 = createGlowSpriteTexture('rgba(56,189,248,0.38)', 'rgba(14,116,144,0.08)');
    const nebTex2 = createGlowSpriteTexture('rgba(168,85,247,0.34)', 'rgba(88,28,135,0.06)');
    const s1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebTex1, blending: THREE.AdditiveBlending, depthWrite: false }));
    s1.position.set(-70, 35, -190);
    s1.scale.set(220, 140, 1);
    this.menuGroup.add(s1);

    const s2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebTex2, blending: THREE.AdditiveBlending, depthWrite: false }));
    s2.position.set(90, -40, -230);
    s2.scale.set(260, 160, 1);
    this.menuGroup.add(s2);
  }

  private buildSpaceSector(): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // Central luminous star
    const starCore = new THREE.Mesh(
      new THREE.SphereGeometry(28, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff3d6 }),
    );
    starCore.position.set(160, 120, 200);
    this.spaceGroup.add(starCore);

    const corona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createGlowSpriteTexture('rgba(255,225,165,0.95)', 'rgba(251,146,60,0.22)'),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    corona.position.copy(starCore.position);
    corona.scale.set(190, 190, 1);
    this.spaceGroup.add(corona);

    // Deep-space Multi-color Starfield
    const starCount = 2800;
    const sPos = new Float32Array(starCount * 3);
    const sCol = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const dist = 700 + Math.random() * 2100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      sPos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      sPos[i * 3 + 1] = dist * Math.cos(phi);
      sPos[i * 3 + 2] = dist * Math.sin(phi) * Math.sin(theta) - 550;

      const cChoice = i % 5;
      if (cChoice === 0) {
        sCol[i * 3] = 0.6; sCol[i * 3 + 1] = 0.85; sCol[i * 3 + 2] = 1.0;
      } else if (cChoice === 1) {
        sCol[i * 3] = 1.0; sCol[i * 3 + 1] = 0.85; sCol[i * 3 + 2] = 0.65;
      } else {
        sCol[i * 3] = 0.95; sCol[i * 3 + 1] = 0.97; sCol[i * 3 + 2] = 1.0;
      }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
    this.starPoints = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ size: 2.4, vertexColors: true, transparent: true, opacity: 0.92 }),
    );
    this.spaceGroup.add(this.starPoints);

    // Nebula Backdrop Clouds
    const nebulaSpecs: Array<{ pos: [number, number, number]; scale: number; inner: string; outer: string }> = [
      { pos: [-550, 220, -900], scale: 760, inner: 'rgba(14,165,233,0.28)', outer: 'rgba(14,116,144,0.03)' },
      { pos: [620, -140, -1100], scale: 880, inner: 'rgba(168,85,247,0.26)', outer: 'rgba(88,28,135,0.03)' },
      { pos: [40, 120, -1650], scale: 950, inner: 'rgba(236,72,153,0.20)', outer: 'rgba(79,70,229,0.02)' },
      { pos: [-400, -180, -350], scale: 620, inner: 'rgba(16,185,129,0.18)', outer: 'rgba(6,95,70,0.02)' },
    ];
    nebulaSpecs.forEach((n) => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createGlowSpriteTexture(n.inner, n.outer),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sprite.position.set(...n.pos);
      sprite.scale.set(n.scale, n.scale * 0.68, 1);
      this.spaceGroup.add(sprite);
    });

    // Warp Streak Lines (hidden until warpToPlanet)
    const streakCount = 140;
    const streakPos = new Float32Array(streakCount * 6);
    for (let i = 0; i < streakCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 4 + Math.random() * 28;
      const z = -Math.random() * 90;
      streakPos[i * 6] = Math.cos(ang) * rad;
      streakPos[i * 6 + 1] = Math.sin(ang) * rad;
      streakPos[i * 6 + 2] = z;
      streakPos[i * 6 + 3] = Math.cos(ang) * rad;
      streakPos[i * 6 + 4] = Math.sin(ang) * rad;
      streakPos[i * 6 + 5] = z - 16;
    }
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
    this.warpStreaks = new THREE.LineSegments(
      streakGeo,
      new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.8 }),
    );
    this.warpStreaks.visible = false;
    this.ship.group.add(this.warpStreaks);

    // Space Scanner Ring
    this.spaceScannerRing = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.5, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.spaceScannerRing.visible = false;
    this.spaceGroup.add(this.spaceScannerRing);

    // Build all 6 Unique 3D Planets
    for (const cfg of PLANETS) {
      const bundle = buildPlanet3D(cfg, maxAniso);
      this.planets.push(bundle);
      this.spaceGroup.add(bundle.group);
    }

    // Build Instanced Asteroid Field (150 asteroids distributed along sector lanes)
    const astCount = 150;
    const astGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const astMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.88,
      metalness: 0.18,
    });
    this.asteroidMesh = new THREE.InstancedMesh(astGeo, astMat, astCount);
    this.asteroidMesh.frustumCulled = false;

    for (let i = 0; i < astCount; i++) {
      const lanePlanet = PLANETS[i % PLANETS.length];
      const angle = (i * 2.399) % (Math.PI * 2);
      const rad = lanePlanet.radius * 2.6 + (i % 12) * 18;
      const pos = new THREE.Vector3(
        lanePlanet.position[0] + Math.cos(angle) * rad,
        lanePlanet.position[1] + ((i % 7) - 3) * 14,
        lanePlanet.position[2] + Math.sin(angle) * rad,
      );
      const scale = 2.2 + (i % 5) * 1.35;
      const ast: AsteroidData = {
        position: pos,
        rotation: new THREE.Euler(i * 0.4, i * 0.7, 0),
        rotSpeed: new THREE.Vector3(
          ((i % 3) - 1) * 0.35,
          ((i % 5) - 2) * 0.25,
          0.18,
        ),
        scale,
        radius: scale * 1.15,
        hp: 40,
        alive: true,
      };
      this.asteroids.push(ast);
      _mat4.compose(ast.position, _quat.setFromEuler(ast.rotation), _v1.setScalar(ast.scale));
      this.asteroidMesh.setMatrixAt(i, _mat4);
    }
    this.asteroidMesh.instanceMatrix.needsUpdate = true;
    this.asteroidMesh.computeBoundingSphere();
    this.spaceGroup.add(this.asteroidMesh);

    // Build Hostile Sentinel Interceptors near outer planets
    const enemyConfigs = [
      { id: 'sen_pyrax_1', name: 'Pyrax Sentinel Alpha', pos: [305, -18, -390] as [number, number, number] },
      { id: 'sen_pyrax_2', name: 'Pyrax Sentinel Beta', pos: [410, -10, -490] as [number, number, number] },
      { id: 'sen_cryon_1', name: 'Boreal Patrol Unit', pos: [-200, -25, -830] as [number, number, number] },
      { id: 'sen_aurelia_1', name: 'Solaris Raider', pos: [390, 50, -780] as [number, number, number] },
      { id: 'sen_vexis_1', name: 'Vexis Void Warden I', pos: [0, 20, -1140] as [number, number, number] },
      { id: 'sen_vexis_2', name: 'Vexis Void Warden II', pos: [95, 18, -1210] as [number, number, number] },
    ];
    enemyConfigs.forEach((ec) => {
      const mesh = createSentinelDrone();
      mesh.position.set(...ec.pos);
      this.spaceGroup.add(mesh);
      this.enemies.push({
        id: ec.id,
        name: ec.name,
        mesh,
        hp: 85,
        maxHp: 85,
        homePos: new THREE.Vector3(...ec.pos),
        cooldown: 1.5,
        alive: true,
      });
    });

    // Build Interactive Space Anomalies
    const anomalySpots = [
      { id: 'anom_rift_1', label: 'Investigate Subspace Rift Alpha', pos: [140, 15, -360] as [number, number, number] },
      { id: 'anom_relay_2', label: 'Inspect Derelict Beacon', pos: [-170, 22, -640] as [number, number, number] },
      { id: 'anom_vexis_3', label: 'Scan Precursor Singularity', pos: [-60, 16, -1060] as [number, number, number] },
    ];
    anomalySpots.forEach((a) => {
      const grp = new THREE.Group();
      grp.position.set(...a.pos);
      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(6.5, 0.35, 10, 36),
        new THREE.MeshBasicMaterial({ color: 0xc084fc }),
      );
      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.25, 10, 32),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      );
      ring2.rotation.x = Math.PI / 2;
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.8, 1),
        new THREE.MeshBasicMaterial({ color: 0xf0abfc }),
      );
      grp.add(ring1, ring2, core);
      this.spaceGroup.add(grp);
      this.anomalies.push({
        id: a.id,
        label: a.label,
        mesh: grp,
        position: new THREE.Vector3(...a.pos),
        triggered: false,
      });
    });
  }

  public setMode(nextMode: 'menu' | PlayMode, planetId?: string): void {
    this.mode = nextMode;
    this.keys.clear();

    if (nextMode === 'menu') {
      this.menuGroup.visible = true;
      this.spaceGroup.visible = false;
      this.clearSurface();
      this.scene.background = this.defaultSpaceBg.clone();
      this.scene.fog = new THREE.FogExp2(0x030612, 0.00042);
      this.callbacks.onEngineAudio(0, false, false);
      return;
    }

    this.menuGroup.visible = false;

    if (nextMode === 'space') {
      this.clearSurface();
      this.spaceGroup.visible = true;
      this.scene.background = this.defaultSpaceBg.clone();
      this.scene.fog = new THREE.FogExp2(0x030612, 0.00042);
      this.keyLight.color.setHex(0xfff4e0);
      this.keyLight.intensity = 2.3;
      this.hemiLight.color.setHex(0x93c5fd);
      this.hemiLight.groundColor.setHex(0x0f172a);
    } else if (nextMode === 'surface') {
      const targetPlanet = PLANETS.find((p) => p.id === planetId) ?? PLANETS[0];
      this.activeSurfacePlanet = targetPlanet;
      this.spaceGroup.visible = false;
      this.clearSurface();
      this.surfaceBundle = buildSurfaceWorld(targetPlanet, this.isSoftwareGl);
      this.scene.add(this.surfaceBundle.group);

      // Tint sky & fog to planet atmosphere
      const atmoColor = new THREE.Color(targetPlanet.atmosphereColor).multiplyScalar(0.18);
      this.scene.background = atmoColor;
      this.scene.fog = new THREE.FogExp2(atmoColor.getHex(), 0.0055);
      this.keyLight.color.set(targetPlanet.biome === 'volcanic' ? 0xffb070 : 0xffffff);
      this.hemiLight.color.set(targetPlanet.atmosphereColor);
      this.hemiLight.groundColor.set(targetPlanet.primaryColor);

      this.skimmerPos.set(0, 1.5, 16);
      this.skimmerYaw = 0;
      this.surfaceBundle.group.add(this.skimmer);
    }
  }

  private clearSurface(): void {
    if (this.surfaceBundle) {
      this.scene.remove(this.surfaceBundle.group);
      this.surfaceBundle.group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      this.surfaceBundle = null;
    }
  }

  public setPaused(isPaused: boolean): void {
    this.paused = isPaused;
    if (isPaused) {
      this.keys.clear();
      this.callbacks.onEngineAudio(0, false, false);
    }
  }

  public setCameraMode(camMode: CameraMode): void {
    this.cameraMode = camMode;
  }

  public toggleCameraMode(): CameraMode {
    this.cameraMode = this.cameraMode === 'third-person' ? 'cockpit' : 'third-person';
    return this.cameraMode;
  }

  public syncShipState(upgrades: UpgradeLevels, fuel: number, energy: number): void {
    this.upgrades = upgrades;
    this.currentFuel = fuel;
    this.currentEnergy = energy;
  }

  public warpToPlanet(planetId: string): void {
    const planet = PLANETS.find((p) => p.id === planetId);
    if (!planet) return;
    if (this.mode !== 'space') {
      this.setMode('space');
    }
    this.shipPos.set(
      planet.position[0],
      planet.position[1] + 6,
      planet.position[2] + planet.radius * 2.55,
    );
    this.shipVel.set(0, 0, -18);
    this.shipYaw = 0;
    this.shipPitch = 0;
    this.shipRoll = 0;
    this.warpTimer = 1.15;
    this.callbacks.onPlaySound('warp');
    this.callbacks.onPlanetDiscovered(planet.id);
  }

  public triggerScanner(): void {
    if (this.paused || this.mode === 'menu') return;
    this.scanTimer = this.scanMaxTime;
    this.callbacks.onPlaySound('scan');

    const stats = computeMaxStats(this.upgrades);
    if (this.mode === 'surface' && this.surfaceBundle) {
      let revealedCount = 0;
      for (const item of this.surfaceBundle.interactables) {
        if (!item.collected && !item.revealed) {
          const dist = item.position.distanceTo(this.skimmerPos);
          if (dist <= stats.scannerRadius * 1.7) {
            item.revealed = true;
            revealedCount++;
          }
        }
      }
      this.callbacks.onScanCompleted(revealedCount);
    } else if (this.mode === 'space') {
      this.callbacks.onScanCompleted(1);
    }
  }

  public triggerInteract(): void {
    if (this.paused || this.mode === 'menu') return;

    if (this.mode === 'space') {
      // Check nearest planet for landing
      let nearestPlanet: PlanetConfig | null = null;
      let minDist = Infinity;
      for (const p of PLANETS) {
        const d = this.shipPos.distanceTo(_v1.set(...p.position));
        if (d < minDist) {
          minDist = d;
          nearestPlanet = p;
        }
      }
      if (nearestPlanet && minDist <= nearestPlanet.radius * 2.4 + 28) {
        this.callbacks.onLandRequest(nearestPlanet.id);
        return;
      }

      // Check anomalies
      for (const a of this.anomalies) {
        if (!a.triggered && this.shipPos.distanceTo(a.position) < 30) {
          a.triggered = true;
          this.callbacks.onTriggerAnomaly(a.id);
          return;
        }
      }
    } else if (this.mode === 'surface' && this.surfaceBundle) {
      const stats = computeMaxStats(this.upgrades);
      let closest = null as (typeof this.surfaceBundle.interactables)[0] | null;
      let bestDist = 14;
      for (const item of this.surfaceBundle.interactables) {
        if (item.collected) continue;
        const d = item.position.distanceTo(this.skimmerPos);
        if (d < bestDist) {
          bestDist = d;
          closest = item;
        }
      }
      if (!closest) return;

      if (closest.type === 'ship') {
        this.callbacks.onLaunchRequest();
      } else if (closest.type === 'resource' || closest.type === 'artifact') {
        closest.collected = true;
        closest.mesh.visible = false;
        const bonusAmt = Math.max(
          1,
          Math.round((closest.amount ?? 2) * stats.yieldBonus),
        );
        this.callbacks.onPlaySound('pickup');
        this.callbacks.onCollectResource(
          closest.resourceId ?? 'titanium',
          bonusAmt,
          closest.type === 'artifact',
        );
      } else if (closest.type === 'signal') {
        closest.collected = true;
        this.callbacks.onPlaySound('pickup');
        this.callbacks.onDecodeSignal(this.activeSurfacePlanet.id);
      }
    }
  }

  public fireWeapon(): void {
    if (this.paused || this.mode !== 'space' || this.fireCooldown > 0) return;
    if (this.currentEnergy < 2) return;

    const stats = computeMaxStats(this.upgrades);
    this.fireCooldown = Math.max(0.14, 0.34 - (this.upgrades.weapons - 1) * 0.04);
    this.callbacks.onPlaySound('laser');
    this.callbacks.onConsumeFuelEnergy(0, 2);

    this.ship.group.updateMatrixWorld();
    const forward = _v1.set(0, 0, -1).applyQuaternion(this.ship.group.quaternion).normalize();

    [this.ship.muzzleLeft, this.ship.muzzleRight].forEach((muzzle) => {
      muzzle.getWorldPosition(_v2);
      const bolt = new THREE.Mesh(this.playerLaserGeo, this.playerLaserMat);
      bolt.position.copy(_v2);
      bolt.quaternion.copy(this.ship.group.quaternion);
      this.spaceGroup.add(bolt);
      this.projectiles.push({
        mesh: bolt,
        velocity: forward.clone().multiplyScalar(220).add(this.shipVel),
        life: 1.6,
        fromPlayer: true,
        damage: stats.weaponDamage,
      });
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const code = e.code;
    this.keys.add(code);
    if (code === 'Space' && this.mode !== 'menu' && !this.paused) {
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.paused || this.mode === 'menu') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNormY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    if (this.mouseSteerActive) {
      this.pointerDeltaX += e.movementX;
      this.pointerDeltaY += e.movementY;
    }
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (this.paused || this.mode === 'menu') return;
    if (e.button === 0) {
      this.mouseSteerActive = true;
      this.fireWeapon();
    } else if (e.button === 2) {
      this.mouseSteerActive = true;
    }
  };

  private handleMouseUp = (): void => {
    this.mouseSteerActive = false;
  };

  private tick = (): void => {
    if (this.disposed) return;

    const delta = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;

    if (this.mode === 'menu') {
      this.updateMenuScene(delta, elapsed);
    } else if (this.mode === 'space') {
      this.updateSpaceScene(delta, elapsed);
    } else if (this.mode === 'surface') {
      this.updateSurfaceScene(delta, elapsed);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateMenuScene(delta: number, elapsed: number): void {
    this.menuPlanet.surfaceMesh.rotation.y += delta * 0.04;
    this.menuPlanet.cloudMesh.rotation.y += delta * 0.058;

    // Gentle orbital glide for menu ODYSSEY-7
    const pathT = elapsed * 0.22;
    this.menuShip.group.position.set(
      -12 + Math.sin(pathT) * 18,
      Math.sin(pathT * 1.7) * 2.2,
      -14 + Math.cos(pathT) * 6,
    );
    this.menuShip.group.rotation.set(
      Math.sin(pathT * 1.3) * 0.08,
      -0.65 + Math.cos(pathT) * 0.14,
      Math.sin(pathT) * 0.16,
    );
    this.menuShip.sensorDish.rotation.y += delta * 1.4;
    this.menuShip.thrusterCones.forEach((cone, i) => {
      const pulse = 0.85 + Math.sin(elapsed * 14 + i) * 0.15;
      cone.scale.set(1, 1, pulse);
    });

    this.camera.position.set(0, 2.5, 16);
    this.camera.lookAt(6, -1, -24);
  }

  private updateSpaceScene(delta: number, elapsed: number): void {
    // Rotate planets & anomalies gently even if paused in map
    for (const p of this.planets) {
      p.surfaceMesh.rotation.y += delta * 0.025;
      p.cloudMesh.rotation.y += delta * 0.036;
      p.beaconRing.rotation.z += delta * 0.2;
    }

    for (const a of this.anomalies) {
      a.mesh.rotation.y += delta * 0.8;
      a.mesh.rotation.x += delta * 0.35;
      a.mesh.visible = !a.triggered;
    }

    // Animate asteroids
    let astNeedsUpdate = false;
    for (let i = 0; i < this.asteroids.length; i++) {
      const ast = this.asteroids[i];
      if (!ast.alive) continue;
      ast.rotation.x += ast.rotSpeed.x * delta;
      ast.rotation.y += ast.rotSpeed.y * delta;
      _mat4.compose(ast.position, _quat.setFromEuler(ast.rotation), _v1.setScalar(ast.scale));
      this.asteroidMesh.setMatrixAt(i, _mat4);
      astNeedsUpdate = true;
    }
    if (astNeedsUpdate) {
      this.asteroidMesh.instanceMatrix.needsUpdate = true;
    }

    if (this.paused) {
      return;
    }

    if (this.fireCooldown > 0) this.fireCooldown -= delta;

    // Flight Controls
    const stats = computeMaxStats(this.upgrades);
    const turnRate = 1.65;
    const pitchRate = 1.25;

    let yawInput = 0;
    let pitchInput = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) yawInput += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) yawInput -= 1;
    if (this.keys.has('KeyQ') || this.keys.has('ArrowUp')) pitchInput += 1;
    if (this.keys.has('KeyZ') || this.keys.has('ArrowDown')) pitchInput -= 1;

    // Smooth mouse steering (drag or gentle pointer offset deadzone)
    if (this.mouseSteerActive) {
      yawInput -= this.pointerDeltaX * 0.06;
      pitchInput -= this.pointerDeltaY * 0.06;
      this.pointerDeltaX = 0;
      this.pointerDeltaY = 0;
    } else if (Math.abs(this.pointerNormX) > 0.16 || Math.abs(this.pointerNormY) > 0.16) {
      const deadX = Math.abs(this.pointerNormX) > 0.16 ? this.pointerNormX * 0.55 : 0;
      const deadY = Math.abs(this.pointerNormY) > 0.16 ? this.pointerNormY * 0.45 : 0;
      yawInput -= deadX;
      pitchInput -= deadY;
    }

    this.shipYaw += yawInput * turnRate * delta;
    this.shipPitch = THREE.MathUtils.clamp(
      this.shipPitch + pitchInput * pitchRate * delta,
      -Math.PI * 0.42,
      Math.PI * 0.42,
    );
    const targetRoll = THREE.MathUtils.clamp(yawInput * 0.45, -0.55, 0.55);
    this.shipRoll = THREE.MathUtils.damp(this.shipRoll, targetRoll, 6, delta);

    _euler.set(this.shipPitch, this.shipYaw, this.shipRoll, 'YXZ');
    this.ship.group.quaternion.setFromEuler(_euler);

    const forward = _v1.set(0, 0, -1).applyQuaternion(this.ship.group.quaternion).normalize();

    const accelerating =
      this.keys.has('KeyW') || this.keys.has('Space');
    const reversing = this.keys.has('KeyS');
    const boosting =
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
      this.currentFuel > 1;

    if (this.keys.has('KeyJ')) {
      this.fireWeapon();
    }

    const baseAccel = 56 * stats.speedMultiplier;
    const boostMult = boosting ? 2.15 : 1.0;

    if (accelerating && this.currentFuel > 0.2) {
      this.shipVel.addScaledVector(forward, baseAccel * boostMult * delta);
    } else if (reversing) {
      this.shipVel.addScaledVector(forward, -baseAccel * 0.65 * delta);
    }

    // Space drag for crisp control
    const maxSpeed = 95 * stats.speedMultiplier * (boosting ? 1.85 : 1.0);
    if (this.shipVel.length() > maxSpeed) {
      this.shipVel.setLength(maxSpeed);
    }
    this.shipVel.multiplyScalar(Math.pow(0.45, delta));

    this.shipPos.addScaledVector(this.shipVel, delta);
    this.ship.group.position.copy(this.shipPos);

    // Fuel / energy drain
    this.consumeAccum += delta;
    if (this.consumeAccum >= 0.35) {
      const fuelBurn = accelerating ? (boosting ? 0.55 : 0.16) : 0;
      if (fuelBurn > 0) {
        this.callbacks.onConsumeFuelEnergy(fuelBurn, 0);
      }
      this.consumeAccum = 0;
    }

    // Engine plumes & audio
    const speed = this.shipVel.length();
    const speedRatio = Math.min(1, speed / (95 * stats.speedMultiplier));
    this.callbacks.onEngineAudio(speedRatio, boosting, true);

    this.ship.thrusterCones.forEach((cone, idx) => {
      const targetScale = accelerating ? (boosting ? 2.2 : 1.35) : 0.45 + speedRatio * 0.6;
      const flicker = 0.88 + Math.sin(elapsed * 24 + idx * 2) * 0.12;
      cone.scale.set(
        boosting ? 1.25 : 1,
        boosting ? 1.25 : 1,
        targetScale * flicker,
      );
      (cone.material as THREE.MeshBasicMaterial).color.setHex(
        boosting ? 0x67e8f9 : 0x38bdf8,
      );
    });
    this.ship.thrusterLight.intensity = accelerating ? (boosting ? 6.0 : 3.8) : 1.4;
    this.ship.sensorDish.rotation.y += delta * 1.5;

    // Warp Streak visual
    if (this.warpTimer > 0) {
      this.warpTimer -= delta;
      this.warpStreaks.visible = true;
      this.warpStreaks.position.z = ((1.15 - this.warpTimer) * 60) % 25;
    } else {
      this.warpStreaks.visible = false;
    }

    // Space scanner pulse wave
    if (this.scanTimer > 0) {
      this.scanTimer -= delta;
      const p = 1 - this.scanTimer / this.scanMaxTime;
      this.spaceScannerRing.visible = true;
      this.spaceScannerRing.position.copy(this.shipPos);
      this.spaceScannerRing.scale.setScalar(1 + p * 85);
      (this.spaceScannerRing.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.75;
    } else {
      this.spaceScannerRing.visible = false;
    }

    // Camera Choreography (Chase vs Cockpit) with smooth damping & speed FOV
    const targetFov = boosting || this.warpTimer > 0 ? 78 : 65 + speedRatio * 6;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, delta);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 'cockpit') {
      this.ship.group.visible = false;
      _camTargetPos.set(0, 0.9, -1.6).applyQuaternion(this.ship.group.quaternion).add(this.shipPos);
      _camTargetLook.set(0, 0.8, -32).applyQuaternion(this.ship.group.quaternion).add(this.shipPos);
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-18 * delta));
      this.camera.lookAt(_camTargetLook);
    } else {
      this.ship.group.visible = true;
      _camTargetPos.set(0, 4.4, 15.5).applyQuaternion(this.ship.group.quaternion).add(this.shipPos);
      _camTargetLook.set(0, 1.0, -24).applyQuaternion(this.ship.group.quaternion).add(this.shipPos);
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-9 * delta));
      this.camera.lookAt(_camTargetLook);
    }

    // Update Projectiles & Collisions
    this.updateProjectiles(delta);

    // Update Enemies AI
    this.updateEnemies(delta);

    // Planet Proximity Discovery & Asteroid Collision
    let nearestPlanet: PlanetConfig | null = null;
    let nearestDist = Infinity;
    for (const bundle of this.planets) {
      const dist = this.shipPos.distanceTo(bundle.group.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlanet = bundle.config;
      }
      if (dist < bundle.config.radius * 3.8) {
        this.callbacks.onPlanetDiscovered(bundle.config.id);
      }
      // Gentle repulsion from planet core
      if (dist < bundle.config.radius + 4) {
        _v2.subVectors(this.shipPos, bundle.group.position).normalize();
        this.shipPos.copy(bundle.group.position).addScaledVector(_v2, bundle.config.radius + 4.5);
        this.shipVel.multiplyScalar(0.3);
      }
    }

    for (let i = 0; i < this.asteroids.length; i++) {
      const ast = this.asteroids[i];
      if (!ast.alive) continue;
      if (this.shipPos.distanceTo(ast.position) < ast.radius + 2.8) {
        _v2.subVectors(this.shipPos, ast.position).normalize();
        this.shipPos.addScaledVector(_v2, 4);
        this.shipVel.negate().multiplyScalar(0.4);
        this.callbacks.onPlayerDamaged(12);
        this.callbacks.onPlaySound('explosion');
      }
    }

    // Emit HUD Telemetry (~15Hz)
    this.telemetryAccum += delta;
    if (this.telemetryAccum >= 0.065) {
      this.telemetryAccum = 0;
      this.emitSpaceTelemetry(nearestPlanet, nearestDist, boosting);
    }
  }

  private updateProjectiles(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;
      p.mesh.position.addScaledVector(p.velocity, delta);

      let remove = p.life <= 0;

      if (!remove && p.fromPlayer) {
        // Check enemy hits
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (p.mesh.position.distanceTo(enemy.mesh.position) < 4.5) {
            enemy.hp -= p.damage;
            remove = true;
            if (enemy.hp <= 0) {
              enemy.alive = false;
              enemy.mesh.visible = false;
              this.callbacks.onPlaySound('explosion');
              this.callbacks.onEnemyDestroyed(enemy.name);
              this.callbacks.onCollectResource('plasmaCores', 2, false);
            }
            break;
          }
        }
        // Check asteroid hits
        if (!remove) {
          for (let aIdx = 0; aIdx < this.asteroids.length; aIdx++) {
            const ast = this.asteroids[aIdx];
            if (!ast.alive) continue;
            if (p.mesh.position.distanceTo(ast.position) < ast.radius + 1.4) {
              ast.hp -= p.damage;
              remove = true;
              if (ast.hp <= 0) {
                ast.alive = false;
                _mat4.makeScale(0, 0, 0);
                this.asteroidMesh.setMatrixAt(aIdx, _mat4);
                this.asteroidMesh.instanceMatrix.needsUpdate = true;
                this.callbacks.onPlaySound('explosion');
                this.callbacks.onCollectResource('titanium', 3, false);
              }
              break;
            }
          }
        }
      } else if (!remove && !p.fromPlayer) {
        if (p.mesh.position.distanceTo(this.shipPos) < 4.2) {
          remove = true;
          this.callbacks.onPlayerDamaged(p.damage);
        }
      }

      if (remove) {
        this.spaceGroup.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEnemies(delta: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.mesh.rotation.y += delta * 1.4;
      const dist = enemy.mesh.position.distanceTo(this.shipPos);

      if (dist < 175) {
        // Intercept and circle player
        _v2.subVectors(this.shipPos, enemy.mesh.position).normalize();
        if (dist > 34) {
          enemy.mesh.position.addScaledVector(_v2, 26 * delta);
        } else {
          // Strafe orbit
          _v3.set(-_v2.z, 0, _v2.x);
          enemy.mesh.position.addScaledVector(_v3, 20 * delta);
        }
        enemy.mesh.lookAt(this.shipPos);

        enemy.cooldown -= delta;
        if (enemy.cooldown <= 0 && dist < 130) {
          enemy.cooldown = 1.9;
          const bolt = new THREE.Mesh(this.playerLaserGeo, this.enemyLaserMat);
          bolt.position.copy(enemy.mesh.position);
          bolt.lookAt(this.shipPos);
          this.spaceGroup.add(bolt);
          this.projectiles.push({
            mesh: bolt,
            velocity: _v2.clone().multiplyScalar(115),
            life: 1.8,
            fromPlayer: false,
            damage: 11,
          });
        }
      } else {
        // Patrol near homePos
        const homeDist = enemy.mesh.position.distanceTo(enemy.homePos);
        if (homeDist > 12) {
          _v2.subVectors(enemy.homePos, enemy.mesh.position).normalize();
          enemy.mesh.position.addScaledVector(_v2, 16 * delta);
        }
      }
    }
  }

  private updateSurfaceScene(delta: number, elapsed: number): void {
    if (!this.surfaceBundle) return;

    // Gentle hover animation on collectible artifacts
    for (const item of this.surfaceBundle.interactables) {
      if (item.collected) continue;
      if (item.type === 'artifact' || item.type === 'signal') {
        item.mesh.children.forEach((child, idx) => {
          if (idx > 0) child.rotation.y += delta * 0.9;
        });
      }
    }

    if (this.paused) return;

    const stats = computeMaxStats(this.upgrades);
    const moveSpeed = 24 * stats.speedMultiplier;
    const turnSpeed = 2.4;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.skimmerYaw += turnSpeed * delta;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.skimmerYaw -= turnSpeed * delta;
    if (this.mouseSteerActive) {
      this.skimmerYaw -= this.pointerDeltaX * 0.004;
      this.pointerDeltaX = 0;
      this.pointerDeltaY = 0;
    }

    const forward = _v1.set(-Math.sin(this.skimmerYaw), 0, -Math.cos(this.skimmerYaw));
    let throttle = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) throttle -= 0.7;
    const boosting =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('Space');
    const mult = boosting ? 1.55 : 1.0;

    this.skimmerPos.addScaledVector(forward, throttle * moveSpeed * mult * delta);
    // Keep within terrain perimeter
    this.skimmerPos.x = THREE.MathUtils.clamp(this.skimmerPos.x, -195, 195);
    this.skimmerPos.z = THREE.MathUtils.clamp(this.skimmerPos.z, -195, 195);

    const groundY = this.surfaceBundle.heightAt(this.skimmerPos.x, this.skimmerPos.z);
    const targetY = groundY + 1.15 + Math.sin(elapsed * 3.5) * 0.14;
    this.skimmerPos.y = THREE.MathUtils.damp(this.skimmerPos.y, targetY, 12, delta);

    this.skimmer.position.copy(this.skimmerPos);
    this.skimmer.rotation.y = this.skimmerYaw;

    this.callbacks.onEngineAudio(Math.abs(throttle) * 0.55, boosting, true);

    // Scanner Pulse Ring on Surface
    if (this.scanTimer > 0) {
      this.scanTimer -= delta;
      const p = 1 - this.scanTimer / this.scanMaxTime;
      this.surfaceBundle.scannerWave.visible = true;
      this.surfaceBundle.scannerWave.position.set(this.skimmerPos.x, groundY + 0.6, this.skimmerPos.z);
      this.surfaceBundle.scannerWave.scale.setScalar(1 + p * stats.scannerRadius * 0.9);
      (this.surfaceBundle.scannerWave.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;
    } else {
      this.surfaceBundle.scannerWave.visible = false;
    }

    // Surface Camera
    if (this.cameraMode === 'cockpit') {
      this.skimmer.visible = false;
      _camTargetPos.set(0, 1.3, -0.4).applyAxisAngle(_v2.set(0, 1, 0), this.skimmerYaw).add(this.skimmerPos);
      _camTargetLook.set(0, 1.1, -20).applyAxisAngle(_v2.set(0, 1, 0), this.skimmerYaw).add(this.skimmerPos);
    } else {
      this.skimmer.visible = true;
      _camTargetPos.set(0, 5.2, 12.5).applyAxisAngle(_v2.set(0, 1, 0), this.skimmerYaw).add(this.skimmerPos);
      _camTargetLook.set(0, 1.5, -14).applyAxisAngle(_v2.set(0, 1, 0), this.skimmerYaw).add(this.skimmerPos);
    }
    this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-10 * delta));
    this.camera.lookAt(_camTargetLook);

    this.telemetryAccum += delta;
    if (this.telemetryAccum >= 0.065) {
      this.telemetryAccum = 0;
      this.emitSurfaceTelemetry(Math.abs(throttle) * moveSpeed * mult, boosting);
    }
  }

  private emitSpaceTelemetry(nearestPlanet: PlanetConfig | null, nearestDist: number, boosting: boolean): void {
    let nearestInteractable: TelemetrySnapshot['nearestInteractable'] = null;
    if (nearestPlanet && nearestDist <= nearestPlanet.radius * 2.4 + 28) {
      nearestInteractable = {
        id: nearestPlanet.id,
        label: `Land on ${nearestPlanet.name}`,
        type: 'planet',
        distance: Math.round(nearestDist),
      };
    } else {
      for (const a of this.anomalies) {
        if (a.triggered) continue;
        const d = this.shipPos.distanceTo(a.position);
        if (d < 30) {
          nearestInteractable = {
            id: a.id,
            label: a.label,
            type: 'anomaly',
            distance: Math.round(d),
          };
          break;
        }
      }
    }

    // Find closest enemy for target lock
    let lockedTarget: TelemetrySnapshot['lockedTarget'] = null;
    let bestEnemyDist = 210;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = this.shipPos.distanceTo(enemy.mesh.position);
      if (d < bestEnemyDist) {
        bestEnemyDist = d;
        lockedTarget = {
          name: enemy.name,
          type: 'enemy',
          distance: Math.round(d),
          hp: enemy.hp,
          maxHp: enemy.maxHp,
        };
      }
    }

    // Screen-projected nav markers for planets & active enemies
    const navMarkers: TelemetrySnapshot['navMarkers'] = [];
    for (const p of PLANETS) {
      _v1.set(...p.position);
      const dist = this.shipPos.distanceTo(_v1);
      _v1.project(this.camera);
      const visible = _v1.z < 1 && Math.abs(_v1.x) <= 0.94 && Math.abs(_v1.y) <= 0.92;
      if (visible) {
        navMarkers.push({
          id: p.id,
          label: p.name,
          kind: 'planet',
          x: (_v1.x + 1) * 0.5,
          y: (-_v1.y + 1) * 0.5,
          visible,
          distance: Math.round(dist),
          color: p.atmosphereColor,
        });
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = this.shipPos.distanceTo(enemy.mesh.position);
      if (dist > 280) continue;
      _v1.copy(enemy.mesh.position).project(this.camera);
      const visible = _v1.z < 1 && Math.abs(_v1.x) <= 0.94 && Math.abs(_v1.y) <= 0.92;
      if (visible) {
        navMarkers.push({
          id: enemy.id,
          label: enemy.name,
          kind: 'enemy',
          x: (_v1.x + 1) * 0.5,
          y: (-_v1.y + 1) * 0.5,
          visible,
          distance: Math.round(dist),
          color: '#f43f5e',
        });
      }
    }

    this.callbacks.onTelemetry({
      speed: Math.round(this.shipVel.length()),
      boosting,
      coordinates: [
        Math.round(this.shipPos.x),
        Math.round(this.shipPos.y),
        Math.round(this.shipPos.z),
      ],
      nearestPlanetId: nearestPlanet?.id ?? null,
      nearestPlanetDist: Math.round(nearestDist),
      nearestInteractable,
      lockedTarget,
      navMarkers,
      scanActive: this.scanTimer > 0,
    });
  }

  private emitSurfaceTelemetry(speed: number, boosting: boolean): void {
    if (!this.surfaceBundle) return;
    let nearestInteractable: TelemetrySnapshot['nearestInteractable'] = null;
    let bestDist = 14;
    for (const item of this.surfaceBundle.interactables) {
      if (item.collected) continue;
      const d = item.position.distanceTo(this.skimmerPos);
      if (d < bestDist) {
        bestDist = d;
        nearestInteractable = {
          id: item.id,
          label: item.label,
          type: item.type,
          distance: Math.round(d),
        };
      }
    }

    const navMarkers: TelemetrySnapshot['navMarkers'] = [];
    for (const item of this.surfaceBundle.interactables) {
      if (item.collected || !item.revealed) continue;
      const d = item.position.distanceTo(this.skimmerPos);
      _v1.copy(item.position).add(_v2.set(0, 3.2, 0)).project(this.camera);
      const visible = _v1.z < 1 && Math.abs(_v1.x) <= 0.94 && Math.abs(_v1.y) <= 0.92;
      if (visible) {
        navMarkers.push({
          id: item.id,
          label: item.type === 'ship' ? 'ODYSSEY-7' : item.type.toUpperCase(),
          kind: item.type,
          x: (_v1.x + 1) * 0.5,
          y: (-_v1.y + 1) * 0.5,
          visible,
          distance: Math.round(d),
          color:
            item.type === 'artifact'
              ? '#fbbf24'
              : item.type === 'signal'
                ? '#c084fc'
                : item.type === 'ship'
                  ? '#38bdf8'
                  : '#34d399',
        });
      }
    }

    this.callbacks.onTelemetry({
      speed: Math.round(speed),
      boosting,
      coordinates: [
        Math.round(this.skimmerPos.x),
        Math.round(this.skimmerPos.y),
        Math.round(this.skimmerPos.z),
      ],
      nearestPlanetId: this.activeSurfacePlanet.id,
      nearestPlanetDist: 0,
      nearestInteractable,
      lockedTarget: null,
      navMarkers,
      scanActive: this.scanTimer > 0,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);

    this.clearSurface();
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
