import { PLANETS } from './planets';
import { AudioSettings, GameSaveState, ResourceId, UpgradeLevels } from './types';

const SAVE_KEY = 'odyssey7_beyond_unknown_save_v1';
const AUDIO_KEY = 'odyssey7_beyond_unknown_audio_v1';

export function computeMaxStats(upgrades: UpgradeLevels) {
  return {
    maxHull: 100 + (upgrades.shields - 1) * 15,
    maxShield: 100 + (upgrades.shields - 1) * 35,
    maxFuel: 100 + (upgrades.fuelTank - 1) * 35,
    maxOxygen: 100 + (upgrades.lifeSupport - 1) * 30,
    maxEnergy: 100 + (upgrades.lifeSupport - 1) * 30,
    cargoCapacity: 120 + (upgrades.fuelTank - 1) * 25 + (upgrades.engines - 1) * 15,
    speedMultiplier: 1 + (upgrades.engines - 1) * 0.18,
    weaponDamage: 24 + (upgrades.weapons - 1) * 10,
    scannerRadius: 80 + (upgrades.scanners - 1) * 35,
    yieldBonus: 1 + (upgrades.scanners - 1) * 0.15,
    shieldRegen: 3.5 + (upgrades.shields - 1) * 2.0,
    energyRegen: 5.0 + (upgrades.lifeSupport - 1) * 2.2,
  };
}

export function createInitialSaveState(captainName = 'Captain Vance'): GameSaveState {
  const initialUpgrades: UpgradeLevels = {
    engines: 1,
    shields: 1,
    weapons: 1,
    scanners: 1,
    fuelTank: 1,
    lifeSupport: 1,
  };

  const attitudes: Record<string, number> = {};
  for (const p of PLANETS) {
    attitudes[p.id] = p.alien.initialAttitude;
  }

  return {
    captainName,
    explorationPoints: 50,
    currentPlanetId: 'nova-7',
    playMode: 'space',
    discoveredPlanets: ['nova-7'],
    landedPlanets: [],
    contactedAliens: [],
    alienAttitudes: attitudes,
    alienChats: {},
    ship: {
      hull: 100,
      maxHull: 100,
      shield: 100,
      maxShield: 100,
      fuel: 100,
      maxFuel: 100,
      oxygen: 100,
      maxOxygen: 100,
      energy: 100,
      maxEnergy: 100,
      cargoCapacity: 120,
    },
    upgrades: initialUpgrades,
    resources: {
      titanium: 12,
      deuterium: 10,
      cryoWater: 8,
      ignisOre: 4,
      xenobotanicals: 4,
      plasmaCores: 2,
      ancientRelics: 0,
    },
    activeMission: {
      id: 'initial_mission_1',
      title: 'Echoes of Atoll-9',
      briefing: 'Approach NOVA-7 in orbit and press [E] to land, then activate your pulse scanner [F] to locate 3 resource or signal nodes.',
      objectiveType: 'scan',
      targetPlanetId: 'nova-7',
      targetCount: 3,
      progress: 0,
      rewardPoints: 180,
      rewardResources: { deuterium: 8, titanium: 6 },
      narrativeHook: 'The 2389 Vexis signal resonated faintly off NOVA-7’s deep ocean trenches.',
      source: 'command',
      completed: false,
    },
    completedMissions: [],
    storyLog: [
      {
        id: 'story_0',
        stardate: '2389.041',
        title: 'Departure from Sol Relay',
        body: 'ODYSSEY-7 cleared the outer heliosphere toward Sector Vexis. Long-range arrays locked onto an impossible harmonic carrier wave pulsing from beyond NOVA-7.',
        planetId: 'nova-7',
        source: 'log',
      },
    ],
    decisions: [],
    achievements: ['first_flight'],
    kills: 0,
    scansCompleted: 0,
    artifactsFound: 0,
    lastSavedAt: new Date().toISOString(),
  };
}

export function loadSavedGame(): GameSaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSaveState;
    if (!parsed || !parsed.ship || !parsed.upgrades) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGame(state: GameSaveState): void {
  try {
    const payload: GameSaveState = {
      ...state,
      lastSavedAt: new Date().toISOString(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota issues
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore
  }
}

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_KEY);
    if (!raw) {
      return { muted: false, masterVolume: 0.7, musicVolume: 0.45, sfxVolume: 0.75 };
    }
    return JSON.parse(raw) as AudioSettings;
  } catch {
    return { muted: false, masterVolume: 0.7, musicVolume: 0.45, sfxVolume: 0.75 };
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function getTotalCargoCount(resources: Record<ResourceId, number>): number {
  return Object.values(resources).reduce((acc, val) => acc + val, 0);
}
