import React, { useState } from 'react';
import { DollarSign, ShoppingCart, Search, Check, AlertCircle, ArrowRightLeft, Sparkles } from 'lucide-react';
import { Player, Team } from '../types';
import { sound } from '../utils/audio';

interface TransferMarketProps {
  team: Team;
  marketPlayers: Player[];
  onBuyPlayer: (player: Player, fee: number) => void;
  onSellPlayer: (playerId: string, sellPrice: number) => void;
}

export const TransferMarket: React.FC<TransferMarketProps> = ({
  team,
  marketPlayers,
  onBuyPlayer,
  onSellPlayer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'ATT'>('ALL');
  const [negotiatingPlayer, setNegotiatingPlayer] = useState<Player | null>(null);
  const [offerFee, setOfferFee] = useState<number>(0);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

  const filteredMarket = marketPlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'GK') return p.position === 'GK';
    if (selectedFilter === 'DEF') return ['CB', 'LB', 'RB'].includes(p.position);
    if (selectedFilter === 'MID') return ['CDM', 'CM', 'CAM'].includes(p.position);
    if (selectedFilter === 'ATT') return ['ST', 'LW', 'RW'].includes(p.position);
    return true;
  });

  const handleStartNegotiation = (player: Player) => {
    setNegotiatingPlayer(player);
    setOfferFee(player.value);
    setMessage(null);
  };

  const handleConfirmPurchase = () => {
    if (!negotiatingPlayer) return;

    if (team.budget < offerFee) {
      setMessage({ text: "Klub byudjetida yetarli mablag' mavjud emas!", type: 'error' });
      return;
    }

    sound.playGoalRoar();
    onBuyPlayer(negotiatingPlayer, offerFee);
    setMessage({
      text: `Tabriklaymiz! ${negotiatingPlayer.name} jamoangizga $${offerFee}M evaziga qo'shildi!`,
      type: 'success',
    });

    setTimeout(() => {
      setNegotiatingPlayer(null);
      setMessage(null);
    }, 1500);
  };

  const handleSellClick = (player: Player) => {
    const sellPrice = Math.round(player.value * 0.9 * 10) / 10;
    if (confirm(`${player.name}ni $${sellPrice}M ga sotishga rozimisiz?`)) {
      sound.playKick(0.8);
      onSellPlayer(player.id, sellPrice);
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Status Banner */}
      <div className="bg-[#12141a] border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-2.5">
            <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
            Transfer Bozori & Muzokaralar
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Yulduz futbolchilarni sotib oling yoki ortiqcha o&apos;yinchilarni sotib byudjetni ko&apos;paytiring
          </p>
        </div>

        {/* Club Budget Pill */}
        <div className="flex items-center gap-3 bg-white/[0.02] px-4 py-2.5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Mavjud Byudjet</span>
              <p className="text-lg font-black text-emerald-400 font-mono">
                €{team.budget.toFixed(1)}M
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buy / Sell Tabs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('buy')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'buy'
              ? 'bg-white/5 text-emerald-400 border border-emerald-500/40 shadow-sm font-black'
              : 'bg-[#0d0f14] text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> O&apos;yinchi sotib olish ({filteredMarket.length})
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'sell'
              ? 'bg-white/5 text-emerald-400 border border-emerald-500/40 shadow-sm font-black'
              : 'bg-[#0d0f14] text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <DollarSign className="w-4 h-4" /> O&apos;yinchini sotish ({team.squad.length})
        </button>
      </div>

      {activeTab === 'buy' ? (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Futbolchi ismini izlang (masalan: Haaland, Mbappé, Bellingham)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d0f14] border border-white/10 text-white placeholder:text-slate-500 rounded-2xl pl-10 pr-4 py-3 text-xs outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['ALL', 'GK', 'DEF', 'MID', 'ATT'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setSelectedFilter(pos)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex-1 sm:flex-none ${
                    selectedFilter === pos
                      ? 'bg-emerald-500 text-black font-black'
                      : 'bg-[#0d0f14] border border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Market Player Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMarket.map(player => (
              <div
                key={player.id}
                className="bg-[#12141a] hover:bg-white/[0.04] border border-white/5 hover:border-emerald-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs text-white shadow ring-1 ring-white/10"
                        style={{ backgroundColor: player.avatarColor }}
                      >
                        {player.number}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition flex items-center gap-1.5">
                          {player.name}
                          {player.overall >= 90 && (
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400 inline" />
                          )}
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

                  {/* Attributes */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 text-xs text-center">
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
                  </div>
                </div>

                <div className="mt-4 pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Transfer narxi:</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      €{player.value}M
                    </span>
                  </div>

                  <button
                    onClick={() => handleStartNegotiation(player)}
                    className="px-4 py-2 bg-emerald-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 transition active:scale-95 flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Muzokara
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Sell Players Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.squad.map(player => (
            <div
              key={player.id}
              className="bg-[#12141a] border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs text-white ring-1 ring-white/10"
                      style={{ backgroundColor: team.primaryColor }}
                    >
                      {player.number}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{player.name}</h4>
                      <span className="text-[11px] text-slate-400">
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
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Sotuv narxi (90%):</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    €{(player.value * 0.9).toFixed(1)}M
                  </span>
                </div>

                <button
                  onClick={() => handleSellClick(player)}
                  disabled={team.squad.length <= 11}
                  className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-40"
                >
                  Sotish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Negotiation Modal */}
      {negotiatingPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              Transfer Shartnomasi
            </h3>

            <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">{negotiatingPlayer.name}</h4>
                <span className="text-xs text-slate-400">
                  {negotiatingPlayer.position} • Reyting: {negotiatingPlayer.overall}
                </span>
              </div>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                €{negotiatingPlayer.value}M
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-2">
                <span className="text-slate-400">Klub taklifi (Narx):</span>
                <span className="font-mono font-bold text-emerald-400">€{offerFee}M</span>
              </div>
              <input
                type="range"
                min={Math.round(negotiatingPlayer.value * 0.85)}
                max={Math.round(negotiatingPlayer.value * 1.3)}
                step="0.5"
                value={offerFee}
                onChange={e => setOfferFee(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="bg-white/[0.02] p-3.5 rounded-2xl border border-white/5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Mavjud Byudjet:</span>
                <span className="font-mono font-bold text-white">€{team.budget.toFixed(1)}M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Xariddan keyingi qoldiq:</span>
                <span
                  className={`font-mono font-bold ${
                    team.budget >= offerFee ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  €{(team.budget - offerFee).toFixed(1)}M
                </span>
              </div>
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs font-bold text-center border ${
                  message.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500 text-rose-300'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setNegotiatingPlayer(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleConfirmPurchase}
                disabled={team.budget < offerFee}
                className="flex-1 py-2.5 bg-emerald-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 transition active:scale-95 disabled:opacity-40"
              >
                Xaridni Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
