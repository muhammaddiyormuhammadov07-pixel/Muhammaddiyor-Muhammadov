import React, { useState } from 'react';
import { Users, Dumbbell, Coffee, Award, Star, ArrowUpRight, CheckCircle } from 'lucide-react';
import { Player, Team } from '../types';

interface SquadManagerProps {
  team: Team;
  onTrainSquad: () => void;
  onRestSquad: () => void;
}

export const SquadManager: React.FC<SquadManagerProps> = ({
  team,
  onTrainSquad,
  onRestSquad,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [filterPos, setFilterPos] = useState<string>('ALL');

  const filteredSquad = team.squad.filter(p => {
    if (filterPos === 'ALL') return true;
    if (filterPos === 'GK') return p.position === 'GK';
    if (filterPos === 'DEF') return ['CB', 'LB', 'RB'].includes(p.position);
    if (filterPos === 'MID') return ['CDM', 'CM', 'CAM'].includes(p.position);
    if (filterPos === 'ATT') return ['ST', 'LW', 'RW'].includes(p.position);
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls: Training & Squad Status */}
      <div className="bg-[#12141a] border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-400" />
            Jamoa Tarkibi & O&apos;yinchilar Boshqaruvi
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Jami {team.squad.length} nafar futbolchi • Haftalik maosh: €{(team.wageBill * 1000).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onTrainSquad}
            className="px-5 py-2.5 bg-emerald-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 transition active:scale-95 flex items-center gap-2"
          >
            <Dumbbell className="w-4 h-4" />
            Mashg&apos;ulot o&apos;tkazish
          </button>
          <button
            onClick={onRestSquad}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-white/10 transition active:scale-95 flex items-center gap-1.5"
          >
            <Coffee className="w-4 h-4 text-emerald-400" />
            Dam berish
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['ALL', 'GK', 'DEF', 'MID', 'ATT'].map(pos => (
          <button
            key={pos}
            onClick={() => setFilterPos(pos)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              filterPos === pos
                ? 'bg-white/5 text-emerald-400 border border-emerald-500/40 shadow-sm font-bold'
                : 'bg-[#0d0f14] border border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {pos === 'ALL' && 'Barcha futbolchilar'}
            {pos === 'GK' && 'Darvozabonlar'}
            {pos === 'DEF' && 'Himoyachilar'}
            {pos === 'MID' && 'Yarim himoya'}
            {pos === 'ATT' && 'Hujumchilar'}
          </button>
        ))}
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSquad.map(player => {
          const isStarter = team.startingXI.includes(player.id);

          return (
            <div
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              className="bg-[#12141a] hover:bg-white/[0.04] border border-white/5 hover:border-emerald-500/30 rounded-3xl p-5 shadow-xl transition cursor-pointer group flex flex-col justify-between"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs text-white shadow-lg ring-1 ring-white/10"
                      style={{ backgroundColor: player.position === 'GK' ? '#0d9488' : team.primaryColor }}
                    >
                      {player.number}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition">
                        {player.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {player.position} • {player.age} yosh
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-white font-mono">
                      {player.overall}
                    </span>
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">OVR</span>
                  </div>
                </div>

                {/* Attribute Progress Bars */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tezlik</span>
                    <p className="font-mono font-bold text-slate-200">{player.pace}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Zarba</span>
                    <p className="font-mono font-bold text-slate-200">{player.shooting}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Pas</span>
                    <p className="font-mono font-bold text-slate-200">{player.passing}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Dribling</span>
                    <p className="font-mono font-bold text-slate-200">{player.dribbling}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Himoya</span>
                    <p className="font-mono font-bold text-slate-200">{player.defense}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Jismoniy</span>
                    <p className="font-mono font-bold text-slate-200">{player.physical}</p>
                  </div>
                </div>
              </div>

              {/* Bottom Footer: Stamina, Value, Status */}
              <div className="mt-3 pt-2 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Quvvat:</span>
                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${player.stamina}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-emerald-400 font-bold">
                      {player.stamina}%
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Bozor narxi: <strong className="text-white font-mono">€{player.value}M</strong>
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    isStarter
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/5'
                  }`}
                >
                  {isStarter ? 'Asosiy (11)' : 'Zaxira'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Player Profile Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow ring-1 ring-white/10"
                  style={{ backgroundColor: selectedPlayer.position === 'GK' ? '#0d9488' : team.primaryColor }}
                >
                  {selectedPlayer.number}
                </span>
                <div>
                  <h3 className="text-lg font-black text-white italic uppercase tracking-tight">
                    {selectedPlayer.name}
                  </h3>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {selectedPlayer.position} • {selectedPlayer.age} yosh
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-white font-mono">
                  {selectedPlayer.overall}
                </span>
                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest">OVR</span>
              </div>
            </div>

            {/* Stat Meters */}
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Tezlik (Pace)', val: selectedPlayer.pace },
                { label: 'Zarba berish (Shooting)', val: selectedPlayer.shooting },
                { label: 'To\'p uzatish (Passing)', val: selectedPlayer.passing },
                { label: 'To\'p bilan yurish (Dribbling)', val: selectedPlayer.dribbling },
                { label: 'Himoyalanish (Defense)', val: selectedPlayer.defense },
                { label: 'Jismoniy quvvat (Physical)', val: selectedPlayer.physical },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="text-slate-400">{stat.label}</span>
                    <span className="font-mono font-bold text-white">{stat.val}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${stat.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Contract & Stats */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
              <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Bozor qiymati</span>
                <p className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                  €{selectedPlayer.value}M
                </p>
              </div>
              <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Haftalik maosh</span>
                <p className="font-mono font-bold text-white text-sm mt-0.5">
                  €{selectedPlayer.wage}k / hafta
                </p>
              </div>
              <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Urilgan gollar</span>
                <p className="font-mono font-bold text-white text-sm mt-0.5">
                  ⚽ {selectedPlayer.goals} ta
                </p>
              </div>
              <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Golli uzatmalar</span>
                <p className="font-mono font-bold text-white text-sm mt-0.5">
                  🎯 {selectedPlayer.assists} ta
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlayer(null)}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 transition"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
