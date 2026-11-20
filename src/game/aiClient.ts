import { buildFallbackAlienReply, buildFallbackMission, buildFallbackSpaceEvent } from './fallbacks';
import { PLANETS } from './planets';
import { AlienMessage, GameSaveState, Mission, SpaceEvent, StoryEntry } from './types';

export interface AiResult<T> {
  data: T;
  usedFallback: boolean;
  errorNotice?: string;
}

export async function generateAiMission(state: GameSaveState): Promise<AiResult<Mission>> {
  const currentPlanet = PLANETS.find((p) => p.id === state.currentPlanetId) ?? PLANETS[0];
  try {
    const res = await fetch('/api/ai/mission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPlanet: {
          id: currentPlanet.id,
          name: currentPlanet.name,
          subtitle: currentPlanet.subtitle,
          biome: currentPlanet.biome,
        },
        resources: state.resources,
        discoveredPlanets: state.discoveredPlanets,
        decisions: state.decisions,
        explorationPoints: state.explorationPoints,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Mission endpoint error (${res.status})`);
    }
    const json = await res.json();
    if (!json.mission) throw new Error('Invalid mission payload');
    return { data: json.mission as Mission, usedFallback: false };
  } catch (err) {
    return {
      data: buildFallbackMission(state.currentPlanetId, state.discoveredPlanets.length),
      usedFallback: true,
      errorNotice: err instanceof Error ? err.message : 'AI service unavailable, using Command directive.',
    };
  }
}

export async function sendAlienMessage(
  state: GameSaveState,
  planetId: string,
  playerMessage: string,
): Promise<AiResult<{ reply: string; attitudeShift: number; loreFragment: string }>> {
  const planet = PLANETS.find((p) => p.id === planetId) ?? PLANETS[0];
  const history: AlienMessage[] = state.alienChats[planetId] ?? [];
  const attitude = state.alienAttitudes[planetId] ?? planet.alien.initialAttitude;

  try {
    const res = await fetch('/api/ai/alien', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alien: planet.alien,
        planetName: planet.name,
        attitude,
        history,
        playerMessage,
        explorationPoints: state.explorationPoints,
        artifactsFound: state.artifactsFound,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Comms error (${res.status})`);
    }
    const json = await res.json();
    return {
      data: {
        reply: String(json.reply ?? ''),
        attitudeShift: Number(json.attitudeShift ?? 0),
        loreFragment: String(json.loreFragment ?? ''),
      },
      usedFallback: false,
    };
  } catch (err) {
    return {
      data: buildFallbackAlienReply(planetId, playerMessage),
      usedFallback: true,
      errorNotice: err instanceof Error ? err.message : 'Subspace translator offline; using archived dialect matrix.',
    };
  }
}

export async function generateAiSpaceEvent(state: GameSaveState): Promise<AiResult<SpaceEvent>> {
  const currentPlanet = PLANETS.find((p) => p.id === state.currentPlanetId) ?? PLANETS[0];
  try {
    const res = await fetch('/api/ai/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPlanet: { id: currentPlanet.id, name: currentPlanet.name },
        ship: state.ship,
        decisions: state.decisions,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Event error (${res.status})`);
    }
    const json = await res.json();
    if (!json.event) throw new Error('Invalid event payload');
    return { data: json.event as SpaceEvent, usedFallback: false };
  } catch (err) {
    return {
      data: buildFallbackSpaceEvent(state.currentPlanetId),
      usedFallback: true,
      errorNotice: err instanceof Error ? err.message : 'Event synthesizer offline; using local encounter.',
    };
  }
}

export async function generateAiStoryEntry(state: GameSaveState): Promise<AiResult<StoryEntry>> {
  const currentPlanet = PLANETS.find((p) => p.id === state.currentPlanetId) ?? PLANETS[0];
  try {
    const res = await fetch('/api/ai/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        captainName: state.captainName,
        currentPlanet: { id: currentPlanet.id, name: currentPlanet.name },
        discoveredPlanets: state.discoveredPlanets,
        decisions: state.decisions,
        artifactsFound: state.artifactsFound,
        recentEvents: state.storyLog.slice(-3).map((s) => s.title),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Story error (${res.status})`);
    }
    const json = await res.json();
    if (!json.entry) throw new Error('Invalid story payload');
    return { data: json.entry as StoryEntry, usedFallback: false };
  } catch (err) {
    return {
      data: {
        id: `story_${Date.now()}`,
        stardate: `2389.${Math.floor(120 + Math.random() * 800)}`,
        title: `Orbiting ${currentPlanet.name}`,
        body: `ODYSSEY-7 stabilized telemetry near ${currentPlanet.name}. Crew logged ${state.artifactsFound} Precursor relics and charted ${state.discoveredPlanets.length} of 6 worlds in Sector Vexis.`,
        planetId: currentPlanet.id,
        source: 'log',
      },
      usedFallback: true,
      errorNotice: err instanceof Error ? err.message : 'Chronicle AI unavailable; logged local ship entry.',
    };
  }
}
