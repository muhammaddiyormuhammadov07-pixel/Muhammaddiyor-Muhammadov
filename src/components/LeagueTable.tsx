import React from 'react';
import { Trophy, Award, Calendar, ChevronRight, Play } from 'lucide-react';
import { Team } from '../types';

interface LeagueTableProps {
  teams: Team[];
  userTeamId: string;
  onStartMatchWith: (opponent: Team) => void;
}

export const LeagueTable: React.FC<LeagueTableProps> = ({
  teams,
  userTeamId,
  onStartMatchWith,
}) => {
  // Sort teams by points, then goal difference, then goals scored
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });

  // Next rival is second or third team in standings that is not user team
  const nextRival = sortedTeams.find(t => t.id !== userTeamId) || sortedTeams[1];

  const topScorers = [
    { name: 'Eldor Shomurodov', team: 'Toshkent Lions', goals: 12, pos: 'ST' },
    { name: 'Dragan Ceran', team: 'Paxtakor Titans', goals: 10, pos: 'CAM' },
    { name: 'Zoran Marusic', team: 'Nasaf Qarshi', goals: 9, pos: 'ST' },
    { name: 'Abbosbek Fayzullaev', team: 'Toshkent Lions', goals: 8, pos: 'CAM' },
    { name: 'Toma Tabatadze', team: 'Navbahor Namangan', goals: 7, pos: 'ST' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Standings Table */}
      <div className="lg:col-span-8 bg-[#12141a] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h3 className="font-black text-lg text-white italic uppercase tracking-tight">
              Superliga Turnir Jadvali
            </h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
            MAVSUM 2026/2027
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-white/5 uppercase tracking-widest text-[10px]">
                <th className="py-3 px-3">O&apos;rin</th>
                <th className="py-3 px-3">Klub</th>
                <th className="py-3 px-2 text-center">O&apos;</th>
                <th className="py-3 px-2 text-center">G&apos;</th>
                <th className="py-3 px-2 text-center">D</th>
                <th className="py-3 px-2 text-center">M</th>
                <th className="py-3 px-2 text-center">TF</th>
                <th className="py-3 px-3 text-right">Ochko</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {sortedTeams.map((team, index) => {
                const isUser = team.id === userTeamId;
                const gd = team.goalsFor - team.goalsAgainst;

                return (
                  <tr
                    key={team.id}
                    className={`transition-colors ${
                      isUser
                        ? 'bg-white/5 text-emerald-400 border-l-2 border-emerald-500 font-bold'
                        : 'hover:bg-white/[0.03] text-slate-300'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`w-6 h-6 rounded-lg inline-flex items-center justify-center text-[11px] font-bold ${
                          index === 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : index < 3
                            ? 'bg-white/5 text-slate-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>

                    <td className="py-3 px-3 flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/10"
                        style={{ backgroundColor: team.primaryColor }}
                      />
                      <span className={`truncate ${isUser ? 'text-white font-bold' : ''}`}>
                        {team.name}
                      </span>
                      {isUser && (
                        <span className="text-[9px] bg-emerald-500 text-black font-black px-1.5 py-0.5 rounded ml-1 uppercase">
                          Siz
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-2 text-center font-mono">{team.played}</td>
                    <td className="py-3 px-2 text-center font-mono text-emerald-400">{team.won}</td>
                    <td className="py-3 px-2 text-center font-mono text-slate-400">{team.drawn}</td>
                    <td className="py-3 px-2 text-center font-mono text-rose-400">{team.lost}</td>
                    <td className="py-3 px-2 text-center font-mono text-slate-300">
                      {gd > 0 ? `+${gd}` : gd}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm font-bold text-white">
                      {team.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel: Next Fixture & Top Scorers */}
      <div className="lg:col-span-4 space-y-6">
        {/* Next Match Fixture Card */}
        {nextRival && (
          <div className="bg-[#12141a] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 uppercase tracking-widest">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Navbatdagi 3D Uchrashuv
              </span>
              <span className="text-[10px] bg-white/5 border border-white/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                13-TUR
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="text-center flex-1">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center font-bold text-xs text-white shadow-lg ring-1 ring-white/10"
                  style={{ backgroundColor: teams.find(t => t.id === userTeamId)?.primaryColor || '#059669' }}
                >
                  TSH
                </div>
                <span className="text-xs font-bold text-white block truncate">Toshkent Lions</span>
              </div>

              <span className="text-base font-black text-slate-600 font-mono px-3">VS</span>

              <div className="text-center flex-1">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center font-bold text-xs text-white shadow-lg ring-1 ring-white/10"
                  style={{ backgroundColor: nextRival.primaryColor }}
                >
                  {nextRival.shortName}
                </div>
                <span className="text-xs font-bold text-white block truncate">{nextRival.name}</span>
              </div>
            </div>

            <button
              onClick={() => onStartMatchWith(nextRival)}
              className="w-full py-3 bg-emerald-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> 3D O&apos;yinni boshlash
            </button>
          </div>
        )}

        {/* Top Scorers Card */}
        <div className="bg-[#12141a] border border-white/5 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h4 className="font-black text-sm text-white flex items-center gap-2 italic uppercase tracking-tight">
              <Award className="w-4 h-4 text-emerald-400" />
              To&apos;purarlar (Oltin Butsa)
            </h4>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">TOP 5</span>
          </div>

          <div className="space-y-2 text-xs">
            {topScorers.map((scorer, idx) => (
              <div
                key={scorer.name}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-white/5 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-white block">{scorer.name}</span>
                    <span className="text-[10px] text-slate-500">{scorer.team}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {scorer.goals}
                  </span>
                  <span className="text-[9px] text-slate-500 block uppercase tracking-wider">gol</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
