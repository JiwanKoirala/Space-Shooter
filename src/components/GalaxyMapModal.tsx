import React, { useState } from 'react';
import { X, Navigation, Sparkles, ShieldAlert, Check } from 'lucide-react';
import { PLANETS, RESOURCE_CATALOG } from '../game/planets';
import { GameSaveState, PlanetConfig } from '../game/types';
import { spaceAudio } from '../game/audio';

interface GalaxyMapModalProps {
  save: GameSaveState;
  loadingMission: boolean;
  onWarpToPlanet: (planetId: string, fuelCost: number) => void;
  onLandOnPlanet: (planetId: string) => void;
  onGenerateMission: () => void;
  onClose: () => void;
}

export const GalaxyMapModal: React.FC<GalaxyMapModalProps> = ({
  save,
  loadingMission,
  onWarpToPlanet,
  onLandOnPlanet,
  onGenerateMission,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(save.currentPlanetId);
  const selected: PlanetConfig = PLANETS.find((p) => p.id === selectedId) ?? PLANETS[0];
  const currentPlanet = PLANETS.find((p) => p.id === save.currentPlanetId) ?? PLANETS[0];

  const dx = selected.position[0] - currentPlanet.position[0];
  const dy = selected.position[1] - currentPlanet.position[1];
  const dz = selected.position[2] - currentPlanet.position[2];
  const dist = Math.round(Math.hypot(dx, dy, dz));
  const fuelEfficiency = Math.max(0.55, 1 - (save.upgrades.fuelTank - 1) * 0.1);
  const warpFuelCost = selected.id === save.currentPlanetId ? 0 : Math.max(6, Math.round((dist / 65) * fuelEfficiency));
  const isDiscovered = save.discoveredPlanets.includes(selected.id);
  const canAffordFuel = save.ship.fuel >= warpFuelCost;

  // Map 3D coordinates into 2D SVG sector grid
  const project = (p: PlanetConfig) => {
    const x = ((p.position[0] + 550) / 1100) * 520 + 40;
    const y = ((-p.position[2] - 150) / 1250) * 320 + 35;
    return { x, y };
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="hud-panel rounded-xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto sci-scroll">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <p className="text-xs font-mono-tabular text-sky-400">SECTOR VEXIS STARCHART · {save.discoveredPlanets.length}/{PLANETS.length} CHARTED</p>
            <h2 className="font-display text-2xl font-bold text-white">Galaxy Navigation Map</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Close Galaxy Map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
          {/* Interactive 2D Sector Chart */}
          <div className="lg:col-span-7 rounded-xl bg-[#040814] border border-slate-800 p-4 relative overflow-hidden">
            <svg viewBox="0 0 600 400" className="w-full h-72 sm:h-80">
              {/* Concentric Sector Rings */}
              <circle cx="300" cy="360" r="95" fill="none" stroke="rgba(56,189,248,0.1)" strokeDasharray="4 4" />
              <circle cx="300" cy="360" r="190" fill="none" stroke="rgba(56,189,248,0.1)" strokeDasharray="4 4" />
              <circle cx="300" cy="360" r="290" fill="none" stroke="rgba(168,85,247,0.14)" strokeDasharray="4 4" />

              {/* Jump Route Line */}
              {selected.id !== currentPlanet.id && (
                <line
                  x1={project(currentPlanet).x}
                  y1={project(currentPlanet).y}
                  x2={project(selected).x}
                  y2={project(selected).y}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
              )}

              {/* Planet Nodes */}
              {PLANETS.map((p) => {
                const { x, y } = project(p);
                const isSelected = p.id === selected.id;
                const isCurrent = p.id === save.currentPlanetId;
                const charted = save.discoveredPlanets.includes(p.id);
                return (
                  <g
                    key={p.id}
                    onClick={() => {
                      spaceAudio.playUiClick();
                      setSelectedId(p.id);
                    }}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle cx={x} cy={y} r={20} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={p.id === 'vexis' ? 12 : 9.5}
                      fill={p.primaryColor}
                      stroke={p.atmosphereColor}
                      strokeWidth={isCurrent ? 3 : 1.5}
                    />
                    {p.hasRings && (
                      <ellipse
                        cx={x}
                        cy={y}
                        rx={17}
                        ry={5}
                        fill="none"
                        stroke={p.ringColor ?? p.atmosphereColor}
                        strokeWidth="1.2"
                        transform={`rotate(-18 ${x} ${y})`}
                      />
                    )}
                    <text
                      x={x}
                      y={y + 23}
                      textAnchor="middle"
                      fill={isSelected ? '#f8fafc' : '#94a3b8'}
                      fontSize="11"
                      fontFamily="Oxanium, sans-serif"
                      fontWeight={isSelected ? '700' : '500'}
                    >
                      {p.name}
                    </text>
                    {isCurrent && (
                      <text
                        x={x}
                        y={y - 16}
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        ODYSSEY-7
                      </text>
                    )}
                    {!charted && !isCurrent && (
                      <text
                        x={x + 12}
                        y={y - 8}
                        fill="#fbbf24"
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        ?
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <span>Current Fuel: <strong className="text-amber-300 font-mono-tabular">{Math.round(save.ship.fuel)}/{save.ship.maxFuel}</strong></span>
              <button
                onClick={() => {
                  spaceAudio.playUiClick();
                  onGenerateMission();
                }}
                disabled={loadingMission}
                className="px-3.5 py-1.5 rounded-md bg-purple-500/20 border border-purple-400/40 text-purple-200 hover:bg-purple-500/30 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loadingMission ? 'Synthesizing...' : 'Generate AI Mission'}</span>
              </button>
            </div>
          </div>

          {/* Selected Planet Briefing */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono-tabular" style={{ color: selected.atmosphereColor }}>
                    {selected.subtitle.toUpperCase()}
                  </span>
                  <h3 className="font-display text-2xl font-bold text-white">{selected.name}</h3>
                </div>
                {isDiscovered && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5" /> Charted
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selected.environmentSummary}
              </p>

              <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Hazard Rating</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      selected.dangerLevel === 'Extreme'
                        ? 'text-rose-400'
                        : selected.dangerLevel === 'High'
                          ? 'text-amber-400'
                          : 'text-sky-300'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {selected.dangerLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{selected.dangerDescription}</p>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-slate-400">PRIMARY RESOURCES</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selected.resources.map((rid) => (
                    <span
                      key={rid}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200"
                    >
                      {RESOURCE_CATALOG[rid].name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-300">
                <span className="text-slate-400">Indigenous Contact: </span>
                <span className="text-white font-medium">{selected.alien.species}</span>
                <span className="text-slate-500"> ({selected.alien.name})</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              {selected.id !== save.currentPlanetId ? (
                <button
                  onClick={() => {
                    spaceAudio.playUiClick();
                    onWarpToPlanet(selected.id, warpFuelCost);
                    onClose();
                  }}
                  disabled={!canAffordFuel}
                  className="w-full py-3 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-display font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>
                    {canAffordFuel
                      ? `WARP TO ${selected.name} (${warpFuelCost} FUEL)`
                      : `INSUFFICIENT FUEL (NEED ${warpFuelCost})`}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    spaceAudio.playUiClick();
                    onLandOnPlanet(selected.id);
                    onClose();
                  }}
                  className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-semibold text-sm cursor-pointer"
                >
                  DESCEND TO {selected.landingZoneName.toUpperCase()}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
