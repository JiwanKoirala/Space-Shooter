import React, { useState } from 'react';
import { Volume2, VolumeX, Play, RotateCcw, Settings, HelpCircle, X } from 'lucide-react';
import { AudioSettings, GameSaveState } from '../game/types';
import { spaceAudio } from '../game/audio';

interface MainMenuProps {
  existingSave: GameSaveState | null;
  audioSettings: AudioSettings;
  onUpdateAudio: (next: AudioSettings) => void;
  onNewGame: (captainName: string) => void;
  onContinueGame: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  existingSave,
  audioSettings,
  onUpdateAudio,
  onNewGame,
  onContinueGame,
}) => {
  const [modal, setModal] = useState<'none' | 'settings' | 'howto' | 'name'>('none');
  const [captainName, setCaptainName] = useState(existingSave?.captainName ?? 'Captain Vance');

  const openModal = (target: 'settings' | 'howto' | 'name') => {
    spaceAudio.playUiClick();
    setModal(target);
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-8 md:p-14 pointer-events-none">
      {/* Top Row: Minimal Era Marker + Quick Audio Toggle */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="text-xs tracking-[0.22em] text-sky-300/80 font-mono-tabular">
          SECTOR VEXIS · YEAR 2389 · VESSEL ODYSSEY-7
        </div>
        <button
          onClick={() => {
            spaceAudio.playUiClick();
            onUpdateAudio({ ...audioSettings, muted: !audioSettings.muted });
          }}
          className="hud-panel px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-medium text-slate-200 hover:border-sky-400/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          aria-label={audioSettings.muted ? 'Unmute audio' : 'Mute audio'}
        >
          {audioSettings.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          <span>{audioSettings.muted ? 'Muted' : 'Audio On'}</span>
        </button>
      </div>

      {/* Left-Aligned Hero Title & Menu Controls */}
      <div className="max-w-xl my-auto pointer-events-auto">
        <p className="text-sm font-medium tracking-[0.24em] text-sky-400 mb-3">
          DEEP SPACE EXPLORATION COMMAND
        </p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.06] mb-4 text-balance">
          SPACE: BEYOND THE UNKNOWN
        </h1>
        <p className="text-slate-300 text-base leading-relaxed max-w-md mb-8">
          Chart six uncharted worlds, pilot ODYSSEY-7 through asteroid belts and anomalies,
          converse with alien civilizations, and uncover the 2389 Vexis transmission.
        </p>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 max-w-md">
          <button
            onClick={() => openModal('name')}
            className="px-6 py-3.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-semibold tracking-wider text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>PLAY NEW VOYAGE</span>
          </button>

          {existingSave && (
            <button
              onClick={() => {
                spaceAudio.playUiClick();
                onContinueGame();
              }}
              className="hud-panel px-6 py-3.5 rounded-lg hover:border-sky-400/70 text-sky-200 font-display font-semibold tracking-wider text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>CONTINUE ({existingSave.explorationPoints} PTS)</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => openModal('settings')}
            className="hud-panel-subtle px-4 py-2.5 rounded-lg hover:border-sky-400/50 text-slate-200 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Settings className="w-3.5 h-3.5 text-sky-400" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => openModal('howto')}
            className="hud-panel-subtle px-4 py-2.5 rounded-lg hover:border-sky-400/50 text-slate-200 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>How to Play</span>
          </button>
        </div>
      </div>

      {/* Bottom Subtle Metadata */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span>3D Real-Time Flight & Surface Exploration</span>
        <span aria-hidden="true">·</span>
        <span>Dynamic AI Missions & Alien Diplomacy</span>
        <span aria-hidden="true">·</span>
        <span>Auto-Saved Locally</span>
      </div>

      {/* Captain Name Launch Prompt */}
      {modal === 'name' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 pointer-events-auto">
          <div className="hud-panel rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-white">Commission ODYSSEY-7</h2>
              <button
                onClick={() => setModal('none')}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-xs text-slate-300 mb-2" htmlFor="captain-name-input">
              Enter Captain Designation
            </label>
            <input
              id="captain-name-input"
              type="text"
              maxLength={28}
              value={captainName}
              onChange={(e) => setCaptainName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-400 mb-5"
              placeholder="Captain Vance"
            />
            {existingSave && (
              <p className="text-xs text-amber-300/90 mb-4">
                Starting a new voyage will overwrite your previous saved mission progress.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModal('none')}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  spaceAudio.playUiClick();
                  onNewGame(captainName.trim() || 'Captain Vance');
                }}
                className="px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs tracking-wide cursor-pointer"
              >
                Launch Mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {modal === 'settings' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 pointer-events-auto">
          <div className="hud-panel rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-semibold text-white">Audio & Flight Settings</h2>
              <button
                onClick={() => setModal('none')}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-200">Mute All Audio</span>
                <button
                  onClick={() =>
                    onUpdateAudio({ ...audioSettings, muted: !audioSettings.muted })
                  }
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                    audioSettings.muted
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  }`}
                >
                  {audioSettings.muted ? 'Muted' : 'Enabled'}
                </button>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Master Volume</span>
                  <span className="font-mono-tabular">{Math.round(audioSettings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={audioSettings.masterVolume}
                  onChange={(e) =>
                    onUpdateAudio({ ...audioSettings, masterVolume: parseFloat(e.target.value) })
                  }
                  className="w-full accent-sky-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Ambient Space Music</span>
                  <span className="font-mono-tabular">{Math.round(audioSettings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={audioSettings.musicVolume}
                  onChange={(e) =>
                    onUpdateAudio({ ...audioSettings, musicVolume: parseFloat(e.target.value) })
                  }
                  className="w-full accent-sky-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Thrusters & Effects</span>
                  <span className="font-mono-tabular">{Math.round(audioSettings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={audioSettings.sfxVolume}
                  onChange={(e) =>
                    onUpdateAudio({ ...audioSettings, sfxVolume: parseFloat(e.target.value) })
                  }
                  className="w-full accent-sky-400"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  spaceAudio.playUiClick();
                  setModal('none');
                }}
                className="px-5 py-2 rounded-lg bg-sky-500 text-slate-950 text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How To Play Modal */}
      {modal === 'howto' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 pointer-events-auto">
          <div className="hud-panel rounded-xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto sci-scroll">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-white">Flight & Exploration Manual</h2>
              <button
                onClick={() => setModal('none')}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
                <h3 className="font-display text-sky-300 font-semibold text-xs tracking-wider">FLIGHT & SURFACE CONTROLS</h3>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li><span className="font-mono-tabular text-white">W / Space</span> — Accelerate forward</li>
                  <li><span className="font-mono-tabular text-white">S</span> — Decelerate / Reverse</li>
                  <li><span className="font-mono-tabular text-white">A / D</span> — Turn left / right</li>
                  <li><span className="font-mono-tabular text-white">Q / Z or Mouse</span> — Pitch up / down & steer</li>
                  <li><span className="font-mono-tabular text-white">Shift</span> — Hyper-Boost (uses fuel)</li>
                  <li><span className="font-mono-tabular text-white">Left Click / J</span> — Fire Plasma Cannons</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2">
                <h3 className="font-display text-sky-300 font-semibold text-xs tracking-wider">SHIP SYSTEMS & SHORTCUTS</h3>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li><span className="font-mono-tabular text-white">E</span> — Land on planet / Collect / Investigate</li>
                  <li><span className="font-mono-tabular text-white">F</span> — Pulse Scanner (reveals hidden nodes)</li>
                  <li><span className="font-mono-tabular text-white">C</span> — Toggle 3rd-Person / Cockpit Camera</li>
                  <li><span className="font-mono-tabular text-white">M</span> — Open Galaxy Map & Warp Drive</li>
                  <li><span className="font-mono-tabular text-white">U</span> — Ship Management & Upgrades</li>
                  <li><span className="font-mono-tabular text-white">G</span> — Alien Comms, AI Missions & Log</li>
                  <li><span className="font-mono-tabular text-white">ESC</span> — Pause Menu</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              Fly close to any planet and press <span className="text-sky-300 font-mono-tabular">E</span> to land on its 3D surface.
              Use your Scanner (<span className="text-sky-300 font-mono-tabular">F</span>) to reveal minerals and ancient relics, upgrade ODYSSEY-7,
              and hail alien civilizations via the Comms Terminal to unravel the Vexis signal.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setModal('none')}
                className="px-5 py-2 rounded-lg bg-sky-500 text-slate-950 text-xs font-semibold cursor-pointer"
              >
                Close Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
