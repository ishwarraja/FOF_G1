import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Zap,
  Sliders,
  Database,
  Globe,
  Clock,
  ShieldCheck,
  RefreshCw,
  Cpu,
  AlertTriangle,
  PlayCircle,
  Radio,
  BarChart3,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

interface MatchmakingRegion {
  id: string;
  name: string;
  activePlayers: number;
  avgWaitSec: number;
  serverLoad: number; // %
  pingMs: number;
  status: 'OPTIMAL' | 'CONGESTED' | 'EXPANDING';
}

interface QueuedPlayer {
  id: string;
  name: string;
  elo: number;
  character: string;
  region: string;
  waitTime: number;
  status: 'SEARCHING' | 'MATCHED' | 'PROVISIONING';
}

export const FofLiveMatchmakingConsole: React.FC = () => {
  // Live Matchmaking Orchestration Parameters (Go API Gateway / Redis hot-swap)
  const [baseEloDelta, setBaseEloDelta] = useState<number>(75);
  const [expansionRate, setExpansionRate] = useState<number>(25); // +ELO per 5s
  const [maxWaitSec, setMaxWaitSec] = useState<number>(30);
  const [maxPingCutoff, setMaxPingCutoff] = useState<number>(65);
  const [crossRegionFallback, setCrossRegionFallback] = useState<boolean>(true);
  const [rollbackFrameWindow, setRollbackFrameWindow] = useState<number>(4); // GGPO Rollback frames
  const [biometricHarvestActive, setBiometricHarvestActive] = useState<boolean>(true);
  const [isHotSwapping, setIsHotSwapping] = useState<boolean>(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>('Just now');
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Cluster & Node Metrics
  const [serverTickrate, setServerTickrate] = useState<number>(60.0);
  const [activeMatchesCount, setActiveMatchesCount] = useState<number>(1420);
  const [totalQueuedCount, setTotalQueuedCount] = useState<number>(318);
  const [redisCacheLatency, setRedisCacheLatency] = useState<number>(0.42); // ms
  const [biometricSyncPercent, setBiometricSyncPercent] = useState<number>(68);

  // Regional Matrix
  const [regions, setRegions] = useState<MatchmakingRegion[]>([
    { id: 'na-east', name: 'NA-East (Virginia)', activePlayers: 1840, avgWaitSec: 4.2, serverLoad: 58, pingMs: 18, status: 'OPTIMAL' },
    { id: 'eu-central', name: 'EU-Central (Frankfurt)', activePlayers: 2190, avgWaitSec: 3.8, serverLoad: 64, pingMs: 24, status: 'OPTIMAL' },
    { id: 'apac-south', name: 'APAC-South (Tokyo/Singapore)', activePlayers: 1420, avgWaitSec: 6.1, serverLoad: 72, pingMs: 38, status: 'CONGESTED' },
    { id: 'sa-east', name: 'SA-East (São Paulo)', activePlayers: 680, avgWaitSec: 9.4, serverLoad: 41, pingMs: 52, status: 'EXPANDING' },
  ]);

  // Live Simulated Queued Match Events
  const [recentLogs, setRecentLogs] = useState<string[]>([
    '[Go API Gateway] Matchmaking poll cycle executed (318 queued tokens processed in 1.2ms)',
    '[Redis Enterprise] ELO tier bucket TTL verified across 4 regional clusters',
    '[UE 5.5 Dedicated Server] Node #ue5-ap-09 initialized with PaperZD deterministic collision matrix',
    '[PostgreSQL v16] Transactional audit log: User #8491 promoted to Master Tier (+24 ELO)',
    '[Aether Core] Biometric sync telemetry harvested from Sector 7 Arena match #4819',
  ]);

  // Handle hot-swapping matchmaking ruleset to Redis & Go backend
  const handleHotSwapRuleset = () => {
    soundFX.playClick();
    setIsHotSwapping(true);
    setSyncStatusMessage('Hot-swapping ruleset to Go microservices & Redis cache...');

    setTimeout(() => {
      setIsHotSwapping(false);
      const timeStr = new Date().toLocaleTimeString();
      setLastSyncTimestamp(timeStr);
      setSyncStatusMessage(`Ruleset deployed globally in 240ms (Zero-Downtime Cache Sync @ ${timeStr})`);
      soundFX.playSuperFlash();

      setRecentLogs(prev => [
        `[Go API Gateway] HOT-SWAP SUCCESS: Base ELO Delta ±${baseEloDelta}, Expansion +${expansionRate}/5s, Max Ping ${maxPingCutoff}ms deployed.`,
        ...prev.slice(0, 7),
      ]);

      setTimeout(() => setSyncStatusMessage(null), 5000);
    }, 450);
  };

  // Periodic simulated live telemetry tick
  useEffect(() => {
    const interval = setInterval(() => {
      setServerTickrate(59.9 + Math.random() * 0.2);
      setRedisCacheLatency(0.35 + Math.random() * 0.15);
      setActiveMatchesCount(prev => prev + Math.floor(Math.random() * 5 - 2));
      setTotalQueuedCount(prev => Math.max(120, prev + Math.floor(Math.random() * 7 - 3)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-zinc-900 to-black border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-600/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-red-400 animate-pulse" />
              LIVE ORCHESTRATION CONTROL PLANE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 border border-white/10 bg-black/40">
              Go / Redis / UE 5.5 C++
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-wider">
            Live Matchmaking & ELO Orchestrator
          </h2>
          <p className="text-xs text-gray-400 max-w-2xl">
            Real-time control plane to adjust acceptable player ELO rank delta thresholds, cross-region matchmaking pools, and dedicated Unreal Engine 5.5 fighting nodes with sub-500ms hot-swapping.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={handleHotSwapRuleset}
            disabled={isHotSwapping}
            className={`px-4 py-2.5 rounded-xl font-black italic text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border shadow-lg ${
              isHotSwapping
                ? 'bg-amber-600/50 border-amber-500 text-white animate-pulse'
                : 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border-red-500 text-white shadow-red-600/30'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isHotSwapping ? 'animate-spin' : ''}`} />
            {isHotSwapping ? 'HOT-SWAPPING...' : 'DEPLOY HOT-SWAP RULESET'}
          </button>
        </div>
      </div>

      {syncStatusMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{syncStatusMessage}</span>
        </div>
      )}

      {/* Top Telemetry KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-black/80 border border-white/10 rounded-2xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Active Matches
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
          </div>
          <p className="text-2xl font-black italic font-mono text-white">{activeMatchesCount.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">UE 5.5 Dedicated Nodes</p>
        </div>

        <div className="p-4 bg-black/80 border border-white/10 rounded-2xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Queued Players
            </span>
            <span className="text-[10px] text-amber-400 font-mono">{totalQueuedCount} ACTIVE</span>
          </div>
          <p className="text-2xl font-black italic font-mono text-amber-400">4.8s</p>
          <p className="text-[10px] text-gray-400">Global Average Queue Time</p>
        </div>

        <div className="p-4 bg-black/80 border border-white/10 rounded-2xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              Server Tickrate
            </span>
            <span className="text-[10px] text-blue-400 font-mono">DETERMINISTIC</span>
          </div>
          <p className="text-2xl font-black italic font-mono text-white">{serverTickrate.toFixed(1)} FPS</p>
          <p className="text-[10px] text-gray-400">Fixed Frame Determinism</p>
        </div>

        <div className="p-4 bg-black/80 border border-white/10 rounded-2xl space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              Redis Cache TTL
            </span>
            <span className="text-[10px] text-purple-400 font-mono">ULTRA-LOW</span>
          </div>
          <p className="text-2xl font-black italic font-mono text-purple-400">{redisCacheLatency.toFixed(2)} ms</p>
          <p className="text-[10px] text-gray-400">Go Gateway Memory State</p>
        </div>
      </div>

      {/* Main Control Grid: Matchmaking Ruleset Sliders & Regional Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Matchmaking Orchestration Sliders (7 Cols) */}
        <div className="lg:col-span-7 bg-black/90 border border-white/10 p-6 rounded-2xl space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-black italic uppercase text-white tracking-wide">
                Dynamic ELO & Queue Parameters
              </h3>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              Hot-Swappable in &lt;500ms
            </span>
          </div>

          {/* Parameter 1: Base Acceptable ELO Delta */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                Base Matchmaking ELO Delta
                <span className="text-[10px] text-gray-500 font-normal">(Initial match tier bracket)</span>
              </span>
              <span className="font-mono font-black text-amber-400 px-2 py-0.5 bg-amber-950/40 border border-amber-500/30 rounded">
                ±{baseEloDelta} ELO
              </span>
            </div>
            <input
              type="range"
              min={25}
              max={250}
              step={5}
              value={baseEloDelta}
              onChange={e => setBaseEloDelta(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>Strict (±25)</span>
              <span>Balanced (±75)</span>
              <span>Wide (±250)</span>
            </div>
          </div>

          {/* Parameter 2: Dynamic ELO Expansion Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                Queue Time ELO Expansion Rate
                <span className="text-[10px] text-gray-500 font-normal">(Expands bracket if wait &gt; target)</span>
              </span>
              <span className="font-mono font-black text-red-400 px-2 py-0.5 bg-red-950/40 border border-red-500/30 rounded">
                +{expansionRate} ELO / 5s
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={expansionRate}
              onChange={e => setExpansionRate(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>Gradual (+10/5s)</span>
              <span>Standard (+25/5s)</span>
              <span>Aggressive (+100/5s)</span>
            </div>
          </div>

          {/* Parameter 3: Max Queue Wait Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                Max Queue Duration Threshold
                <span className="text-[10px] text-gray-500 font-normal">(Triggers global cross-region pool)</span>
              </span>
              <span className="font-mono font-black text-blue-400 px-2 py-0.5 bg-blue-950/40 border border-blue-500/30 rounded">
                {maxWaitSec} Seconds
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={120}
              step={5}
              value={maxWaitSec}
              onChange={e => setMaxWaitSec(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>Fast Matches (15s)</span>
              <span>30s Target</span>
              <span>Tournament Pure (120s)</span>
            </div>
          </div>

          {/* Parameter 4: Network Latency / Rollback Tolerance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 flex items-center gap-1.5">
                Max Allowed Rollback Ping Cutoff
                <span className="text-[10px] text-gray-500 font-normal">(GGPO deterministic netcode budget)</span>
              </span>
              <span className="font-mono font-black text-emerald-400 px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/30 rounded">
                &lt; {maxPingCutoff} ms
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={150}
              step={5}
              value={maxPingCutoff}
              onChange={e => setMaxPingCutoff(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>LAN Quality (&lt;30ms)</span>
              <span>Standard (&lt;65ms)</span>
              <span>Intercontinental (&lt;150ms)</span>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
              <span className="text-xs font-bold text-gray-300">Cross-Region Fallback</span>
              <input
                type="checkbox"
                checked={crossRegionFallback}
                onChange={e => setCrossRegionFallback(e.target.checked)}
                className="w-4 h-4 accent-red-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
              <span className="text-xs font-bold text-gray-300">Biometric Harvest Sync</span>
              <input
                type="checkbox"
                checked={biometricHarvestActive}
                onChange={e => setBiometricHarvestActive(e.target.checked)}
                className="w-4 h-4 accent-purple-500 rounded"
              />
            </label>
          </div>
        </div>

        {/* Right Column: Regional Matrix & Biometric Sync Meter (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Regional Server Pools */}
          <div className="bg-black/90 border border-white/10 p-5 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-black italic uppercase text-white">
                  Regional Pool Health
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">ALL NODES HEALTHY</span>
            </div>

            <div className="space-y-2.5">
              {regions.map(reg => (
                <div
                  key={reg.id}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{reg.name}</span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                          reg.status === 'OPTIMAL'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/40'
                            : reg.status === 'CONGESTED'
                            ? 'bg-amber-950 text-amber-400 border border-amber-600/40'
                            : 'bg-blue-950 text-blue-400 border border-blue-600/40'
                        }`}
                      >
                        {reg.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {reg.activePlayers.toLocaleString()} active players • {reg.pingMs}ms avg ping
                    </p>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-sm font-black text-amber-400">{reg.avgWaitSec}s</span>
                    <p className="text-[9px] text-gray-500">Wait Time</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Narrative Biometric Extraction Meter */}
          <div className="bg-gradient-to-br from-purple-950/40 via-stone-900 to-black border border-purple-500/30 p-5 rounded-2xl space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" />
                Aether Core Biometric Sync Meter
              </span>
              <span className="text-xs font-mono font-black text-purple-300">{biometricSyncPercent}% SYNCED</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Harvests live combat telemetry from tournament arcade matches to calibrate adaptive AI models for Cassian’s Unit-0 android army.
            </p>
            {/* Meter Bar */}
            <div className="w-full h-3 bg-zinc-950 rounded-full border border-purple-500/40 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-amber-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                style={{ width: `${biometricSyncPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 font-mono">
              <span>Phase 1: Human Baseline</span>
              <span>Phase 2: Adaptive AI</span>
              <span>Phase 3: Clone Army (Dark Ending)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Go Gateway & PostgreSQL Transaction Logs */}
      <div className="bg-black/95 border border-white/10 p-5 rounded-2xl space-y-3 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-black italic uppercase text-white">
              Real-Time Server Node & Audit Stream
            </h3>
          </div>
          <span className="text-[10px] font-mono text-gray-500">PostgreSQL v16 ACID Logs</span>
        </div>

        <div className="font-mono text-xs space-y-1.5 max-h-40 overflow-y-auto pr-2">
          {recentLogs.map((log, index) => (
            <div key={index} className="p-2 bg-white/5 border border-white/5 rounded text-gray-300 flex items-start gap-2">
              <span className="text-red-400 select-none">&gt;</span>
              <span className="leading-relaxed">{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
