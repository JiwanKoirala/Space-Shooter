import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SpaceEvent, SpaceEventChoice } from '../game/types';
import { spaceAudio } from '../game/audio';

interface SpaceEventModalProps {
  event: SpaceEvent;
  onResolve: (choice: SpaceEventChoice) => void;
}

export const SpaceEventModal: React.FC<SpaceEventModalProps> = ({ event, onResolve }) => {
  const [selectedChoice, setSelectedChoice] = useState<SpaceEventChoice | null>(null);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="hud-panel rounded-xl max-w-xl w-full p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-amber-300 font-mono-tabular mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>{event.category.toUpperCase()}</span>
              <span aria-hidden="true">·</span>
              <span>{event.source === 'ai' ? 'DYNAMIC SECTOR EVENT' : 'SECTOR ENCOUNTER'}</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">{event.title}</h2>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{event.description}</p>

        {!selectedChoice ? (
          <div className="space-y-3">
            {event.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => {
                  spaceAudio.playUiClick();
                  setSelectedChoice(choice);
                }}
                className="w-full text-left p-4 rounded-lg bg-slate-900/80 border border-slate-700/80 hover:border-sky-400/70 transition-colors cursor-pointer"
              >
                <div className="font-display font-semibold text-sm text-sky-200 mb-1">
                  {choice.label}
                </div>
                <div className="text-xs text-slate-400">{choice.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-900/90 border border-sky-500/40 space-y-3">
            <div className="flex items-center gap-2 text-sky-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>OUTCOME LOGGED</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{selectedChoice.outcomeText}</p>
            <div className="flex flex-wrap gap-3 text-xs font-mono-tabular pt-1">
              {selectedChoice.hullDelta !== 0 && (
                <span className={selectedChoice.hullDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  Hull {selectedChoice.hullDelta > 0 ? `+${selectedChoice.hullDelta}` : selectedChoice.hullDelta}
                </span>
              )}
              {selectedChoice.shieldDelta !== 0 && (
                <span className={selectedChoice.shieldDelta > 0 ? 'text-sky-400' : 'text-amber-400'}>
                  Shield {selectedChoice.shieldDelta > 0 ? `+${selectedChoice.shieldDelta}` : selectedChoice.shieldDelta}
                </span>
              )}
              {selectedChoice.fuelDelta !== 0 && (
                <span className={selectedChoice.fuelDelta > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                  Fuel {selectedChoice.fuelDelta > 0 ? `+${selectedChoice.fuelDelta}` : selectedChoice.fuelDelta}
                </span>
              )}
              {selectedChoice.energyDelta !== 0 && (
                <span className={selectedChoice.energyDelta > 0 ? 'text-cyan-400' : 'text-amber-400'}>
                  Energy {selectedChoice.energyDelta > 0 ? `+${selectedChoice.energyDelta}` : selectedChoice.energyDelta}
                </span>
              )}
              <span className="text-amber-300">+{selectedChoice.pointsDelta} PTS</span>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  spaceAudio.playUiClick();
                  onResolve(selectedChoice);
                }}
                className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                Continue Voyage
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
