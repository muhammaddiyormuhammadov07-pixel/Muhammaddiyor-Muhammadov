import React from 'react';
import { Trophy, Users, Shield, ArrowRightLeft, Crosshair, Play, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { ActiveTab, Team } from '../types';
import { sound } from '../utils/audio';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userTeam: Team;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userTeam,
}) => {
  const [isMuted, setIsMuted] = React.useState(sound.isMuted);

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'match3d', label: '3D O\'yin', icon: <Play className="w-4 h-4 fill-current" /> },
    { id: 'tactics', label: 'Taktika', icon: <Shield className="w-4 h-4" /> },
    { id: 'squad', label: 'Tarkib', icon: <Users className="w-4 h-4" /> },
    { id: 'transfers', label: 'Transferlar', icon: <ArrowRightLeft className="w-4 h-4" /> },
    { id: 'standings', label: 'Turnir jadvali', icon: <Trophy className="w-4 h-4" /> },
    { id: 'practice3d', label: '3D Jarima', icon: <Crosshair className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0d0f14]/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Club Info */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('match3d')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] shadow-lg shadow-emerald-500/10 flex items-center justify-center">
              <div className="w-full h-full bg-[#0d0f14] rounded-[15px] flex items-center justify-center text-sm font-bold text-white">
                ⚽
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tighter text-emerald-500 italic uppercase">
                  FOOTBALL<span className="text-white">CLUB 3D</span>
                </h1>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {userTeam.name}
              </p>
            </div>
          </div>

          {/* Quick Balance & Next Match Pills in Header */}
          <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-white/5">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Balans</span>
              <span className="text-xs font-mono font-bold text-white">€{userTeam.budget.toFixed(1)}M</span>
            </div>
          </div>

          {/* Sound toggle button */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition md:hidden"
            title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-none">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? 'bg-white/5 text-emerald-400 border border-emerald-500/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition hidden md:flex items-center justify-center ml-2"
            title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </nav>
      </div>
    </header>
  );
};
