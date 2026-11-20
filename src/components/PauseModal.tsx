import React from 'react';
import { Play, Volume2, VolumeX, Home } from 'lucide-react';
import { AudioSettings } from '../game/types';
import { spaceAudio } from '../game/audio';

interface PauseModalProps {
  audioSettings: AudioSettings;
  onUpdateAudio: (next: AudioSettings) => void;
  onResume: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  audioSettings,
  onUpdateAudio,
  onResume,
  onMainMenu,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="hud-panel rounded-xl max-w-md w-full p-6 space-y-5">
        <div>
          <p className="text-xs font-mono-tabular text-sky-400 tracking-wider">BRIDGE SIMULATION PAUSED</p>
          <h2 className="font-display text-2xl font-bold text-white mt-1">Command Pause</h2>
        </div>

        <div className="space-y-3 p-4 rounded-lg bg-slate-900/75 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300">Audio Output</span>
            <button
              onClick={() =>
                onUpdateAudio({ ...audioSettings, muted: !audioSettings.muted })
              }
              className="flex items-center gap-1.5 text-xs text-sky-300 hover:text-white cursor-pointer"
            >
              {audioSettings.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              <span>{audioSettings.muted ? 'Muted' : 'Active'}</span>
            </button>
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
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
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => {
              spaceAudio.playUiClick();
              onResume();
            }}
            className="w-full py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Exploration</span>
          </button>
          <button
            onClick={() => {
              spaceAudio.playUiClick();
              onMainMenu();
            }}
            className="w-full py-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Save & Return to Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
