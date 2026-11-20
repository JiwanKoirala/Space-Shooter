import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, aiConfigured: Boolean(getAiClient()) });
  });

  // A. AI Mission Generator
  app.post('/api/ai/mission', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
      });
    }

    try {
      const { currentPlanet, resources, discoveredPlanets, decisions, explorationPoints } = req.body ?? {};
      const prompt = `Generate a unique sci-fi exploration mission for Captain of ODYSSEY-7 in the year 2389.
Current Planet: ${currentPlanet?.name ?? 'NOVA-7'} (${currentPlanet?.subtitle ?? 'Pelagic Sanctuary'})
Planet Biome: ${currentPlanet?.biome ?? 'ocean'}
Discovered Planets (${discoveredPlanets?.length ?? 1}/6): ${(discoveredPlanets ?? []).join(', ')}
Player Exploration Points: ${explorationPoints ?? 0}
Current Resources: ${JSON.stringify(resources ?? {})}
Recent Decisions: ${(decisions ?? []).slice(-4).join('; ') || 'None yet'}

Available planet IDs: nova-7, pyrax, elysium, cryon, aurelia, vexis.
Available objectiveTypes: scan, collect, travel, investigate, combat, diplomacy.
Available resource keys for rewards: titanium, deuterium, cryoWater, ignisOre, xenobotanicals, plasmaCores, ancientRelics.
Keep briefing concise (1-2 sentences), targetCount between 1 and 4, and rewardPoints between 120 and 320.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are Starfleet Exploration Command in 2389 guiding ODYSSEY-7. Respond strictly with valid JSON matching the schema.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              briefing: { type: Type.STRING },
              objectiveType: { type: Type.STRING },
              targetPlanetId: { type: Type.STRING },
              targetCount: { type: Type.INTEGER },
              rewardPoints: { type: Type.INTEGER },
              rewardResourceKey: { type: Type.STRING },
              rewardResourceAmount: { type: Type.INTEGER },
              narrativeHook: { type: Type.STRING },
            },
            required: [
              'title',
              'briefing',
              'objectiveType',
              'targetPlanetId',
              'targetCount',
              'rewardPoints',
              'rewardResourceKey',
              'rewardResourceAmount',
              'narrativeHook',
            ],
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);

      const validPlanets = ['nova-7', 'pyrax', 'elysium', 'cryon', 'aurelia', 'vexis'];
      const validTypes = ['scan', 'collect', 'travel', 'investigate', 'combat', 'diplomacy'];
      const validResources = [
        'titanium',
        'deuterium',
        'cryoWater',
        'ignisOre',
        'xenobotanicals',
        'plasmaCores',
        'ancientRelics',
      ];

      const safePlanet = validPlanets.includes(parsed.targetPlanetId)
        ? parsed.targetPlanetId
        : currentPlanet?.id ?? 'nova-7';
      const safeType = validTypes.includes(parsed.objectiveType) ? parsed.objectiveType : 'scan';
      const safeResource = validResources.includes(parsed.rewardResourceKey)
        ? parsed.rewardResourceKey
        : 'deuterium';

      return res.json({
        mission: {
          id: `ai_m_${Date.now()}`,
          title: String(parsed.title || 'Sector Recon Directive').slice(0, 64),
          briefing: String(parsed.briefing || 'Survey planetary anomalies and log findings.').slice(0, 260),
          objectiveType: safeType,
          targetPlanetId: safePlanet,
          targetCount: Math.min(4, Math.max(1, Number(parsed.targetCount) || 2)),
          progress: 0,
          rewardPoints: Math.min(350, Math.max(100, Number(parsed.rewardPoints) || 180)),
          rewardResources: {
            [safeResource]: Math.min(12, Math.max(1, Number(parsed.rewardResourceAmount) || 4)),
          },
          narrativeHook: String(parsed.narrativeHook || 'Signals fluctuate across the sector.').slice(0, 180),
          source: 'ai',
          completed: false,
        },
      });
    } catch (error) {
      console.error('AI Mission Error:', error);
      return res.status(502).json({ error: 'Unable to generate AI mission at this time.' });
    }
  });

  // B. AI Alien Communication
  app.post('/api/ai/alien', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
      });
    }

    try {
      const { alien, planetName, attitude, history, playerMessage, explorationPoints, artifactsFound } =
        req.body ?? {};

      const recentHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .map((m: { sender: string; text: string }) => `${m.sender.toUpperCase()}: ${m.text}`)
            .join('\n')
        : '';

      const prompt = `You are roleplaying as ${alien?.name ?? 'Alien Envoy'}, ${alien?.title ?? 'Emissary'} of the ${alien?.species ?? 'Unknown'} civilization on planet ${planetName ?? 'NOVA-7'}.
Personality: ${alien?.personality ?? 'Enigmatic and observant'}
Language style: ${alien?.languageStyle ?? 'Measured and poetic'}
Civilization history: ${alien?.history ?? 'Ancient spacefaring lineage'}
Current attitude toward human Captain of ODYSSEY-7: ${attitude ?? 0} (scale -100 hostile to +100 allied)
Captain's progress: ${explorationPoints ?? 0} Exploration Points, ${artifactsFound ?? 0} Ancient Relics recovered.

Recent conversation:
${recentHistory || 'None yet'}

Captain says: "${String(playerMessage ?? '').slice(0, 400)}"

Respond in character (2-4 sentences). Also return an attitudeShift (-10 to +12) and a brief 1-sentence loreFragment discovered from this exchange (or empty string if none).`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'Stay strictly in character as the specified alien species. Return valid JSON matching the schema.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              attitudeShift: { type: Type.INTEGER },
              loreFragment: { type: Type.STRING },
            },
            required: ['reply', 'attitudeShift', 'loreFragment'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        reply: String(parsed.reply || 'The transmission ripples in untranslated harmonics.').slice(0, 700),
        attitudeShift: Math.min(15, Math.max(-15, Number(parsed.attitudeShift) || 0)),
        loreFragment: String(parsed.loreFragment || '').slice(0, 200),
      });
    } catch (error) {
      console.error('AI Alien Comms Error:', error);
      return res.status(502).json({ error: 'Subspace translator encountered interference.' });
    }
  });

  // C. AI Space Events
  app.post('/api/ai/event', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
      });
    }

    try {
      const { currentPlanet, ship, decisions } = req.body ?? {};
      const prompt = `Generate a sudden deep-space encounter event for ODYSSEY-7 near ${currentPlanet?.name ?? 'deep space'}.
Ship status: Hull ${ship?.hull ?? 100}/${ship?.maxHull ?? 100}, Shield ${ship?.shield ?? 100}, Fuel ${ship?.fuel ?? 100}.
Past decisions: ${(decisions ?? []).slice(-4).join('; ') || 'None'}

Choose one category: "Distress Signal", "Ship Malfunction", "Alien Encounter", "Asteroid Storm", "Ancient Station", or "Unknown Transmission".
Create 2 distinct tactical choices with numeric deltas (hullDelta, shieldDelta, fuelDelta, energyDelta, oxygenDelta between -30 and +30, pointsDelta between 30 and 150) and optional resourceGainKey (one of: titanium, deuterium, cryoWater, ignisOre, xenobotanicals, plasmaCores, ancientRelics, or "none").`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are the dynamic encounter director for a 2389 sci-fi space exploration game. Return strict JSON.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              choices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                    outcomeText: { type: Type.STRING },
                    hullDelta: { type: Type.INTEGER },
                    shieldDelta: { type: Type.INTEGER },
                    fuelDelta: { type: Type.INTEGER },
                    energyDelta: { type: Type.INTEGER },
                    oxygenDelta: { type: Type.INTEGER },
                    pointsDelta: { type: Type.INTEGER },
                    resourceGainKey: { type: Type.STRING },
                    resourceGainAmount: { type: Type.INTEGER },
                    storyFlag: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'label',
                    'description',
                    'outcomeText',
                    'hullDelta',
                    'shieldDelta',
                    'fuelDelta',
                    'energyDelta',
                    'oxygenDelta',
                    'pointsDelta',
                    'resourceGainKey',
                    'resourceGainAmount',
                    'storyFlag',
                  ],
                },
              },
            },
            required: ['title', 'category', 'description', 'choices'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const validCategories = [
        'Distress Signal',
        'Ship Malfunction',
        'Alien Encounter',
        'Asteroid Storm',
        'Ancient Station',
        'Unknown Transmission',
      ];
      const validResources = [
        'titanium',
        'deuterium',
        'cryoWater',
        'ignisOre',
        'xenobotanicals',
        'plasmaCores',
        'ancientRelics',
      ];
      const clampDelta = (v: unknown) => Math.min(35, Math.max(-35, Number(v) || 0));

      const rawChoices = Array.isArray(parsed.choices) ? parsed.choices.slice(0, 3) : [];
      if (rawChoices.length < 2) {
        throw new Error('Insufficient choices in AI event response');
      }

      const choices = rawChoices.map((c: Record<string, unknown>, idx: number) => {
        const resKey = String(c.resourceGainKey ?? 'none');
        const resAmt = Math.min(8, Math.max(0, Number(c.resourceGainAmount) || 0));
        return {
          id: String(c.id || `choice_${idx}`),
          label: String(c.label || 'Respond').slice(0, 40),
          description: String(c.description || 'Execute maneuver.').slice(0, 140),
          outcomeText: String(c.outcomeText || 'Maneuver logged.').slice(0, 220),
          hullDelta: clampDelta(c.hullDelta),
          shieldDelta: clampDelta(c.shieldDelta),
          fuelDelta: clampDelta(c.fuelDelta),
          energyDelta: clampDelta(c.energyDelta),
          oxygenDelta: clampDelta(c.oxygenDelta),
          pointsDelta: Math.min(180, Math.max(20, Number(c.pointsDelta) || 60)),
          resourceGain: validResources.includes(resKey) && resAmt > 0 ? { [resKey]: resAmt } : undefined,
          storyFlag: String(c.storyFlag || '').slice(0, 100),
        };
      });

      return res.json({
        event: {
          id: `ai_evt_${Date.now()}`,
          title: String(parsed.title || 'Deep Space Anomaly').slice(0, 60),
          category: validCategories.includes(parsed.category) ? parsed.category : 'Unknown Transmission',
          description: String(parsed.description || 'Uncharted telemetry crosses the bridge sensors.').slice(0, 280),
          choices,
          source: 'ai',
        },
      });
    } catch (error) {
      console.error('AI Event Error:', error);
      return res.status(502).json({ error: 'Unable to synthesize dynamic space event.' });
    }
  });

  // D. AI Story Generation
  app.post('/api/ai/story', async (req, res) => {
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
      });
    }

    try {
      const { captainName, currentPlanet, discoveredPlanets, decisions, artifactsFound, recentEvents } =
        req.body ?? {};

      const prompt = `Write the next Captain's Log story development for Captain ${captainName ?? 'Vance'} aboard ODYSSEY-7 in the year 2389.
Current location: ${currentPlanet?.name ?? 'NOVA-7'}
Discovered worlds: ${(discoveredPlanets ?? []).join(', ')}
Ancient Relics found: ${artifactsFound ?? 0}
Recent player decisions: ${(decisions ?? []).slice(-5).join('; ') || 'Embarked on maiden voyage'}
Recent events: ${(recentEvents ?? []).slice(-3).join('; ') || 'Entered uncharted sector'}

Keep the chapter dramatic, consistent with the player's choices, and advance the mystery of the ancient Vexis signal (2-4 sentences).`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are the narrative chronicle engine for SPACE: BEYOND THE UNKNOWN. Return strict JSON.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              body: { type: Type.STRING },
            },
            required: ['title', 'body'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        entry: {
          id: `story_${Date.now()}`,
          stardate: `2389.${Math.floor(100 + Math.random() * 899)}`,
          title: String(parsed.title || 'Chronicle Update').slice(0, 64),
          body: String(parsed.body || 'The ODYSSEY-7 sensors continue mapping the unknown horizon.').slice(0, 500),
          planetId: currentPlanet?.id,
          source: 'ai',
        },
      });
    } catch (error) {
      console.error('AI Story Error:', error);
      return res.status(502).json({ error: 'Unable to compose story entry.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ODYSSEY-7 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
