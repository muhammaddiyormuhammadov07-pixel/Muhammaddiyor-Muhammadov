import React, { useState } from 'react';
import { Shield, Zap, RefreshCw, Layers, Sliders, CheckCircle2, UserCheck } from 'lucide-react';
import { Team, Player, Formation, TacticalStyle, Mentality, TacticsConfig } from '../types';

interface TacticsBoardProps {
  team: Team;
  onUpdateTactics: (tactics: TacticsConfig) => void;
  onSwapPlayers: (player1Id: string, player2Id: string) => void;
}

export const TacticsBoard: React.FC<TacticsBoardProps> = ({
  team,
  onUpdateTactics,
  onSwapPlayers,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const startingPlayers = team.squad.filter(p => team.startingXI.includes(p.id));
  const benchPlayers = team.squad.filter(p => team.substitutes.includes(p.id));

  // Compute stats
  const avgOverall = Math.round(
    startingPlayers.reduce((acc, p) => acc + p.overall, 0) / (startingPlayers.length || 1)
  );

  const attackers = startingPlayers.filter(p => ['ST', 'LW', 'RW', 'CAM'].includes(p.position));
  const midfielders = startingPlayers.filter(p => ['CM', 'CDM', 'CAM'].includes(p.position));
  const defenders = startingPlayers.filter(p => ['CB', 'LB', 'RB', 'GK'].includes(p.position));

  const attackRating = Math.round(attackers.reduce((a, p) => a + p.shooting, 0) / (attackers.length || 1));
  const midRating = Math.round(midfielders.reduce((a, p) => a + p.passing, 0) / (midfielders.length || 1));
  const defRating = Math.round(defenders.reduce((a, p) => a + p.defense, 0) / (defenders.length || 1));

  // Formation coordinates on 2D tactical board (normalized percent from top and left)
  const getFormationCoordinates = (idx: number, pos: string, formation: Formation) => {
    if (pos === 'GK' || idx === 0) return { top: '88%', left: '50%' };

    switch (formation) {
      case '4-3-3': {
        const coords = [
          { top: '88%', left: '50%' }, // GK
          { top: '70%', left: '16%' }, // LB
          { top: '72%', left: '38%' }, // CB
          { top: '72%', left: '62%' }, // CB
          { top: '70%', left: '84%' }, // RB
          { top: '52%', left: '50%' }, // CDM
          { top: '44%', left: '30%' }, // CM
          { top: '38%', left: '70%' }, // CAM
          { top: '20%', left: '20%' }, // LW
          { top: '16%', left: '50%' }, // ST
          { top: '20%', left: '80%' }, // RW
        ];
        return coords[idx] || { top: '50%', left: '50%' };
      }
      case '4-4-2': {
        const coords = [
          { top: '88%', left: '50%' }, // GK
          { top: '70%', left: '16%' }, // LB
          { top: '72%', left: '38%' }, // CB
          { top: '72%', left: '62%' }, // CB
          { top: '70%', left: '84%' }, // RB
          { top: '46%', left: '16%' }, // LM
          { top: '48%', left: '38%' }, // CM
          { top: '48%', left: '62%' }, // CM
          { top: '46%', left: '84%' }, // RM
          { top: '18%', left: '38%' }, // ST
          { top: '18%', left: '62%' }, // ST
        ];
        return coords[idx] || { top: '50%', left: '50%' };
      }
      case '3-5-2': {
        const coords = [
          { top: '88%', left: '50%' }, // GK
          { top: '72%', left: '26%' }, // LCB
          { top: '74%', left: '50%' }, // CB
          { top: '72%', left: '74%' }, // RCB
          { top: '50%', left: '12%' }, // LWB
          { top: '52%', left: '36%' }, // CM
          { top: '46%', left: '50%' }, // CAM
          { top: '52%', left: '64%' }, // CM
          { top: '50%', left: '88%' }, // RWB
          { top: '18%', left: '38%' }, // ST
          { top: '18%', left: '62%' }, // ST
        ];
        return coords[idx] || { top: '50%', left: '50%' };
      }
      case '4-2-3-1': {
        const coords = [
          { top: '88%', left: '50%' }, // GK
          { top: '70%', left: '16%' }, // LB
          { top: '72%', left: '38%' }, // CB
          { top: '72%', left: '62%' }, // CB
          { top: '70%', left: '84%' }, // RB
          { top: '54%', left: '36%' }, // CDM
          { top: '54%', left: '64%' }, // CDM
          { top: '34%', left: '20%' }, // LAM
          { top: '32%', left: '50%' }, // CAM
          { top: '34%', left: '80%' }, // RAM
          { top: '16%', left: '50%' }, // ST
        ];
        return coords[idx] || { top: '50%', left: '50%' };
      }
      case '5-3-2':
      default: {
        const coords = [
          { top: '88%', left: '50%' }, // GK
          { top: '70%', left: '14%' }, // LWB
          { top: '74%', left: '32%' }, // CB
          { top: '76%', left: '50%' }, // CB
          { top: '74%', left: '68%' }, // CB
          { top: '70%', left: '86%' }, // RWB
          { top: '48%', left: '30%' }, // CM
          { top: '46%', left: '50%' }, // CAM
          { top: '48%', left: '70%' }, // CM
          { top: '18%', left: '38%' }, // ST
          { top: '18%', left: '62%' }, // ST
        ];
        return coords[idx] || { top: '50%', left: '50%' };
      }
    }
  };

  const handlePlayerClick = (pId: string) => {
    if (!selectedPlayerId) {
      setSelectedPlayerId(pId);
    } else {
      if (selectedPlayerId !== pId) {
        onSwapPlayers(selectedPlayerId, pId);
      }
      setSelectedPlayerId(null);
    }
  };

  const formations: Formation[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];
  const tacticalStyles: TacticalStyle[] = ['Tiki-Taka', 'Gegenpress', 'Counter', 'Park the Bus', 'Direct'];
  const mentalities: { key: Mentality; label: string }[] = [
    { key: 'very_defensive', label: 'Juda himoyaviy' },
    { key: 'defensive', label: 'Himoyaviy' },
    { key: 'balanced', label: 'Muvozanatli' },
    { key: 'attacking', label: 'Hujumkor' },
    { key: 'all_out_attack', label: 'To\'liq hujum' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 2D Tactical Pitch & Lineup */}
      <div className="lg:col-span-7 bg-[#12141a] border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
        {/* Pitch Header */}
        <div className="w-full flex items-center justify-between mb-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="font-black text-lg text-white italic uppercase tracking-tight">
              Taktik Sxema & Tarkib
            </h3>
          </div>
          <div className="flex items-center gap-2 bg-[#0d0f14] px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Sxema:</span>
            <select
              value={team.tactics.formation}
              onChange={e => onUpdateTactics({ ...team.tactics, formation: e.target.value as Formation })}
              className="bg-transparent text-emerald-400 font-bold text-xs outline-none cursor-pointer"
            >
              {formations.map(f => (
                <option key={f} value={f} className="bg-[#0d0f14] text-white">
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tactical Pitch Container */}
        <div className="relative w-full max-w-[480px] h-[580px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-b from-emerald-950 via-emerald-900 to-[#0a1f18]">
          {/* Pitch Markings */}
          <div className="absolute inset-4 border border-white/25 pointer-events-none rounded">
            {/* Halfway line */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30 -translate-y-1/2" />
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 w-24 h-24 border border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
            {/* Top Penalty Box */}
            <div className="absolute top-0 left-1/2 w-48 h-24 border-b border-l border-r border-white/30 -translate-x-1/2" />
            {/* Bottom Penalty Box */}
            <div className="absolute bottom-0 left-1/2 w-48 h-24 border-t border-l border-r border-white/30 -translate-x-1/2" />
          </div>

          {/* 11 Players on Pitch */}
          {startingPlayers.map((player, idx) => {
            const pos = getFormationCoordinates(idx, player.position, team.tactics.formation);
            const isSelected = selectedPlayerId === player.id;

            return (
              <button
                key={player.id}
                onClick={() => handlePlayerClick(player.id)}
                style={{ top: pos.top, left: pos.left }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-transform ${
                  isSelected ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                }`}
              >
                {/* Jersey Badge */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shadow-xl transition-all ring-1 ${
                    isSelected
                      ? 'ring-4 ring-emerald-400 bg-emerald-500 text-black animate-pulse'
                      : 'ring-white/40 text-white'
                  }`}
                  style={{
                    backgroundColor: isSelected ? undefined : player.position === 'GK' ? '#0d9488' : team.primaryColor,
                  }}
                >
                  {player.number}
                </div>

                {/* Name & Position Tag */}
                <div className="mt-1 bg-[#0a0b0e]/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-200 border border-white/10 shadow whitespace-nowrap">
                  <span className="text-emerald-400 mr-1">{player.position}</span>
                  {player.name.split(' ').pop()}
                </div>

                {/* Overall Rating Pill */}
                <span className="text-[9px] font-mono text-emerald-300 font-bold">
                  {player.overall}
                </span>
              </button>
            );
          })}

          {selectedPlayerId && (
            <div className="absolute top-3 inset-x-4 bg-emerald-500 text-black font-black text-xs text-center py-2 rounded-xl shadow-xl uppercase tracking-wider animate-bounce">
              Almashtirish uchun boshqa o&apos;yinchini bosing!
            </div>
          )}
        </div>

        {/* Bench Substitutes Line */}
        <div className="w-full mt-5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2.5 block">
            Zaxira o&apos;yinchilar (Almashtirish uchun bosing):
          </span>
          <div className="grid grid-cols-5 gap-2">
            {benchPlayers.map(sub => {
              const isSelected = selectedPlayerId === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => handlePlayerClick(sub.id)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400'
                      : 'bg-[#0d0f14] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-white/5 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">
                    {sub.number}
                  </span>
                  <span className="text-[11px] font-bold text-white truncate max-w-full">
                    {sub.name.split(' ').pop()}
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-500">{sub.position}</span>
                    <span className="text-white font-mono font-bold">{sub.overall}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tactical Settings & Team Analysis */}
      <div className="lg:col-span-5 space-y-6">
        {/* Team Ratings Card */}
        <div className="bg-[#12141a] border border-white/5 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <h4 className="font-black text-base text-white flex items-center gap-2 italic uppercase tracking-tight">
              <Zap className="w-4 h-4 text-emerald-400" />
              Jamoa Quvvati & Bahosi
            </h4>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">ANALITIKA</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Umumiy reyting</span>
              <div className="text-2xl font-black text-white font-mono mt-0.5">
                {avgOverall}
              </div>
            </div>
            <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Hujum chizig&apos;i</span>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                {attackRating}
              </div>
            </div>
            <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Yarim himoya</span>
              <div className="text-2xl font-black text-white font-mono mt-0.5">
                {midRating}
              </div>
            </div>
            <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Himoya chizig&apos;i</span>
              <div className="text-2xl font-black text-slate-300 font-mono mt-0.5">
                {defRating}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
            <span>Jamoa ruhiyati va kimyosi:</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">96% (A&apos;lo)</span>
          </div>
        </div>

        {/* Tactical Customization Sliders */}
        <div className="bg-[#12141a] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="border-b border-white/5 pb-4">
            <h4 className="font-black text-base text-white flex items-center gap-2 italic uppercase tracking-tight">
              <Sliders className="w-4 h-4 text-emerald-400" />
              O&apos;yin Falsafasi & Buyruqlar
            </h4>
          </div>

          {/* Tactical Style */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-2">
              O&apos;yin Uslubi (Taktika):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tacticalStyles.map(style => (
                <button
                  key={style}
                  onClick={() => onUpdateTactics({ ...team.tactics, style })}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                    team.tactics.style === style
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm'
                      : 'bg-[#0d0f14] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Mentality */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block mb-2">
              Jamoa kayfiyati (Mentalitet):
            </label>
            <div className="flex flex-col gap-1.5">
              {mentalities.map(m => (
                <button
                  key={m.key}
                  onClick={() => onUpdateTactics({ ...team.tactics, mentality: m.key })}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                    team.tactics.mentality === m.key
                      ? 'bg-emerald-500 text-black font-black'
                      : 'bg-[#0d0f14] text-slate-400 border border-white/5 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{m.label}</span>
                  {team.tactics.mentality === m.key && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Tempo & Pressing */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5 block">Pas tezligi (Tempo):</label>
              <select
                value={team.tactics.tempo}
                onChange={e => onUpdateTactics({ ...team.tactics, tempo: e.target.value as 'slow' | 'balanced' | 'fast' })}
                className="w-full bg-[#0d0f14] border border-white/10 text-emerald-400 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500/50"
              >
                <option value="slow">Sekin (Nazorat)</option>
                <option value="balanced">O&apos;rtacha</option>
                <option value="fast">Tezkor (Kontrataka)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5 block">Pressing kuchi:</label>
              <select
                value={team.tactics.pressing}
                onChange={e => onUpdateTactics({ ...team.tactics, pressing: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full bg-[#0d0f14] border border-white/10 text-emerald-400 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-emerald-500/50"
              >
                <option value="low">Past (Orqada)</option>
                <option value="medium">Standart</option>
                <option value="high">Yuqori (Gegenpress)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
