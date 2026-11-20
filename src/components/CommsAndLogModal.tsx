import React, { useState } from 'react';
import { X, Send, Sparkles, BookOpen, Trophy, Radio } from 'lucide-react';
import { ACHIEVEMENTS_LIST, PLANETS } from '../game/planets';
import { GameSaveState } from '../game/types';
import { spaceAudio } from '../game/audio';

interface CommsAndLogModalProps {
  save: GameSaveState;
  aiBusy: boolean;
  onSendAlienMessage: (planetId: string, message: string) => Promise<void>;
  onGenerateAiMission: () => Promise<void>;
  onGenerateStory: () => Promise<void>;
  onClose: () => void;
}

export const CommsAndLogModal: React.FC<CommsAndLogModalProps> = ({
  save,
  aiBusy,
  onSendAlienMessage,
  onGenerateAiMission,
  onGenerateStory,
  onClose,
}) => {
  const [tab, setTab] = useState<'alien' | 'missions' | 'chronicle'>('alien');
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>(save.currentPlanetId);
  const [messageInput, setMessageInput] = useState('');

  const planet = PLANETS.find((p) => p.id === selectedPlanetId) ?? PLANETS[0];
  const chatMessages = save.alienChats[planet.id] ?? [];
  const attitude = save.alienAttitudes[planet.id] ?? planet.alien.initialAttitude;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed || aiBusy) return;
    setMessageInput('');
    spaceAudio.playAlienChime();
    await onSendAlienMessage(planet.id, trimmed);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="hud-panel rounded-xl max-w-5xl w-full p-6 max-h-[90vh] flex flex-col">
        {/* Header + Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <p className="text-xs font-mono-tabular text-purple-300">SUBSPACE AI & ARCHIVES</p>
            <h2 className="font-display text-2xl font-bold text-white">Comms, Missions & Chronicle</h2>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
            <button
              onClick={() => setTab('alien')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                tab === 'alien' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Alien Comms</span>
            </button>
            <button
              onClick={() => setTab('missions')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                tab === 'missions' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Missions</span>
            </button>
            <button
              onClick={() => setTab('chronicle')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                tab === 'chronicle' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Chronicle & Awards</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Close Terminal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB 1: Alien Communication */}
        {tab === 'alien' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 flex-1 min-h-0 overflow-hidden">
            {/* Species Selector */}
            <div className="lg:col-span-4 space-y-2 overflow-y-auto sci-scroll pr-1">
              {PLANETS.map((p) => {
                const discovered = save.discoveredPlanets.includes(p.id);
                const active = p.id === planet.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      spaceAudio.playUiClick();
                      setSelectedPlanetId(p.id);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-800/90 border-sky-400/70'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-semibold text-white">{p.alien.name}</span>
                      <span className="font-mono-tabular text-[11px]" style={{ color: p.alien.accentColor }}>
                        {p.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {p.alien.species} · {discovered ? 'In Range' : 'Long-Range Relay'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Conversation Panel */}
            <div className="lg:col-span-8 flex flex-col rounded-xl bg-slate-950/75 border border-slate-800 overflow-hidden min-h-[360px]">
              <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-display font-bold text-white">
                    {planet.alien.name} — {planet.alien.title}
                  </div>
                  <div className="text-xs text-slate-400">{planet.alien.history}</div>
                </div>
                <div className="text-xs font-mono-tabular text-sky-300">
                  Attitude: {attitude >= 0 ? `+${attitude}` : attitude}
                </div>
              </div>

              <div className="flex-1 p-4 space-y-3 overflow-y-auto sci-scroll max-h-72">
                {chatMessages.length === 0 ? (
                  <div className="text-xs text-slate-400 leading-relaxed p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    Subspace channel open with <span className="text-white">{planet.alien.name}</span> of{' '}
                    <span className="text-white">{planet.alien.species}</span>. Ask about the 2389 Vexis signal,
                    planetary history, resources, or humanity’s arrival.
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg text-xs leading-relaxed ${
                        msg.sender === 'player'
                          ? 'bg-sky-500/15 border border-sky-500/30 text-sky-100 ml-8'
                          : msg.sender === 'system'
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
                            : 'bg-slate-900/90 border border-slate-700 text-slate-200 mr-8'
                      }`}
                    >
                      <div className="text-[10px] font-mono-tabular text-slate-400 mb-1">
                        {msg.sender === 'player'
                          ? save.captainName.toUpperCase()
                          : msg.sender === 'system'
                            ? 'TRANSLATOR LOG'
                            : planet.alien.name.toUpperCase()}
                      </div>
                      {msg.text}
                    </div>
                  ))
                )}
                {aiBusy && (
                  <div className="text-xs text-sky-300 font-mono-tabular">
                    Decoding subspace response...
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Transmit message to ${planet.alien.name}...`}
                  className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  disabled={aiBusy || !messageInput.trim()}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: AI Missions */}
        {tab === 'missions' && (
          <div className="pt-4 space-y-5 overflow-y-auto sci-scroll">
            <div className="p-5 rounded-xl bg-slate-900/80 border border-sky-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono-tabular text-sky-400">
                    ACTIVE DIRECTIVE · {save.activeMission.source === 'ai' ? 'GEMINI DYNAMIC' : 'STARFLEET COMMAND'}
                  </span>
                  <h3 className="font-display text-xl font-bold text-white mt-0.5">
                    {save.activeMission.title}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    spaceAudio.playUiClick();
                    void onGenerateAiMission();
                  }}
                  disabled={aiBusy}
                  className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiBusy ? 'Generating...' : 'Request New AI Mission'}</span>
                </button>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{save.activeMission.briefing}</p>
              <p className="text-xs text-slate-400 italic">{save.activeMission.narrativeHook}</p>
              <div className="flex flex-wrap gap-4 text-xs font-mono-tabular pt-1 text-sky-300">
                <span>Progress: {save.activeMission.progress}/{save.activeMission.targetCount}</span>
                <span>Target: {save.activeMission.targetPlanetId.toUpperCase()}</span>
                <span className="text-amber-300">Reward: +{save.activeMission.rewardPoints} PTS</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-wider text-slate-400 mb-2.5">
                COMPLETED MISSIONS ({save.completedMissions.length})
              </h4>
              {save.completedMissions.length === 0 ? (
                <p className="text-xs text-slate-500">No completed missions logged yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {save.completedMissions.slice().reverse().map((m) => (
                    <div key={m.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                      <div className="text-xs font-semibold text-emerald-300">{m.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{m.briefing}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Chronicle, Planet Log & Achievements */}
        {tab === 'chronicle' && (
          <div className="pt-4 space-y-5 overflow-y-auto sci-scroll">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-slate-400">
                CAPTAIN’S STORY CHRONICLE
              </h3>
              <button
                onClick={() => {
                  spaceAudio.playUiClick();
                  void onGenerateStory();
                }}
                disabled={aiBusy}
                className="px-3.5 py-1.5 rounded-lg bg-sky-500/20 border border-sky-400/40 hover:bg-sky-500/30 text-sky-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiBusy ? 'Composing...' : 'Generate AI Story Chapter'}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {save.storyLog.slice().reverse().map((entry) => (
                <div key={entry.id} className="p-4 rounded-lg bg-slate-900/75 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-sky-400 mb-1">
                    <span>STARDATE {entry.stardate}</span>
                    <span>{entry.source === 'ai' ? 'AI CHRONICLE' : 'BRIDGE LOG'}</span>
                  </div>
                  <div className="text-sm font-display font-semibold text-white mb-1">{entry.title}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{entry.body}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>ACHIEVEMENTS ({save.achievements.length}/{ACHIEVEMENTS_LIST.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {ACHIEVEMENTS_LIST.map((ach) => {
                  const unlocked = save.achievements.includes(ach.id);
                  return (
                    <div
                      key={ach.id}
                      className={`p-3 rounded-lg border ${
                        unlocked
                          ? 'bg-amber-500/10 border-amber-400/40'
                          : 'bg-slate-900/50 border-slate-800 opacity-55'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{ach.title}</div>
                      <p className="text-[11px] text-slate-400 mt-1">{ach.description}</p>
                      <div className="text-[11px] font-mono-tabular text-amber-300 mt-1.5">
                        +{ach.points} PTS {unlocked ? '· UNLOCKED' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
