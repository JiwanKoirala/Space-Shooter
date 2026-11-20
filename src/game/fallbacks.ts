import { PLANETS } from './planets';
import { Mission, ResourceId, SpaceEvent } from './types';

export function buildFallbackMission(planetId: string, discoveredCount: number): Mission {
  const planet = PLANETS.find((p) => p.id === planetId) ?? PLANETS[0];
  const templates: Array<Omit<Mission, 'id' | 'progress' | 'source' | 'completed'>> = [
    {
      title: `Surface Survey: ${planet.name}`,
      briefing: `Land on ${planet.name} (${planet.landingZoneName}) and use your pulse scanner to catalog mineral deposits and alien signatures.`,
      objectiveType: 'scan',
      targetPlanetId: planet.id,
      targetCount: 3,
      rewardPoints: 160,
      rewardResources: { deuterium: 8, titanium: 6 },
      narrativeHook: `Sensor sweeps detected anomalous resonance beneath ${planet.landingZoneName}.`,
    },
    {
      title: `Resource Extraction: ${planet.name}`,
      briefing: `Harvest 3 resource nodes on ${planet.name} or nearby asteroid belts to reinforce ODYSSEY-7 reserves.`,
      objectiveType: 'collect',
      targetPlanetId: planet.id,
      targetCount: 3,
      rewardPoints: 180,
      rewardResources: { plasmaCores: 3, cryoWater: 6 },
      narrativeHook: 'Long-range warp sustainability depends on replenishing deuterium and alloy stores.',
    },
    {
      title: `Diplomatic Hail: ${planet.alien.species}`,
      briefing: `Open the Comms Terminal and converse with ${planet.alien.name} of ${planet.name} to learn about the 2389 Vexis signal.`,
      objectiveType: 'diplomacy',
      targetPlanetId: planet.id,
      targetCount: 1,
      rewardPoints: 150,
      rewardResources: { ancientRelics: 1, deuterium: 6 },
      narrativeHook: `${planet.alien.species} archives may hold crucial star-charts toward VEXIS.`,
    },
  ];

  const picked = templates[discoveredCount % templates.length];
  return {
    ...picked,
    id: `mission_${Date.now()}`,
    progress: 0,
    source: 'command',
    completed: false,
  };
}

export function buildFallbackAlienReply(
  planetId: string,
  playerMessage: string,
): { reply: string; attitudeShift: number; loreFragment: string } {
  const planet = PLANETS.find((p) => p.id === planetId) ?? PLANETS[0];
  const lower = playerMessage.toLowerCase();

  if (lower.includes('signal') || lower.includes('vexis') || lower.includes('ancient')) {
    return {
      reply: `(${planet.alien.species} Resonance) The signal from VEXIS is older than your star-charts, Captain. We ${planet.alien.species} remember when the Obsidian Ring last awakened—it calls only to vessels carrying curiosity without conquest.`,
      attitudeShift: 6,
      loreFragment: `${planet.alien.name} confirmed the 2389 signal originates from the VEXIS Obsidian Ring.`,
    };
  }
  if (lower.includes('trade') || lower.includes('resource') || lower.includes('help') || lower.includes('fuel')) {
    return {
      reply: `(${planet.alien.species} Resonance) You may harvest what grows or crystallizes beyond our sanctuaries on ${planet.name}. Treat the world gently, and its veins of ${planet.resources[0]} will sustain ODYSSEY-7.`,
      attitudeShift: 4,
      loreFragment: `${planet.alien.name} granted safe harvesting access in ${planet.landingZoneName}.`,
    };
  }
  return {
    reply: `(${planet.alien.species} Resonance) Greetings, Captain of ODYSSEY-7. Few travelers cross the drift to ${planet.name}. Speak plainly of your voyage—whether you seek knowledge of the deep sector, resources for your hull, or the truth behind the Vexis transmission.`,
    attitudeShift: 3,
    loreFragment: `First diplomatic exchange logged with ${planet.alien.name} (${planet.alien.species}).`,
  };
}

