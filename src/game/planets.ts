import { Achievement, PlanetConfig, ResourceCatalogItem, ResourceId, UpgradeKey } from './types';

export const RESOURCE_CATALOG: Record<ResourceId, ResourceCatalogItem> = {
  titanium: {
    id: 'titanium',
    name: 'Titanium Alloy',
    color: '#94a3b8',
    description: 'Structural hull plating salvaged from asteroids and mineral veins.',
  },
  deuterium: {
    id: 'deuterium',
    name: 'Deuterium',
    color: '#38bdf8',
    description: 'High-yield fusion fuel isotope powering ODYSSEY-7 warp thrusters.',
  },
  cryoWater: {
    id: 'cryoWater',
    name: 'Cryo-Water',
    color: '#67e8f9',
    description: 'Purified glacial/oceanic coolant and oxygen electrolysis reserve.',
  },
  ignisOre: {
    id: 'ignisOre',
    name: 'Ignis Ore',
    color: '#fb923c',
    description: 'Superheated volcanic mineral critical for weapon and thermal plating.',
  },
  xenobotanicals: {
    id: 'xenobotanicals',
    name: 'Xenobotanicals',
    color: '#34d399',
    description: 'Bioluminescent flora compounds used in advanced life-support matrices.',
  },
  plasmaCores: {
    id: 'plasmaCores',
    name: 'Plasma Cores',
    color: '#c084fc',
    description: 'Condensed energy cells harvested from anomalies and shield capacitors.',
  },
  ancientRelics: {
    id: 'ancientRelics',
    name: 'Ancient Relics',
    color: '#fbbf24',
    description: 'Precursor artifacts encoding star-sector coordinates and forgotten science.',
  },
};

