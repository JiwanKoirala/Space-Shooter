import React, { useState } from 'react';
import {
  Compass,
  Cpu,
  MessageSquare,
  Radar,
  Camera,
  ChevronDown,
  ChevronUp,
  Rocket,
  Zap,
  Pause,
} from 'lucide-react';
import { PLANETS, getCaptainRank } from '../game/planets';
import { CameraMode, GameSaveState, PlayMode, TelemetrySnapshot } from '../game/types';

interface GameHudProps {
  save: GameSaveState;
  telemetry: TelemetrySnapshot;
  playMode: PlayMode;
  cameraMode: CameraMode;
  toast: string | null;
  onToggleCamera: () => void;
  onScan: () => void;
  onInteract: () => void;
  onOpenMap: () => void;
  onOpenShip: () => void;
  onOpenComms: () => void;
  onTriggerEvent: () => void;
  onLaunchToOrbit: () => void;
  onPause: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  save,
  telemetry,
  playMode,
  cameraMode,
  toast,
  onToggleCamera,
  onScan,
  onInteract,
  onOpenMap,
  onOpenShip,
  onOpenComms,
  onTriggerEvent,
  onLaunchToOrbit,
  onPause,
}) => {
  const [hudCollapsed, setHudCollapsed] = useState(false);

  const currentPlanet =
    PLANETS.find((p) => p.id === (telemetry.nearestPlanetId ?? save.currentPlanetId)) ?? PLANETS[0];
  const rank = getCaptainRank(save.explorationPoints);
  const { ship, activeMission, resources } = save;

  const hullPct = Math.round((ship.hull / ship.maxHull) * 100);
  const shieldPct = Math.round((ship.shield / ship.maxShield) * 100);
  const fuelPct = Math.round((ship.fuel / ship.maxFuel) * 100);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Subtle 1st-person Cockpit Frame */}
      {cameraMode === 'cockpit' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-5 border-b border-sky-400/20 bg-gradient-to-b from-slate-950/75 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-4 border-r border-sky-400/15 bg-gradient-to-r from-slate-950/65 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-4 border-l border-sky-400/15 bg-gradient-to-l from-slate-950/65 to-transparent" />
          <svg
            className="absolute inset-0 w-full h-full opacity-25"
            preserveAspectRatio="none"
            viewBox="0 0 1000 600"
          >
            <path d="M0,120 L160,18 L840,18 L1000,120" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
            <path d="M0,510 L210,585 L790,585 L1000,510" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
          </svg>
        </div>
      )}

      {/* 3D-Projected Screen Nav Indicators */}
      {telemetry.navMarkers.map((m) => (
        <div
          key={m.id}
          style={{
            left: `${m.x * 100}%`,
            top: `${m.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className="absolute flex flex-col items-center pointer-events-none"
        >
          <div
            className="w-3 h-3 rounded-sm rotate-45 border"
            style={{ borderColor: m.color, backgroundColor: `${m.color}22` }}
          />
          <span
            className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono-tabular whitespace-nowrap"
            style={{ color: m.color }}
          >
            {m.label} · {m.distance}m
          </span>
        </div>
      ))}

      {/* TOP LEFT: Captain, Current Planet, Mission Objective */}
      <div className="absolute top-4 left-4 max-w-xs w-72 space-y-2.5 pointer-events-auto">
        <div className="hud-panel rounded-lg px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display font-semibold text-sm text-white truncate">
              {save.captainName}
            </span>
            <span className="text-[11px] font-mono-tabular text-sky-300 shrink-0">
              LVL {rank.level} · {save.explorationPoints} PTS
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span className="text-slate-200 font-medium">{currentPlanet.name}</span>
            <span aria-hidden="true">·</span>
            <span>{playMode === 'surface' ? `Surface (${currentPlanet.landingZoneName})` : 'Orbital Sector'}</span>
          </div>
        </div>

        <div className="hud-panel rounded-lg px-3.5 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-sky-300 font-medium mb-1">
            <span>ACTIVE OBJECTIVE</span>
            <span className="font-mono-tabular">
              {activeMission.progress}/{activeMission.targetCount}
            </span>
          </div>
          <div className="text-xs font-semibold text-white mb-0.5">{activeMission.title}</div>
          <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
            {activeMission.briefing}
          </p>
        </div>
      </div>

      {/* TOP RIGHT: Resources, Ship Health, Fuel, Coordinates */}
      <div className="absolute top-4 right-4 max-w-xs w-72 space-y-2.5 pointer-events-auto">
        <div className="hud-panel rounded-lg px-3.5 py-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-300">
            <span>ODYSSEY-7 TELEMETRY</span>
            <span className={telemetry.boosting ? 'text-cyan-300 font-semibold' : 'text-sky-300'}>
              {telemetry.speed} m/s {telemetry.boosting ? 'BOOST' : ''}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div>
              <div className="flex justify-between text-slate-300 mb-0.5">
                <span>Hull Integrity</span>
                <span className="font-mono-tabular">{hullPct}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${hullPct < 30 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                  style={{ width: `${hullPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-300 mb-0.5">
                <span>Deflector Shield</span>
                <span className="font-mono-tabular">{shieldPct}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-400" style={{ width: `${shieldPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-300 mb-0.5">
                <span>Deuterium Fuel</span>
                <span className="font-mono-tabular">{fuelPct}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${fuelPct}%` }} />
              </div>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
            <span>
              XYZ {telemetry.coordinates[0]} · {telemetry.coordinates[1]} · {telemetry.coordinates[2]}
            </span>
          </div>
        </div>

        <div className="hud-panel-subtle rounded-lg px-3.5 py-2 flex items-center justify-between text-[11px] font-mono-tabular text-slate-300">
          <span>TI {resources.titanium}</span>
          <span>DE {resources.deuterium}</span>
          <span>PL {resources.plasmaCores}</span>
          <span className="text-amber-300">RL {resources.ancientRelics}</span>
        </div>
      </div>

      {/* CENTER: Minimal Targeting Reticle + Locked Target + Notifications + Interaction Prompt */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-300/85" />
          <div className="absolute inset-0 rounded-full border border-sky-400/35" />
          <div className="absolute -left-2 top-1/2 w-2 h-px bg-sky-400/50" />
          <div className="absolute -right-2 top-1/2 w-2 h-px bg-sky-400/50" />
        </div>
      </div>

      {telemetry.lockedTarget && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 hud-panel rounded-lg px-3.5 py-1.5 text-xs flex items-center gap-3">
          <span className="text-rose-300 font-semibold">{telemetry.lockedTarget.name}</span>
          <span className="font-mono-tabular text-slate-300">{telemetry.lockedTarget.distance}m</span>
          {telemetry.lockedTarget.hp !== undefined && telemetry.lockedTarget.maxHp !== undefined && (
            <span className="font-mono-tabular text-rose-400">
              HP {Math.max(0, telemetry.lockedTarget.hp)}/{telemetry.lockedTarget.maxHp}
            </span>
          )}
        </div>
      )}

      {toast && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 hud-panel rounded-lg px-4 py-2 text-xs font-medium text-sky-200 max-w-md text-center">
          {toast}
        </div>
      )}

      {telemetry.nearestInteractable && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={onInteract}
            className="hud-panel px-5 py-2.5 rounded-lg border-sky-400/70 text-sm font-medium text-white hover:bg-sky-500/20 flex items-center gap-2.5 cursor-pointer"
          >
            <span className="px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 font-mono-tabular text-xs font-bold">
              E
            </span>
            <span>{telemetry.nearestInteractable.label}</span>
          </button>
        </div>
      )}

      {/* BOTTOM: Collapsible Flight & Systems Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-auto max-w-[96vw]">
        <button
          onClick={() => setHudCollapsed((v) => !v)}
          className="hud-panel-subtle px-3 py-1 rounded-md text-[11px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
        >
          {hudCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{hudCollapsed ? 'Show Dock' : 'Hide Dock'}</span>
        </button>

        {!hudCollapsed && (
          <div className="hud-panel rounded-xl px-3 py-2 flex flex-col items-center gap-1.5">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                onClick={onToggleCamera}
                className="px-3 py-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>{cameraMode === 'cockpit' ? 'Cockpit [C]' : 'Chase [C]'}</span>
              </button>

              <button
                onClick={onScan}
                className="px-3 py-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Radar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scan [F]</span>
              </button>

              <button
                onClick={onOpenMap}
                className="px-3 py-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>Galaxy Map [M]</span>
              </button>

              <button
                onClick={onOpenShip}
                className="px-3 py-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ship & Upgrades [U]</span>
              </button>

              <button
                onClick={onOpenComms}
                className="px-3 py-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Comms & AI [G]</span>
              </button>

              <button
                onClick={onTriggerEvent}
                className="px-3 py-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-xs text-amber-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Signal Sweep</span>
              </button>

              {playMode === 'surface' && (
                <button
                  onClick={onLaunchToOrbit}
                  className="px-3 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Launch to Orbit</span>
                </button>
              )}

              <button
                onClick={onPause}
                className="px-2.5 py-1.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-xs text-slate-300 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                aria-label="Pause"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>ESC</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
              <span>W/Space: Thrust</span>
              <span>S: Brake</span>
              <span>A/D: Turn</span>
              <span>Q/Z or Mouse: Pitch/Steer</span>
              <span>Shift: Boost</span>
              <span>Click/J: Fire Cannons</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
