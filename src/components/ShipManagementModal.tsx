import React from 'react';
import { X, Wrench, Fuel, Wind, ArrowUpCircle } from 'lucide-react';
import { RESOURCE_CATALOG, UPGRADE_SPECS, getUpgradeCost } from '../game/planets';
import { getTotalCargoCount } from '../game/storage';
import { GameSaveState, ResourceId, UpgradeKey } from '../game/types';
import { spaceAudio } from '../game/audio';

interface ShipManagementModalProps {
  save: GameSaveState;
  onUpgrade: (key: UpgradeKey) => void;
  onRepairHull: () => void;
  onRefuel: () => void;
  onReplenishOxygen: () => void;
  onClose: () => void;
}

export const ShipManagementModal: React.FC<ShipManagementModalProps> = ({
  save,
  onUpgrade,
  onRepairHull,
  onRefuel,
  onReplenishOxygen,
  onClose,
}) => {
  const { ship, resources, upgrades } = save;
  const totalCargo = getTotalCargoCount(resources);

  const canAfford = (cost: Partial<Record<ResourceId, number>>) => {
    return Object.entries(cost).every(
      ([k, amt]) => (resources[k as ResourceId] ?? 0) >= (amt ?? 0),
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="hud-panel rounded-xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto sci-scroll">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <p className="text-xs font-mono-tabular text-sky-400">
              ODYSSEY-7 ENGINEERING BAY · CARGO {totalCargo}/{ship.cargoCapacity}
            </p>
            <h2 className="font-display text-2xl font-bold text-white">Ship Systems & Upgrades</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Close Ship Management"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vital Subsystems & Quick Maintenance */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-4">
          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div className="text-[11px] text-slate-400">Hull Condition</div>
            <div className="font-mono-tabular text-lg font-semibold text-emerald-400">
              {Math.round(ship.hull)}/{ship.maxHull}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div className="text-[11px] text-slate-400">Shield Grid</div>
            <div className="font-mono-tabular text-lg font-semibold text-sky-400">
              {Math.round(ship.shield)}/{ship.maxShield}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div className="text-[11px] text-slate-400">Fuel Reserve</div>
            <div className="font-mono-tabular text-lg font-semibold text-amber-400">
              {Math.round(ship.fuel)}/{ship.maxFuel}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div className="text-[11px] text-slate-400">Oxygen Supply</div>
            <div className="font-mono-tabular text-lg font-semibold text-cyan-300">
              {Math.round(ship.oxygen)}/{ship.maxOxygen}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div className="text-[11px] text-slate-400">Reactor Energy</div>
            <div className="font-mono-tabular text-lg font-semibold text-purple-300">
              {Math.round(ship.energy)}/{ship.maxEnergy}
            </div>
          </div>
        </div>

        {/* Field Maintenance Bar */}
        <div className="flex flex-wrap gap-2.5 pb-5 border-b border-slate-800">
          <button
            onClick={() => {
              spaceAudio.playUiClick();
              onRepairHull();
            }}
            disabled={ship.hull >= ship.maxHull || resources.titanium < 3}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-45 text-xs text-slate-200 flex items-center gap-2 cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-emerald-400" />
            <span>Repair +35 Hull (3 Titanium)</span>
          </button>
          <button
            onClick={() => {
              spaceAudio.playUiClick();
              onRefuel();
            }}
            disabled={ship.fuel >= ship.maxFuel || resources.deuterium < 3}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-45 text-xs text-slate-200 flex items-center gap-2 cursor-pointer"
          >
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
            <span>Synthesize +40 Fuel (3 Deuterium)</span>
          </button>
          <button
            onClick={() => {
              spaceAudio.playUiClick();
              onReplenishOxygen();
            }}
            disabled={ship.oxygen >= ship.maxOxygen || resources.cryoWater < 2}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-45 text-xs text-slate-200 flex items-center gap-2 cursor-pointer"
          >
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Electrolyze +35 O2 (2 Cryo-Water)</span>
          </button>
        </div>

        {/* Cargo Hold */}
        <div className="py-4 border-b border-slate-800">
          <h3 className="text-xs font-semibold tracking-wider text-slate-400 mb-2.5">
            CARGO BAY INVENTORY
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {(Object.keys(RESOURCE_CATALOG) as ResourceId[]).map((rid) => {
              const item = RESOURCE_CATALOG[rid];
              return (
                <div
                  key={rid}
                  className="p-2.5 rounded-lg bg-slate-900/75 border border-slate-800"
                  title={item.description}
                >
                  <div className="text-[11px] text-slate-300 truncate">{item.name}</div>
                  <div
                    className="font-mono-tabular text-base font-bold mt-0.5"
                    style={{ color: item.color }}
                  >
                    {resources[rid] ?? 0}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6 Subsystem Upgrade Cards */}
        <div className="pt-4">
          <h3 className="text-xs font-semibold tracking-wider text-slate-400 mb-3">
            SUBSYSTEM UPGRADES
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {UPGRADE_SPECS.map((spec) => {
              const level = upgrades[spec.key];
              const isMax = level >= spec.maxLevel;
              const cost = getUpgradeCost(spec, level);
              const affordable = !isMax && canAfford(cost);

              return (
                <div
                  key={spec.key}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-display font-semibold text-sm text-white">
                        {spec.name}
                      </span>
                      <span className="font-mono-tabular text-xs text-sky-400">
                        LVL {level}/{spec.maxLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-2">
                      {spec.description}
                    </p>
                    <div className="text-xs font-mono-tabular text-emerald-300">
                      Current: {spec.effectLabel(level)}
                    </div>
                  </div>

                  {!isMax ? (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex flex-wrap gap-2 text-[11px] font-mono-tabular text-slate-300">
                        {Object.entries(cost).map(([rk, rv]) => {
                          const have = resources[rk as ResourceId] ?? 0;
                          const enough = have >= (rv ?? 0);
                          return (
                            <span
                              key={rk}
                              className={enough ? 'text-slate-300' : 'text-rose-400'}
                            >
                              {RESOURCE_CATALOG[rk as ResourceId].name}: {have}/{rv}
                            </span>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => {
                          spaceAudio.playPickup();
                          onUpgrade(spec.key);
                        }}
                        disabled={!affordable}
                        className="w-full py-2 rounded-md bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        <span>Upgrade to Level {level + 1}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-800 text-xs font-mono-tabular text-amber-300">
                      MAXIMUM TIER INSTALLED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
