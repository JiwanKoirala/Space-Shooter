import { useCallback, useEffect, useRef, useState } from 'react';
import { CinematicIntro } from './components/CinematicIntro';
import { CommsAndLogModal } from './components/CommsAndLogModal';
import { GalaxyMapModal } from './components/GalaxyMapModal';
import { GameHud } from './components/GameHud';
import { MainMenu } from './components/MainMenu';
import { PauseModal } from './components/PauseModal';
import { ShipManagementModal } from './components/ShipManagementModal';
import { SpaceEventModal } from './components/SpaceEventModal';
import {
  generateAiMission,
  generateAiSpaceEvent,
  generateAiStoryEntry,
  sendAlienMessage,
} from './game/aiClient';
import { spaceAudio } from './game/audio';
import { ACHIEVEMENTS_LIST, PLANETS, UPGRADE_SPECS, getUpgradeCost } from './game/planets';
import {
  computeMaxStats,
  createInitialSaveState,
  loadAudioSettings,
  loadSavedGame,
  saveAudioSettings,
  saveGame,
} from './game/storage';
import { SpaceEngine } from './game/three/SpaceEngine';
import {
  AudioSettings,
  CameraMode,
  GameSaveState,
  GameScreen,
  ResourceId,
  SpaceEvent,
  SpaceEventChoice,
  TelemetrySnapshot,
  UpgradeKey,
} from './game/types';

type ActiveOverlay = 'none' | 'map' | 'ship' | 'comms' | 'pause';

