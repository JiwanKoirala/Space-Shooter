export type GameScreen = 'menu' | 'intro' | 'playing';

export type PlayMode = 'space' | 'surface';

export type CameraMode = 'third-person' | 'cockpit';

export type ResourceId =
  | 'titanium'
  | 'deuterium'
  | 'cryoWater'
  | 'ignisOre'
  | 'xenobotanicals'
  | 'plasmaCores'
  | 'ancientRelics';

export type UpgradeKey =
  | 'engines'
  | 'shields'
  | 'weapons'
  | 'scanners'
  | 'fuelTank'
  | 'lifeSupport';

export interface ResourceCatalogItem {
  id: ResourceId;
  name: string;
  color: string;
  description: string;
}

export interface AlienProfile {
  name: string;
  species: string;
  title: string;
  personality: string;
  languageStyle: string;
  history: string;
  initialAttitude: number; // -100 to 100
  accentColor: string;
}

export interface PlanetConfig {
  id: string;
  name: string;
  subtitle: string;
  biome: 'ocean' | 'volcanic' | 'forest' | 'ice' | 'ancient' | 'desert';
  position: [number, number, number];
  radius: number;
  atmosphereColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  hasRings?: boolean;
  ringColor?: string;
  dangerLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
  dangerDescription: string;
  environmentSummary: string;
  resources: ResourceId[];
  landingZoneName: string;
  discoveryLore: string;
  alien: AlienProfile;
}

export interface ShipStats {
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  fuel: number;
  maxFuel: number;
  oxygen: number;
  maxOxygen: number;
  energy: number;
  maxEnergy: number;
  cargoCapacity: number;
}

export type UpgradeLevels = Record<UpgradeKey, number>;

export interface Mission {
  id: string;
  title: string;
  briefing: string;
  objectiveType: 'scan' | 'collect' | 'travel' | 'investigate' | 'combat' | 'diplomacy';
  targetPlanetId: string;
  targetCount: number;
  progress: number;
  rewardPoints: number;
  rewardResources: Partial<Record<ResourceId, number>>;
  narrativeHook: string;
  source: 'ai' | 'command';
  completed: boolean;
}

export interface SpaceEventChoice {
  id: string;
  label: string;
  description: string;
  outcomeText: string;
  hullDelta: number;
  shieldDelta: number;
  fuelDelta: number;
  energyDelta: number;
  oxygenDelta: number;
  pointsDelta: number;
  resourceGain?: Partial<Record<ResourceId, number>>;
  storyFlag?: string;
}

export interface SpaceEvent {
  id: string;
  title: string;
  category: 'Distress Signal' | 'Ship Malfunction' | 'Alien Encounter' | 'Asteroid Storm' | 'Ancient Station' | 'Unknown Transmission';
  description: string;
  choices: SpaceEventChoice[];
  source: 'ai' | 'fallback';
}

export interface AlienMessage {
  id: string;
  sender: 'player' | 'alien' | 'system';
  text: string;
  timestamp: string;
}

export interface StoryEntry {
  id: string;
  stardate: string;
  title: string;
  body: string;
  planetId?: string;
  source: 'ai' | 'log';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface AudioSettings {
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

export interface TelemetrySnapshot {
  speed: number;
  boosting: boolean;
  coordinates: [number, number, number];
  nearestPlanetId: string | null;
  nearestPlanetDist: number;
  nearestInteractable: {
    id: string;
    label: string;
    type: 'planet' | 'resource' | 'artifact' | 'signal' | 'anomaly' | 'ship';
    distance: number;
  } | null;
  lockedTarget: {
    name: string;
    type: 'enemy' | 'asteroid' | 'planet';
    distance: number;
    hp?: number;
    maxHp?: number;
  } | null;
  navMarkers: Array<{
    id: string;
    label: string;
    kind: 'planet' | 'enemy' | 'resource' | 'artifact' | 'signal' | 'ship';
    x: number; // normalized 0..1 screen coords
    y: number;
    visible: boolean;
    distance: number;
    color: string;
  }>;
  scanActive: boolean;
}

export interface GameSaveState {
  captainName: string;
  explorationPoints: number;
  currentPlanetId: string;
  playMode: PlayMode;
  discoveredPlanets: string[];
  landedPlanets: string[];
  contactedAliens: string[];
  alienAttitudes: Record<string, number>;
  alienChats: Record<string, AlienMessage[]>;
  ship: ShipStats;
  upgrades: UpgradeLevels;
  resources: Record<ResourceId, number>;
  activeMission: Mission;
  completedMissions: Mission[];
  storyLog: StoryEntry[];
  decisions: string[];
  achievements: string[];
  kills: number;
  scansCompleted: number;
  artifactsFound: number;
  lastSavedAt: string;
}