export const PLANETS: PlanetConfig[] = [
  {
    id: 'nova-7',
    name: 'NOVA-7',
    subtitle: 'Pelagic Sanctuary',
    biome: 'ocean',
    position: [0, 8, -280],
    radius: 34,
    atmosphereColor: '#38bdf8',
    primaryColor: '#0369a1',
    secondaryColor: '#0ea5e9',
    accentColor: '#34d399',
    dangerLevel: 'Low',
    dangerDescription: 'Ionized tidal squalls and magnetic reef currents.',
    environmentSummary: 'Global cerulean oceans dotted with bioluminescent coral atolls and floating thermal vents.',
    resources: ['cryoWater', 'deuterium', 'xenobotanicals'],
    landingZoneName: 'Atoll Echo-9',
    discoveryLore: 'First charted by long-range probes in 2387, NOVA-7 hides a resonant acoustic network beneath its abyssal trenches.',
    alien: {
      name: 'Sora-Vey',
      species: 'Thalassian',
      title: 'Cantor of the Deep Choir',
      personality: 'Serene, philosophical, speaks in tidal metaphors and harmonic cadences.',
      languageStyle: 'Poetic, fluid, emphasizes unity, memory carried in water, and cosmic balance.',
      history: 'The Thalassians evolved in pressurized ocean trenches and built living coral spires capable of singing across starlight.',
      initialAttitude: 35,
      accentColor: '#38bdf8',
    },
  },
  {
    id: 'pyrax',
    name: 'PYRAX',
    subtitle: 'Volcanic Forge',
    biome: 'volcanic',
    position: [360, -24, -460],
    radius: 30,
    atmosphereColor: '#f97316',
    primaryColor: '#451a03',
    secondaryColor: '#dc2626',
    accentColor: '#fb923c',
    dangerLevel: 'High',
    dangerDescription: 'Superheated magma eruptions and sulfuric plasma storms.',
    environmentSummary: 'Shattered basalt calderas glowing with rivers of molten iron and obsidian ridges.',
    resources: ['ignisOre', 'titanium', 'plasmaCores'],
    landingZoneName: 'Cinder Bastion',
    discoveryLore: 'PYRAX orbits dangerously close to a magnetar remnant, forging rare heavy isotopes inside its crust.',
    alien: {
      name: 'Kael-Torr',
      species: 'Ignari Collective',
      title: 'Forge Warden',
      personality: 'Stoic, direct, respects resilience and technical mastery, skeptical of fragile outsiders.',
      languageStyle: 'Crisp, measured, uses metallurgical and thermal imagery.',
      history: 'Silicon-based artisans who survived three stellar flares by anchoring cities inside dormant volcanic shafts.',
      initialAttitude: -10,
      accentColor: '#fb923c',
    },
  },
  {
    id: 'elysium',
    name: 'ELYSIUM',
    subtitle: 'Verdant Canopy',
    biome: 'forest',
    position: [-340, 32, -520],
    radius: 36,
    atmosphereColor: '#10b981',
    primaryColor: '#065f46',
    secondaryColor: '#10b981',
    accentColor: '#a3e635',
    dangerLevel: 'Moderate',
    dangerDescription: 'Dense neuro-spore mists and territorial canopy drones.',
    environmentSummary: 'Towering emerald mega-flora, glowing spore glades, and misty river canyons.',
    resources: ['xenobotanicals', 'cryoWater', 'deuterium'],
    landingZoneName: 'Verdant Clearing',
    discoveryLore: 'Every forest on ELYSIUM shares a single planetary root-synapse that remembers millennia of visitors.',
    alien: {
      name: 'Lyra-Thorn',
      species: 'Sylvari Bloom',
      title: 'Root-Speaker',
      personality: 'Curious, empathetic, deeply protective of planetary ecosystems.',
      languageStyle: 'Organic, rhythmic, refers to ships as "iron seeds" and humans as "star-wanderers".',
      history: 'Symbiotic botanical consciousnesses that archived pre-collapse seed vaults for wandering civilizations.',
      initialAttitude: 20,
      accentColor: '#34d399',
    },
  },
  {
    id: 'cryon',
    name: 'CRYON',
    subtitle: 'Glacial Archive',
    biome: 'ice',
    position: [-260, -40, -900],
    radius: 32,
    atmosphereColor: '#67e8f9',
    primaryColor: '#0f172a',
    secondaryColor: '#bae6fd',
    accentColor: '#22d3ee',
    hasRings: true,
    ringColor: '#7dd3fc',
    dangerLevel: 'Moderate',
    dangerDescription: 'Sub-zero cryo-squalls draining ship energy and rogue ice shards.',
    environmentSummary: 'Mirror-flat glacial plains, crystalline ice arches, and shimmering polar auroras.',
    resources: ['cryoWater', 'titanium', 'ancientRelics'],
    landingZoneName: 'Glacier Spire-4',
    discoveryLore: 'Frozen within CRYON’s kilometers-deep ice sheet lie intact relays left by an extinct precursor fleet.',
    alien: {
      name: 'Unit Boreas-09',
      species: 'Boreal Remnant',
      title: 'Cryo-Archivist Construct',
      personality: 'Analytical, precise, haunted by the disappearance of its creators.',
      languageStyle: 'Formal, chronological, cites archival timestamps and orbital telemetry.',
      history: 'Autonomous crystal-core guardians engineered to preserve galactic star charts in absolute-zero vaults.',
      initialAttitude: 5,
      accentColor: '#67e8f9',
    },
  },
  {
    id: 'aurelia',
    name: 'AURELIA',
    subtitle: 'Solaris Dunes',
    biome: 'desert',
    position: [440, 44, -840],
    radius: 31,
    atmosphereColor: '#f59e0b',
    primaryColor: '#92400e',
    secondaryColor: '#f59e0b',
    accentColor: '#fde047',
    dangerLevel: 'Moderate',
    dangerDescription: 'Electromagnetic dust storms and automated sentinel patrols.',
    environmentSummary: 'Wind-sculpted golden dunes, vitrified glass canyons, and sun-bleached monolith temples.',
    resources: ['titanium', 'ignisOre', 'ancientRelics'],
    landingZoneName: 'Helios Basin',
    discoveryLore: 'Ancient solar mirrors embedded in AURELIA’s dunes still focus faint signals toward the Vexis rift.',
    alien: {
      name: 'Zahir-Sol',
      species: 'Sandswept Nomads',
      title: 'Chronicle Navigator',
      personality: 'Witty, hospitable to bold explorers, values shared stories and star maps.',
      languageStyle: 'Warm, aphoristic, speaks of horizons, wind-marks, and solar tides.',
      history: 'Nomadic astronomers who navigate by shifting dune harmonics and starlight refraction.',
      initialAttitude: 25,
      accentColor: '#fbbf24',
    },
  },
  {
    id: 'vexis',
    name: 'VEXIS',
    subtitle: 'Obsidian Origin',
    biome: 'ancient',
    position: [40, 12, -1240],
    radius: 40,
    atmosphereColor: '#a855f7',
    primaryColor: '#1e1b4b',
    secondaryColor: '#6d28d9',
    accentColor: '#e879f9',
    hasRings: true,
    ringColor: '#c084fc',
    dangerLevel: 'Extreme',
    dangerDescription: 'Void anomalies, gravitational shear, and hostile Sentinel interceptors.',
    environmentSummary: 'Pitch-black obsidian plains pierced by levitating violet monoliths and precursor nexus rings.',
    resources: ['ancientRelics', 'plasmaCores', 'deuterium'],
    landingZoneName: 'Nexus Threshold',
    discoveryLore: 'Source of the 2389 anomalous transmission. VEXIS is the central anchor of an ancient galactic beacon.',
    alien: {
      name: 'The Vexari Echo',
      species: 'Precursor Consciousness',
      title: 'Keeper of the Signal',
      personality: 'Enigmatic, ancient, evaluates whether humanity is ready to inherit cosmic knowledge.',
      languageStyle: 'Resonant, timeless, blends quantum paradoxes with probing questions about human intent.',
      history: 'Before ascending beyond physical starships, the Vexari seeded beacons across the sector to summon worthy explorers.',
      initialAttitude: 0,
      accentColor: '#c084fc',
    },
  },
];

export interface UpgradeSpec {
  key: UpgradeKey;
  name: string;
  description: string;
  effectLabel: (level: number) => string;
  maxLevel: number;
  baseCost: Partial<Record<ResourceId, number>>;
}

