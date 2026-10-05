/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { initialUserTeam, leagueTeams, transferMarketPool } from './data/initialData';
import { Team, Player, TacticsConfig, ActiveTab, MatchStats, MatchEvent } from './types';
import { Header } from './components/Header';
import { ThreeMatchEngine } from './components/ThreeMatchEngine';
import { TacticsBoard } from './components/TacticsBoard';
import { SquadManager } from './components/SquadManager';
import { TransferMarket } from './components/TransferMarket';
import { LeagueTable } from './components/LeagueTable';
import { sound } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('match3d');
  const [userTeam, setUserTeam] = useState<Team>(initialUserTeam);
  const [teams, setTeams] = useState<Team[]>(leagueTeams);
  const [marketPlayers, setMarketPlayers] = useState<Player[]>(transferMarketPool);
  const [currentOpponent, setCurrentOpponent] = useState<Team>(
    leagueTeams.find(t => t.id !== initialUserTeam.id) || leagueTeams[1]
  );
  const [matchNotification, setMatchNotification] = useState<string | null>(null);

  // Tactics Update
  const handleUpdateTactics = (newTactics: TacticsConfig) => {
    setUserTeam(prev => ({
      ...prev,
      tactics: newTactics,
    }));
  };

  // Swap Players in Lineup
  const handleSwapPlayers = (id1: string, id2: string) => {
    sound.playKick(0.5);
    setUserTeam(prev => {
      const newXI = [...prev.startingXI];
      const newSubs = [...prev.substitutes];

      const idx1XI = newXI.indexOf(id1);
      const idx2XI = newXI.indexOf(id2);
      const idx1Sub = newSubs.indexOf(id1);
      const idx2Sub = newSubs.indexOf(id2);

      if (idx1XI !== -1 && idx2XI !== -1) {
        // Both in starting XI, swap places
        const temp = newXI[idx1XI];
        newXI[idx1XI] = newXI[idx2XI];
        newXI[idx2XI] = temp;
      } else if (idx1XI !== -1 && idx2Sub !== -1) {
        // One in XI, one on bench
        newXI[idx1XI] = id2;
        newSubs[idx2Sub] = id1;
      } else if (idx1Sub !== -1 && idx2XI !== -1) {
        // One on bench, one in XI
        newSubs[idx1Sub] = id2;
        newXI[idx2XI] = id1;
      }

      return {
        ...prev,
        startingXI: newXI,
        substitutes: newSubs,
      };
    });
  };

  // Squad Training
  const handleTrainSquad = () => {
    sound.playWhistle(false);
    setUserTeam(prev => ({
      ...prev,
      squad: prev.squad.map(p => ({
        ...p,
        overall: Math.min(99, p.overall + (Math.random() > 0.6 ? 1 : 0)),
        stamina: Math.min(100, p.stamina + 5),
        morale: Math.min(100, p.morale + 4),
      })),
    }));
    setMatchNotification("Mashg'ulot muvaffaqiyatli yakunlandi! Futbolchilar ruhiyati va ko'rsatkichlari oshdi.");
    setTimeout(() => setMatchNotification(null), 3000);
  };

  // Squad Rest
  const handleRestSquad = () => {
    setUserTeam(prev => ({
      ...prev,
      squad: prev.squad.map(p => ({
        ...p,
        stamina: 100,
        morale: Math.min(100, p.morale + 3),
      })),
    }));
    setMatchNotification("Jamoaga to'liq dam berildi! Barcha futbolchilar chidamliligi 100% ga yetdi.");
    setTimeout(() => setMatchNotification(null), 3000);
  };

  // Buy Player from Transfer Market
  const handleBuyPlayer = (player: Player, fee: number) => {
    setUserTeam(prev => {
      const newPlayer: Player = {
        ...player,
        number: prev.squad.length + 1,
      };
      return {
        ...prev,
        budget: prev.budget - fee,
        wageBill: prev.wageBill + player.wage,
        squad: [...prev.squad, newPlayer],
        substitutes: [...prev.substitutes, newPlayer.id],
      };
    });

    // Remove from market pool
    setMarketPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  // Sell Player
  const handleSellPlayer = (playerId: string, sellPrice: number) => {
    const playerToSell = userTeam.squad.find(p => p.id === playerId);
    if (!playerToSell) return;

    setUserTeam(prev => ({
      ...prev,
      budget: prev.budget + sellPrice,
      wageBill: Math.max(0, prev.wageBill - playerToSell.wage),
      squad: prev.squad.filter(p => p.id !== playerId),
      startingXI: prev.startingXI.filter(id => id !== playerId),
      substitutes: prev.substitutes.filter(id => id !== playerId),
    }));

    setMatchNotification(`${playerToSell.name} $${sellPrice}M evaziga sotildi!`);
    setTimeout(() => setMatchNotification(null), 3000);
  };

  // Start match with chosen opponent
  const handleStartMatchWith = (opponent: Team) => {
    setCurrentOpponent(opponent);
    setActiveTab('match3d');
  };

  // Match Finish Handler: update standings
  const handleMatchFinish = (matchStats: MatchStats, events: MatchEvent[]) => {
    const isHomeWin = matchStats.homeScore > matchStats.awayScore;
    const isDraw = matchStats.homeScore === matchStats.awayScore;

    setTeams(prevTeams =>
      prevTeams.map(t => {
        if (t.id === userTeam.id) {
          return {
            ...t,
            played: t.played + 1,
            won: isHomeWin ? t.won + 1 : t.won,
            drawn: isDraw ? t.drawn + 1 : t.drawn,
            lost: !isHomeWin && !isDraw ? t.lost + 1 : t.lost,
            goalsFor: t.goalsFor + matchStats.homeScore,
            goalsAgainst: t.goalsAgainst + matchStats.awayScore,
            points: t.points + (isHomeWin ? 3 : isDraw ? 1 : 0),
          };
        } else if (t.id === currentOpponent.id) {
          return {
            ...t,
            played: t.played + 1,
            won: !isHomeWin && !isDraw ? t.won + 1 : t.won,
            drawn: isDraw ? t.drawn + 1 : t.drawn,
            lost: isHomeWin ? t.lost + 1 : t.lost,
            goalsFor: t.goalsFor + matchStats.awayScore,
            goalsAgainst: t.goalsAgainst + matchStats.homeScore,
            points: t.points + (!isHomeWin && !isDraw ? 3 : isDraw ? 1 : 0),
          };
        }
        return t;
      })
    );

    setUserTeam(prev => ({
      ...prev,
      played: prev.played + 1,
      won: isHomeWin ? prev.won + 1 : prev.won,
      drawn: isDraw ? prev.drawn + 1 : prev.drawn,
      lost: !isHomeWin && !isDraw ? prev.lost + 1 : prev.lost,
      goalsFor: prev.goalsFor + matchStats.homeScore,
      goalsAgainst: prev.goalsAgainst + matchStats.awayScore,
      points: prev.points + (isHomeWin ? 3 : isDraw ? 1 : 0),
    }));

    setMatchNotification(
      `O'yin yakunlandi: ${userTeam.name} ${matchStats.homeScore} - ${matchStats.awayScore} ${currentOpponent.name}. Turnir jadvali yangilandi!`
    );
  };

  // Star player for the showcase banner
  const starPlayer = [...userTeam.squad].sort((a, b) => b.overall - a.overall)[0];

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-slate-200 flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userTeam={userTeam}
      />

      {/* Global Notification Toast */}
      {matchNotification && (
        <div className="max-w-7xl mx-auto px-4 w-full mt-4">
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-bold text-emerald-400 text-center shadow-lg shadow-emerald-500/5">
            {matchNotification}
          </div>
        </div>
      )}

      {/* Top Manager Quick Status Bar (Elegant Dark Theme Strip) */}
      <div className="border-b border-white/5 bg-[#0d0f14]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 sm:gap-10">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Klub Balansi</span>
              <span className="text-base sm:text-lg font-mono font-bold text-white">€{(userTeam.budget * 1000000).toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Navbatdagi Raqib</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold text-white">vs {currentOpponent.name}</span>
                <span className="text-emerald-400 text-xs font-bold">[Uy]</span>
              </div>
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Mavsum Holati</span>
              <span className="text-sm font-semibold text-slate-300">Superliga • 13-Tur</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('match3d')}
              className="bg-emerald-500 text-black px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer hover:brightness-110 active:scale-95 transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
            >
              ⚽ 3D O&apos;yinni boshlash
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'match3d' && (
          <div className="space-y-6">
            {/* Elegant Star Player Showcase Card */}
            {starPlayer && (
              <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-[#0d0f14] border border-white/10 p-6 sm:p-7 shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(16,185,129,0.16),transparent)] pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-80 h-full bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.22),transparent)] pointer-events-none" />

                <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-md tracking-widest uppercase">
                      YETAKCHI FUTBOLCHI
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black italic mt-2 text-white uppercase tracking-tight">
                      {starPlayer.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {userTeam.name} • {starPlayer.position} • Bozor narxi: €{starPlayer.value}M
                    </p>

                    <div className="flex gap-5 sm:gap-8 mt-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">TEZ</span>
                        <span className="text-lg font-bold text-white font-mono">{starPlayer.pace}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">DRI</span>
                        <span className="text-lg font-bold text-white font-mono">{starPlayer.dribbling}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ZAR</span>
                        <span className="text-lg font-bold text-white font-mono">{starPlayer.shooting}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">PAS</span>
                        <span className="text-lg font-bold text-white font-mono">{starPlayer.passing}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">QUV</span>
                        <span className="text-lg font-bold text-white font-mono">{starPlayer.physical}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24 h-28 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center backdrop-blur-md shadow-xl">
                      <span className="text-4xl font-black text-white">{starPlayer.overall}</span>
                      <span className="text-[10px] text-slate-400 tracking-widest font-bold mt-1 uppercase">OVR</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
                  Jonli 3D O&apos;yin Simulyatori
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Maydonni 3D formatda aylantirib tomosha qiling, menejer buyruqlarini bering!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Raqib tanlash:</span>
                <select
                  value={currentOpponent.id}
                  onChange={e => {
                    const opp = teams.find(t => t.id === e.target.value);
                    if (opp) setCurrentOpponent(opp);
                  }}
                  className="bg-[#0d0f14] border border-white/10 text-emerald-400 font-bold text-xs rounded-xl px-3 py-1.5 outline-none cursor-pointer focus:border-emerald-500/50"
                >
                  {teams
                    .filter(t => t.id !== userTeam.id)
                    .map(opp => (
                      <option key={opp.id} value={opp.id}>
                        {opp.name} ({opp.city})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* 3D Engine Instance */}
            <ThreeMatchEngine
              key={`${userTeam.id}_vs_${currentOpponent.id}`}
              homeTeam={userTeam}
              awayTeam={currentOpponent}
              onMatchFinish={handleMatchFinish}
              isPracticeMode={false}
            />
          </div>
        )}

        {activeTab === 'practice3d' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
                3D Jarima & Penalti Mashg&apos;uloti
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Nishon balandligi, gorizontal burchak, zarba kuchi va to&apos;p aylanishini sozlab darvozabonga gol uring!
              </p>
            </div>

            <ThreeMatchEngine
              key="practice_drill_3d"
              homeTeam={userTeam}
              awayTeam={currentOpponent}
              isPracticeMode={true}
            />
          </div>
        )}

        {activeTab === 'tactics' && (
          <TacticsBoard
            team={userTeam}
            onUpdateTactics={handleUpdateTactics}
            onSwapPlayers={handleSwapPlayers}
          />
        )}

        {activeTab === 'squad' && (
          <SquadManager
            team={userTeam}
            onTrainSquad={handleTrainSquad}
            onRestSquad={handleRestSquad}
          />
        )}

        {activeTab === 'transfers' && (
          <TransferMarket
            team={userTeam}
            marketPlayers={marketPlayers}
            onBuyPlayer={handleBuyPlayer}
            onSellPlayer={handleSellPlayer}
          />
        )}

        {activeTab === 'standings' && (
          <LeagueTable
            teams={teams}
            userTeamId={userTeam.id}
            onStartMatchWith={handleStartMatchWith}
          />
        )}
      </main>
    </div>
  );
}