const INITIAL_TELEMETRY: TelemetrySnapshot = {
  speed: 0,
  boosting: false,
  coordinates: [0, 10, -140],
  nearestPlanetId: 'nova-7',
  nearestPlanetDist: 140,
  nearestInteractable: null,
  lockedTarget: null,
  navMarkers: [],
  scanActive: false,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SpaceEngine | null>(null);

  const [screen, setScreen] = useState<GameScreen>('menu');
  const [overlay, setOverlay] = useState<ActiveOverlay>('none');
  const [activeEvent, setActiveEvent] = useState<SpaceEvent | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('third-person');
  const [toast, setToast] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const [existingSave, setExistingSave] = useState<GameSaveState | null>(() => loadSavedGame());
  const [save, setSave] = useState<GameSaveState>(() => loadSavedGame() ?? createInitialSaveState());
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => loadAudioSettings());
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(INITIAL_TELEMETRY);

  const saveRef = useRef(save);
  saveRef.current = save;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const activeEventRef = useRef(activeEvent);
  activeEventRef.current = activeEvent;

  const toastTimerRef = useRef<number>(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const unlockAchievement = useCallback(
    (state: GameSaveState, achId: string): GameSaveState => {
      if (state.achievements.includes(achId)) return state;
      const spec = ACHIEVEMENTS_LIST.find((a) => a.id === achId);
      if (!spec) return state;
      showToast(`Achievement Unlocked: ${spec.title} (+${spec.points} PTS)`);
      return {
        ...state,
        achievements: [...state.achievements, achId],
        explorationPoints: state.explorationPoints + spec.points,
      };
    },
    [showToast],
  );

  const advanceMissionProgress = useCallback(
    (
      state: GameSaveState,
      type: GameSaveState['activeMission']['objectiveType'],
      planetId?: string,
      amount = 1,
    ): GameSaveState => {
      const m = state.activeMission;
      if (m.completed) return state;
      const matchesType = m.objectiveType === type || (type === 'collect' && m.objectiveType === 'scan' && false);
      const matchesPlanet = !planetId || m.targetPlanetId === planetId || type === 'combat';
      if (!matchesType || !matchesPlanet) return state;

      const nextProg = Math.min(m.targetCount, m.progress + amount);
      if (nextProg >= m.targetCount) {
        const updatedRes = { ...state.resources };
        for (const [rk, rv] of Object.entries(m.rewardResources)) {
          updatedRes[rk as ResourceId] = (updatedRes[rk as ResourceId] ?? 0) + (rv ?? 0);
        }
        const completedMission = { ...m, progress: m.targetCount, completed: true };
        showToast(`Mission Complete: ${m.title} (+${m.rewardPoints} PTS)`);
        return {
          ...state,
          explorationPoints: state.explorationPoints + m.rewardPoints,
          resources: updatedRes,
          completedMissions: [...state.completedMissions, completedMission],
          activeMission: completedMission,
        };
      }
      return {
        ...state,
        activeMission: { ...m, progress: nextProg },
      };
    },
    [showToast],
  );

  // Persist save automatically whenever save updates during active game
  useEffect(() => {
    if (screen === 'playing') {
      saveGame(save);
      setExistingSave(save);
    }
  }, [save, screen]);

  // Sync audio settings
  useEffect(() => {
    spaceAudio.updateSettings(audioSettings);
    saveAudioSettings(audioSettings);
  }, [audioSettings]);

  // Sync ship upgrades/fuel/energy into 3D engine & pause state
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.syncShipState(save.upgrades, save.ship.fuel, save.ship.energy);
  }, [save.upgrades, save.ship.fuel, save.ship.energy]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const isPaused = screen !== 'playing' || overlay !== 'none' || activeEvent !== null;
    engine.setPaused(isPaused);
  }, [screen, overlay, activeEvent]);

  // Passive shield & energy regeneration + hazardous surface oxygen drain
  useEffect(() => {
    if (screen !== 'playing' || overlay !== 'none' || activeEvent !== null) return;
    const interval = window.setInterval(() => {
      setSave((prev) => {
        const stats = computeMaxStats(prev.upgrades);
        const nextShield = Math.min(stats.maxShield, prev.ship.shield + stats.shieldRegen * 0.5);
        const nextEnergy = Math.min(stats.maxEnergy, prev.ship.energy + stats.energyRegen * 0.5);
        const isHazardousSurface = prev.playMode === 'surface' && prev.currentPlanetId !== 'nova-7';
        const nextOxygen = isHazardousSurface
          ? Math.max(5, prev.ship.oxygen - 0.35)
          : Math.min(stats.maxOxygen, prev.ship.oxygen + 1.2);
        return {
          ...prev,
          ship: {
            ...prev.ship,
            shield: nextShield,
            energy: nextEnergy,
            oxygen: nextOxygen,
          },
        };
      });
    }, 500);
    return () => window.clearInterval(interval);
  }, [screen, overlay, activeEvent]);

  // Initialize Three.js Engine once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const engine = new SpaceEngine(container, {
      onTelemetry: (snap) => setTelemetry(snap),
      onLandRequest: (planetId) => {
        const planet = PLANETS.find((p) => p.id === planetId) ?? PLANETS[0];
        engine.setMode('surface', planetId);
        spaceAudio.playWarpJump();
        showToast(`Landed at ${planet.landingZoneName} on ${planet.name}`);
        setSave((prev) => {
          const nextLanded = prev.landedPlanets.includes(planetId)
            ? prev.landedPlanets
            : [...prev.landedPlanets, planetId];
          const nextDiscovered = prev.discoveredPlanets.includes(planetId)
            ? prev.discoveredPlanets
            : [...prev.discoveredPlanets, planetId];
          let next: GameSaveState = {
            ...prev,
            playMode: 'surface',
            currentPlanetId: planetId,
            landedPlanets: nextLanded,
            discoveredPlanets: nextDiscovered,
          };
          next = unlockAchievement(next, 'first_landing');
          if (planetId === 'vexis') {
            next = unlockAchievement(next, 'vexis_signal');
          }
          if (nextDiscovered.length >= PLANETS.length) {
            next = unlockAchievement(next, 'galaxy_cartographer');
          }
          next = advanceMissionProgress(next, 'travel', planetId, 1);
          return next;
        });
      },
      onLaunchRequest: () => {
        const curId = saveRef.current.currentPlanetId;
        engine.setMode('space');
        engine.warpToPlanet(curId);
        showToast('ODYSSEY-7 launched into planetary orbit');
        setSave((prev) => ({
          ...prev,
          playMode: 'space',
          ship: { ...prev.ship, oxygen: prev.ship.maxOxygen },
        }));
      },
      onCollectResource: (resId, amount, isArtifact) => {
        showToast(
          isArtifact
            ? `Recovered Ancient Precursor Relic! (+120 PTS)`
            : `Harvested +${amount} ${resId.replace(/([A-Z])/g, ' $1').trim()}`,
        );
        setSave((prev) => {
          const nextArtifacts = prev.artifactsFound + (isArtifact ? 1 : 0);
          let next: GameSaveState = {
            ...prev,
            explorationPoints: prev.explorationPoints + (isArtifact ? 120 : 25),
            artifactsFound: nextArtifacts,
            resources: {
              ...prev.resources,
              [resId]: (prev.resources[resId] ?? 0) + amount,
            },
          };
          if (nextArtifacts >= 3) {
            next = unlockAchievement(next, 'artifact_hunter');
          }
          next = advanceMissionProgress(
            next,
            isArtifact ? 'investigate' : 'collect',
            prev.currentPlanetId,
            1,
          );
          return next;
        });
      },
      onDecodeSignal: (planetId) => {
        const p = PLANETS.find((pl) => pl.id === planetId) ?? PLANETS[0];
        showToast(`Decoded ${p.alien.species} Beacon (+110 PTS)`);
        setSave((prev) => {
          let next: GameSaveState = {
            ...prev,
            explorationPoints: prev.explorationPoints + 110,
            decisions: [...prev.decisions, `Decoded signal monolith on ${p.name}`],
          };
          next = advanceMissionProgress(next, 'investigate', planetId, 1);
          return next;
        });
      },
      onTriggerAnomaly: async (anomalyId) => {
        showToast('Anomaly detected — analyzing subspace distortion...');
        const res = await generateAiSpaceEvent(saveRef.current);
        setActiveEvent(res.data);
        setSave((prev) => ({
          ...prev,
          decisions: [...prev.decisions, `Investigated anomaly ${anomalyId}`],
        }));
      },
      onEnemyDestroyed: (name) => {
        showToast(`Neutralized ${name} (+80 PTS, +2 Plasma Cores)`);
        setSave((prev) => {
          const nextKills = prev.kills + 1;
          let next: GameSaveState = {
            ...prev,
            kills: nextKills,
            explorationPoints: prev.explorationPoints + 80,
          };
          if (nextKills >= 3) {
            next = unlockAchievement(next, 'void_defender');
          }
          next = advanceMissionProgress(next, 'combat', undefined, 1);
          return next;
        });
      },
      onPlayerDamaged: (amount) => {
        setSave((prev) => {
          let shield = prev.ship.shield - amount;
          let hull = prev.ship.hull;
          if (shield < 0) {
            hull += shield;
            shield = 0;
          }
          if (hull <= 0) {
            // Emergency hull stabilization return to NOVA-7 orbit
            engine.warpToPlanet('nova-7');
            showToast('Emergency Hull Protocol: Warped to NOVA-7 Sanctuary for auto-stabilization.');
            return {
              ...prev,
              currentPlanetId: 'nova-7',
              playMode: 'space',
              ship: {
                ...prev.ship,
                hull: Math.round(prev.ship.maxHull * 0.45),
                shield: Math.round(prev.ship.maxShield * 0.5),
                fuel: Math.max(25, prev.ship.fuel),
              },
            };
          }
          return {
            ...prev,
            ship: { ...prev.ship, shield, hull },
          };
        });
      },
      onConsumeFuelEnergy: (fuelUsed, energyUsed) => {
        setSave((prev) => ({
          ...prev,
          ship: {
            ...prev.ship,
            fuel: Math.max(0, prev.ship.fuel - fuelUsed),
            energy: Math.max(0, prev.ship.energy - energyUsed),
          },
        }));
      },
      onScanCompleted: (nodesRevealed) => {
        showToast(
          nodesRevealed > 0
            ? `Quantum Pulse Scan revealed ${nodesRevealed} hidden nodes!`
            : 'Quantum Pulse Scan complete.',
        );
        setSave((prev) => {
          let next: GameSaveState = {
            ...prev,
            scansCompleted: prev.scansCompleted + 1,
            explorationPoints: prev.explorationPoints + 15,
          };
          next = advanceMissionProgress(next, 'scan', prev.currentPlanetId, 1);
          return next;
        });
      },
      onPlanetDiscovered: (planetId) => {
        setSave((prev) => {
          if (prev.discoveredPlanets.includes(planetId)) return prev;
          const p = PLANETS.find((pl) => pl.id === planetId);
          if (p) showToast(`New World Charted: ${p.name} (+90 PTS)`);
          const nextDisc = [...prev.discoveredPlanets, planetId];
          let next: GameSaveState = {
            ...prev,
            currentPlanetId: planetId,
            discoveredPlanets: nextDisc,
            explorationPoints: prev.explorationPoints + 90,
          };
          if (planetId === 'vexis') {
            next = unlockAchievement(next, 'vexis_signal');
          }
          if (nextDisc.length >= PLANETS.length) {
            next = unlockAchievement(next, 'galaxy_cartographer');
          }
          return next;
        });
      },
      onPlaySound: (kind) => {
        if (kind === 'laser') spaceAudio.playLaser();
        else if (kind === 'explosion') spaceAudio.playExplosion();
        else if (kind === 'pickup') spaceAudio.playPickup();
        else if (kind === 'scan') spaceAudio.playScannerPulse();
        else if (kind === 'warp') spaceAudio.playWarpJump();
      },
      onEngineAudio: (speedRatio, boosting, active) => {
        spaceAudio.setEngineThrust(speedRatio, boosting, active);
      },
    });

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [advanceMissionProgress, showToast, unlockAchievement]);

  // Global Game Hotkeys (C, E, F, M, U, G, ESC)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (screenRef.current !== 'playing') return;

      if (e.code === 'Escape') {
        e.preventDefault();
        if (activeEventRef.current) return;
        setOverlay((prev) => (prev === 'none' ? 'pause' : 'none'));
        return;
      }

      if (activeEventRef.current) return;

      if (e.code === 'KeyM') {
        setOverlay((prev) => (prev === 'map' ? 'none' : 'map'));
      } else if (e.code === 'KeyU') {
        setOverlay((prev) => (prev === 'ship' ? 'none' : 'ship'));
      } else if (e.code === 'KeyG') {
        setOverlay((prev) => (prev === 'comms' ? 'none' : 'comms'));
      } else if (overlayRef.current === 'none') {
        if (e.code === 'KeyC') {
          const nextCam = engineRef.current?.toggleCameraMode();
          if (nextCam) setCameraMode(nextCam);
        } else if (e.code === 'KeyF') {
          engineRef.current?.triggerScanner();
        } else if (e.code === 'KeyE') {
          engineRef.current?.triggerInteract();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Handlers
  const handleNewGame = (captainName: string) => {
    spaceAudio.init();
    const fresh = createInitialSaveState(captainName);
    setSave(fresh);
    saveGame(fresh);
    setExistingSave(fresh);
    setOverlay('none');
    setScreen('intro');
  };

  const handleContinueGame = () => {
    spaceAudio.init();
    const loaded = loadSavedGame() ?? save;
    setSave(loaded);
    setOverlay('none');
    setScreen('playing');
    engineRef.current?.setMode(loaded.playMode, loaded.currentPlanetId);
    if (loaded.playMode === 'space') {
      engineRef.current?.warpToPlanet(loaded.currentPlanetId);
    }
  };

  const handleIntroComplete = () => {
    setScreen('playing');
    engineRef.current?.setMode('space');
    engineRef.current?.warpToPlanet('nova-7');
    showToast('Welcome aboard ODYSSEY-7. Approach NOVA-7 and press [E] to land.');
  };

  const handleWarpToPlanet = (planetId: string, fuelCost: number) => {
    setSave((prev) => {
      const nextFuel = Math.max(0, prev.ship.fuel - fuelCost);
      return {
        ...prev,
        currentPlanetId: planetId,
        playMode: 'space',
        ship: { ...prev.ship, fuel: nextFuel },
      };
    });
    engineRef.current?.warpToPlanet(planetId);
    const planet = PLANETS.find((p) => p.id === planetId);
    if (planet) showToast(`Warped to ${planet.name} Orbit`);
  };

  const handleLandDirect = (planetId: string) => {
    engineRef.current?.setMode('surface', planetId);
    spaceAudio.playWarpJump();
    setSave((prev) => {
      const nextLanded = prev.landedPlanets.includes(planetId)
        ? prev.landedPlanets
        : [...prev.landedPlanets, planetId];
      let next: GameSaveState = {
        ...prev,
        playMode: 'surface',
        currentPlanetId: planetId,
        landedPlanets: nextLanded,
      };
      next = unlockAchievement(next, 'first_landing');
      next = advanceMissionProgress(next, 'travel', planetId, 1);
      return next;
    });
  };

  const handleUpgrade = (key: UpgradeKey) => {
    const spec = UPGRADE_SPECS.find((u) => u.key === key);
    if (!spec) return;
    setSave((prev) => {
      const curLvl = prev.upgrades[key];
      if (curLvl >= spec.maxLevel) return prev;
      const cost = getUpgradeCost(spec, curLvl);
      const canPay = Object.entries(cost).every(
        ([rk, rv]) => (prev.resources[rk as ResourceId] ?? 0) >= (rv ?? 0),
      );
      if (!canPay) return prev;

      const nextRes = { ...prev.resources };
      for (const [rk, rv] of Object.entries(cost)) {
        nextRes[rk as ResourceId] -= rv ?? 0;
      }

      const nextUpgrades = { ...prev.upgrades, [key]: curLvl + 1 };
      const stats = computeMaxStats(nextUpgrades);
      let next: GameSaveState = {
        ...prev,
        upgrades: nextUpgrades,
        resources: nextRes,
        explorationPoints: prev.explorationPoints + 45,
        ship: {
          ...prev.ship,
          maxHull: stats.maxHull,
          maxShield: stats.maxShield,
          maxFuel: stats.maxFuel,
          maxOxygen: stats.maxOxygen,
          maxEnergy: stats.maxEnergy,
          cargoCapacity: stats.cargoCapacity,
          shield: stats.maxShield,
        },
      };
      if (curLvl + 1 >= 3) {
        next = unlockAchievement(next, 'master_engineer');
      }
      showToast(`${spec.name} upgraded to Level ${curLvl + 1}!`);
      return next;
    });
  };

  const handleGenerateAiMission = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    const result = await generateAiMission(saveRef.current);
    setAiBusy(false);
    setSave((prev) => ({
      ...prev,
      activeMission: result.data,
    }));
    showToast(
      result.usedFallback
        ? `Command Mission Assigned: ${result.data.title}`
        : `AI Mission Generated: ${result.data.title}`,
    );
  };

  const handleSendAlienMessage = async (planetId: string, message: string) => {
    setAiBusy(true);
    const userMsg = {
      id: `msg_u_${Date.now()}`,
      sender: 'player' as const,
      text: message,
      timestamp: new Date().toISOString(),
    };

    setSave((prev) => ({
      ...prev,
      alienChats: {
        ...prev.alienChats,
        [planetId]: [...(prev.alienChats[planetId] ?? []), userMsg],
      },
    }));

    const result = await sendAlienMessage(saveRef.current, planetId, message);
    setAiBusy(false);

    const alienMsg = {
      id: `msg_a_${Date.now()}`,
      sender: 'alien' as const,
      text: result.data.reply,
      timestamp: new Date().toISOString(),
    };

    setSave((prev) => {
      const prevMsgs = prev.alienChats[planetId] ?? [];
      const newMsgs = [...prevMsgs, alienMsg];
      if (result.data.loreFragment) {
        newMsgs.push({
          id: `msg_s_${Date.now() + 1}`,
          sender: 'system' as const,
          text: `Lore Archived: ${result.data.loreFragment}`,
          timestamp: new Date().toISOString(),
        });
      }
      const nextAttitude = Math.max(
        -100,
        Math.min(100, (prev.alienAttitudes[planetId] ?? 0) + result.data.attitudeShift),
      );
      const nextContacted = prev.contactedAliens.includes(planetId)
        ? prev.contactedAliens
        : [...prev.contactedAliens, planetId];

      let next: GameSaveState = {
        ...prev,
        explorationPoints: prev.explorationPoints + 35,
        contactedAliens: nextContacted,
        alienAttitudes: { ...prev.alienAttitudes, [planetId]: nextAttitude },
        alienChats: { ...prev.alienChats, [planetId]: newMsgs },
        decisions: result.data.loreFragment
          ? [...prev.decisions, result.data.loreFragment]
          : prev.decisions,
      };
      next = unlockAchievement(next, 'first_contact');
      next = advanceMissionProgress(next, 'diplomacy', planetId, 1);
      return next;
    });
  };

  const handleGenerateStory = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    const result = await generateAiStoryEntry(saveRef.current);
    setAiBusy(false);
    setSave((prev) => ({
      ...prev,
      explorationPoints: prev.explorationPoints + 30,
      storyLog: [...prev.storyLog, result.data],
    }));
  };

  const handleTriggerSpaceEvent = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    showToast('Scanning deep-space frequencies...');
    const res = await generateAiSpaceEvent(saveRef.current);
    setAiBusy(false);
    setActiveEvent(res.data);
  };

  const handleResolveEvent = (choice: SpaceEventChoice) => {
    setSave((prev) => {
      const nextRes = { ...prev.resources };
      if (choice.resourceGain) {
        for (const [rk, rv] of Object.entries(choice.resourceGain)) {
          nextRes[rk as ResourceId] = (nextRes[rk as ResourceId] ?? 0) + (rv ?? 0);
        }
      }
      const clamp = (val: number, max: number) => Math.max(5, Math.min(max, val));
      return {
        ...prev,
        explorationPoints: prev.explorationPoints + choice.pointsDelta,
        resources: nextRes,
        decisions: choice.storyFlag ? [...prev.decisions, choice.storyFlag] : prev.decisions,
        ship: {
          ...prev.ship,
          hull: clamp(prev.ship.hull + choice.hullDelta, prev.ship.maxHull),
          shield: clamp(prev.ship.shield + choice.shieldDelta, prev.ship.maxShield),
          fuel: clamp(prev.ship.fuel + choice.fuelDelta, prev.ship.maxFuel),
          energy: clamp(prev.ship.energy + choice.energyDelta, prev.ship.maxEnergy),
          oxygen: clamp(prev.ship.oxygen + choice.oxygenDelta, prev.ship.maxOxygen),
        },
      };
    });
    setActiveEvent(null);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#040711]">
      {/* Dedicated WebGL Mount Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {screen === 'menu' && (
        <MainMenu
          existingSave={existingSave}
          audioSettings={audioSettings}
          onUpdateAudio={setAudioSettings}
          onNewGame={handleNewGame}
          onContinueGame={handleContinueGame}
        />
      )}

      {screen === 'intro' && (
        <CinematicIntro captainName={save.captainName} onComplete={handleIntroComplete} />
      )}

      {screen === 'playing' && (
        <GameHud
          save={save}
          telemetry={telemetry}
          playMode={save.playMode}
          cameraMode={cameraMode}
          toast={toast}
          onToggleCamera={() => {
            const next = engineRef.current?.toggleCameraMode();
            if (next) setCameraMode(next);
          }}
          onScan={() => engineRef.current?.triggerScanner()}
          onInteract={() => engineRef.current?.triggerInteract()}
          onOpenMap={() => setOverlay('map')}
          onOpenShip={() => setOverlay('ship')}
          onOpenComms={() => setOverlay('comms')}
          onTriggerEvent={handleTriggerSpaceEvent}
          onLaunchToOrbit={() => {
            engineRef.current?.setMode('space');
            engineRef.current?.warpToPlanet(save.currentPlanetId);
            setSave((prev) => ({
              ...prev,
              playMode: 'space',
              ship: { ...prev.ship, oxygen: prev.ship.maxOxygen },
            }));
          }}
          onPause={() => setOverlay('pause')}
        />
      )}

      {screen === 'playing' && overlay === 'map' && (
        <GalaxyMapModal
          save={save}
          loadingMission={aiBusy}
          onWarpToPlanet={handleWarpToPlanet}
          onLandOnPlanet={handleLandDirect}
          onGenerateMission={handleGenerateAiMission}
          onClose={() => setOverlay('none')}
        />
      )}

      {screen === 'playing' && overlay === 'ship' && (
        <ShipManagementModal
          save={save}
          onUpgrade={handleUpgrade}
          onRepairHull={() =>
            setSave((prev) => {
              if (prev.resources.titanium < 3 || prev.ship.hull >= prev.ship.maxHull) return prev;
              return {
                ...prev,
                resources: { ...prev.resources, titanium: prev.resources.titanium - 3 },
                ship: { ...prev.ship, hull: Math.min(prev.ship.maxHull, prev.ship.hull + 35) },
              };
            })
          }
          onRefuel={() =>
            setSave((prev) => {
              if (prev.resources.deuterium < 3 || prev.ship.fuel >= prev.ship.maxFuel) return prev;
              return {
                ...prev,
                resources: { ...prev.resources, deuterium: prev.resources.deuterium - 3 },
                ship: { ...prev.ship, fuel: Math.min(prev.ship.maxFuel, prev.ship.fuel + 40) },
              };
            })
          }
          onReplenishOxygen={() =>
            setSave((prev) => {
              if (prev.resources.cryoWater < 2 || prev.ship.oxygen >= prev.ship.maxOxygen) return prev;
              return {
                ...prev,
                resources: { ...prev.resources, cryoWater: prev.resources.cryoWater - 2 },
                ship: { ...prev.ship, oxygen: Math.min(prev.ship.maxOxygen, prev.ship.oxygen + 35) },
              };
            })
          }
          onClose={() => setOverlay('none')}
        />
      )}

      {screen === 'playing' && overlay === 'comms' && (
        <CommsAndLogModal
          save={save}
          aiBusy={aiBusy}
          onSendAlienMessage={handleSendAlienMessage}
          onGenerateAiMission={handleGenerateAiMission}
          onGenerateStory={handleGenerateStory}
          onClose={() => setOverlay('none')}
        />
      )}

      {screen === 'playing' && overlay === 'pause' && (
        <PauseModal
          audioSettings={audioSettings}
          onUpdateAudio={setAudioSettings}
          onResume={() => setOverlay('none')}
          onMainMenu={() => {
            saveGame(save);
            setExistingSave(save);
            setOverlay('none');
            setScreen('menu');
            engineRef.current?.setMode('menu');
          }}
        />
      )}

      {activeEvent && (
        <SpaceEventModal event={activeEvent} onResolve={handleResolveEvent} />
      )}
    </div>
  );
}