export const UPGRADE_SPECS: UpgradeSpec[] = [
  {
    key: 'engines',
    name: 'Ion-Warp Thrusters',
    description: 'Increases cruise thrust, hyper-boost velocity, and thruster fuel efficiency.',
    effectLabel: (lvl) => `+${(lvl - 1) * 18}% Speed & Thrust`,
    maxLevel: 5,
    baseCost: { titanium: 8, deuterium: 6 },
  },
  {
    key: 'shields',
    name: 'Aegis Deflector Grid',
    description: 'Expands maximum deflector shield capacity and passive shield regeneration.',
    effectLabel: (lvl) => `${100 + (lvl - 1) * 35} Max Shield`,
    maxLevel: 5,
    baseCost: { titanium: 6, plasmaCores: 3 },
  },
  {
    key: 'weapons',
    name: 'Twin Plasma Cannons',
    description: 'Enhances plasma bolt damage, fire cadence, and thermal penetration.',
    effectLabel: (lvl) => `${24 + (lvl - 1) * 10} DMG / Bolt`,
    maxLevel: 5,
    baseCost: { ignisOre: 5, titanium: 6 },
  },
  {
    key: 'scanners',
    name: 'Quantum Pulse Array',
    description: 'Extends planetary scanner radius and boosts resource extraction yield.',
    effectLabel: (lvl) => `${80 + (lvl - 1) * 35}m Range (+${(lvl - 1) * 15}% Yield)`,
    maxLevel: 5,
    baseCost: { cryoWater: 5, plasmaCores: 2 },
  },
  {
    key: 'fuelTank',
    name: 'Deuterium Containment',
    description: 'Increases fuel tank capacity and reduces warp-jump consumption.',
    effectLabel: (lvl) => `${100 + (lvl - 1) * 35} Max Fuel`,
    maxLevel: 5,
    baseCost: { deuterium: 8, titanium: 5 },
  },
  {
    key: 'lifeSupport',
    name: 'Bio-Matrix Life Support',
    description: 'Expands oxygen reserves, reactor energy capacity, and energy regeneration.',
    effectLabel: (lvl) => `${100 + (lvl - 1) * 30} O2 & Energy`,
    maxLevel: 5,
    baseCost: { xenobotanicals: 5, cryoWater: 6 },
  },
];

export const ACHIEVEMENTS_LIST: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  {
    id: 'first_flight',
    title: 'Launch Sequence',
    description: 'Take command of ODYSSEY-7 in Sector 2389.',
    points: 50,
  },
  {
    id: 'first_landing',
    title: 'Planetary Touchdown',
    description: 'Successfully land on an uncharted alien world.',
    points: 100,
  },
  {
    id: 'first_contact',
    title: 'First Contact',
    description: 'Establish direct communication with an alien civilization.',
    points: 120,
  },
  {
    id: 'artifact_hunter',
    title: 'Precursor Archivist',
    description: 'Recover 3 Ancient Relics from planetary ruins.',
    points: 180,
  },
  {
    id: 'void_defender',
    title: 'Sentinel Breaker',
    description: 'Neutralize 3 hostile Sentinel interceptors in space combat.',
    points: 150,
  },
  {
    id: 'master_engineer',
    title: 'Chief Engineer',
    description: 'Upgrade any ship subsystem to Level 3 or higher.',
    points: 140,
  },
  {
    id: 'galaxy_cartographer',
    title: 'Galactic Pathfinder',
    description: 'Discover all 6 worlds across the uncharted sector.',
    points: 300,
  },
  {
    id: 'vexis_signal',
    title: 'Beyond the Unknown',
    description: 'Reach VEXIS and investigate the origin of the 2389 signal.',
    points: 350,
  },
];

export function getCaptainRank(points: number): { level: number; title: string; nextThreshold: number } {
  const ranks = [
    { threshold: 0, title: 'Ensign Pathfinder' },
    { threshold: 200, title: 'Lieutenant Navigator' },
    { threshold: 500, title: 'Commander of Odyssey' },
    { threshold: 900, title: 'Sector Captain' },
    { threshold: 1400, title: 'Starfleet Vanguard' },
    { threshold: 2100, title: 'Precursor Envoy' },
  ];
  let level = 1;
  let title = ranks[0].title;
  let nextThreshold = ranks[1].threshold;
  for (let i = 0; i < ranks.length; i++) {
    if (points >= ranks[i].threshold) {
      level = i + 1;
      title = ranks[i].title;
      nextThreshold = ranks[i + 1]?.threshold ?? ranks[i].threshold + 1000;
    }
  }
  return { level, title, nextThreshold };
}

export function getUpgradeCost(spec: UpgradeSpec, currentLevel: number): Partial<Record<ResourceId, number>> {
  const mult = Math.pow(1.6, currentLevel - 1);
  const cost: Partial<Record<ResourceId, number>> = {};
  for (const [k, v] of Object.entries(spec.baseCost)) {
    cost[k as ResourceId] = Math.ceil((v ?? 1) * mult);
  }
  return cost;
}