export function buildFallbackSpaceEvent(planetId: string): SpaceEvent {
  const planet = PLANETS.find((p) => p.id === planetId) ?? PLANETS[0];
  const pool: Array<Omit<SpaceEvent, 'id' | 'source'>> = [
    {
      title: 'Drifting Derelict Relay',
      category: 'Distress Signal',
      description: `Near ${planet.name}, ODYSSEY-7 intercepts an automated distress loop from a 2360-era survey buoy tumbling through micro-debris.`,
      choices: [
        {
          id: 'salvage',
          label: 'Dock & Salvage Core',
          description: 'Send magnetic grapples to extract intact deuterium cells and memory cores.',
          outcomeText: 'Grapples secured two intact fuel canisters and an encrypted star-fragment, though debris scuffed the deflector grid.',
          hullDelta: 0,
          shieldDelta: -18,
          fuelDelta: 18,
          energyDelta: -8,
          oxygenDelta: 0,
          pointsDelta: 90,
          resourceGain: { titanium: 4, deuterium: 5 } as Partial<Record<ResourceId, number>>,
          storyFlag: 'Salvaged 2360 survey relay',
        },
        {
          id: 'scan_remote',
          label: 'Remote Quantum Scan',
          description: 'Decode the relay telemetry from safe range without risking hull contact.',
          outcomeText: 'Your quantum array extracted pristine navigation logs pointing deeper into the sector.',
          hullDelta: 0,
          shieldDelta: 0,
          fuelDelta: -4,
          energyDelta: -12,
          oxygenDelta: 0,
          pointsDelta: 75,
          resourceGain: { ancientRelics: 1 },
          storyFlag: 'Decoded derelict relay remotely',
        },
      ],
    },
    {
      title: 'Sub-Space Plasma Surge',
      category: 'Ship Malfunction',
      description: 'A sudden gravimetric ripple destabilizes ODYSSEY-7’s starboard plasma manifold, threatening reactor containment.',
      choices: [
        {
          id: 'vent_plasma',
          label: 'Emergency Venting',
          description: 'Purge excess charge into space, sacrificing shield reserves to protect the hull.',
          outcomeText: 'Containment stabilized cleanly! Shields dipped briefly while the manifold cooled.',
          hullDelta: 0,
          shieldDelta: -25,
          fuelDelta: -6,
          energyDelta: 15,
          oxygenDelta: 0,
          pointsDelta: 65,
          storyFlag: 'Stabilized plasma surge safely',
        },
        {
          id: 'reroute_weapons',
          label: 'Harvest Surge into Capacitors',
          description: 'Channel the overload into auxiliary plasma cores using engineering precision.',
          outcomeText: 'Risky maneuver succeeded—you condensed a usable Plasma Core, though minor hull scorching occurred.',
          hullDelta: -10,
          shieldDelta: -10,
          fuelDelta: 0,
          energyDelta: 22,
          oxygenDelta: 0,
          pointsDelta: 110,
          resourceGain: { plasmaCores: 2 },
          storyFlag: 'Harvested plasma surge into cores',
        },
      ],
    },
    {
      title: 'Uncharted Ion Filament',
      category: 'Unknown Transmission',
      description: `A shimmering ribbon of ionized dust crosses your bow near ${planet.name}, echoing harmonic pulses identical to the 2389 Vexis signal.`,
      choices: [
        {
          id: 'ride_wake',
          label: 'Surf the Ion Wake',
          description: 'Align nacelles with the filament to recharge reactor energy and log resonance data.',
          outcomeText: 'Energy surged across your solar collectors as the harmonic signature imprinted onto the ship AI.',
          hullDelta: -4,
          shieldDelta: 10,
          fuelDelta: 8,
          energyDelta: 30,
          oxygenDelta: 5,
          pointsDelta: 100,
          storyFlag: 'Recorded harmonic ion filament',
        },
        {
          id: 'bypass',
          label: 'Plot Evasive Course',
          description: 'Bypass the filament conservatively to preserve hull integrity.',
          outcomeText: 'ODYSSEY-7 cleared the anomaly without a scratch, conserving fuel reserves.',
          hullDelta: 0,
          shieldDelta: 5,
          fuelDelta: -3,
          energyDelta: 0,
          oxygenDelta: 0,
          pointsDelta: 40,
        },
      ],
    },
  ];

  const picked = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...picked,
    id: `evt_${Date.now()}`,
    source: 'fallback',
  };
}
