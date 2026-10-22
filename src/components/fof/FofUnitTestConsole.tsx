import React, { useState, useEffect } from 'react';
import { runAllUnitTests, TestSuiteSummary } from '../../utils/unitTests';
import { soundFX } from '../../utils/audio';
import { CheckCircle2, XCircle, Terminal, RefreshCw } from 'lucide-react';

export const FofUnitTestConsole: React.FC = () => {
  const [suiteSummary, setSuiteSummary] = useState<TestSuiteSummary | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const executeSuite = () => {
    setIsRunning(true);
    soundFX.playClick();
    setTimeout(() => {
      const summary = runAllUnitTests();
      setSuiteSummary(summary);
      setIsRunning(false);
      if (summary.failed === 0) {
        soundFX.playVictoryFanfare();
      } else {
        soundFX.playDefeat();
      }
    }, 250);
  };

  useEffect(() => {
    executeSuite();
  }, []);

  const categories = ['ALL', 'ROSTER_DATA', 'SPECIAL_MOVES', 'MOTION_PARSER', 'COLLISION_ENGINE', 'ELEMENTAL_MATRIX', 'FOF_3V3_RULES', 'STORY_ACTS', 'AUDIO_SYNTHESIS'];

  const filteredResults = suiteSummary?.results.filter(r =>
    filterCategory === 'ALL' ? true : r.category === filterCategory
  ) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-mono">
      {/* Header & Status */}
      <div className="bg-black/90 border-2 border-red-600/40 p-6 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            ENGINE AUTOMATION & UNIT TEST CONSOLE
          </span>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase text-white tracking-tight">
            FOF SYSTEM INTEGRITY VALIDATOR
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Automated verification for Roster Specs, Move Command Parsers, 3v3 Rules, Elemental Matrix & Story Arcs.
          </p>
        </div>

        <button
          onClick={executeSuite}
          disabled={isRunning}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black italic uppercase text-xs rounded-xl shadow-lg shadow-red-600/30 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'RUNNING TEST SUITE...' : 'RUN ALL UNIT TESTS'}
        </button>
      </div>

      {/* Summary Scorecard */}
      {suiteSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">TOTAL TEST CASES</span>
            <span className="text-2xl font-black text-white">{suiteSummary.total}</span>
          </div>

          <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">PASSED TESTS</span>
            <span className="text-2xl font-black text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" /> {suiteSummary.passed}
            </span>
          </div>

          <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-xl">
            <span className="text-[10px] text-red-400 uppercase font-bold block">FAILED TESTS</span>
            <span className="text-2xl font-black text-red-400 flex items-center gap-2">
              <XCircle className="w-6 h-6" /> {suiteSummary.failed}
            </span>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">TOTAL EXECUTION TIME</span>
            <span className="text-2xl font-black text-yellow-400">{suiteSummary.durationMs} ms</span>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border uppercase transition-all cursor-pointer ${
              filterCategory === cat
                ? 'border-red-500 bg-red-600 text-white shadow'
                : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Test Results Table */}
      <div className="bg-black/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300 uppercase">
            UNIT TEST RUNNER LOGS ({filteredResults.length} / {suiteSummary?.total || 0})
          </span>
          <span className="text-[10px] text-emerald-400 font-bold">100% SUITE PASS REQUIRED</span>
        </div>

        <div className="divide-y divide-white/5">
          {filteredResults.map(res => (
            <div key={res.id} className="p-4 hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                {res.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black italic uppercase text-white">
                      {res.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-white/10 text-gray-400 rounded font-mono">
                      {res.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed font-mono">
                    {res.details}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className="text-[10px] text-gray-500 font-mono">
                  {res.durationMs}ms
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                  res.passed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
                }`}>
                  {res.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
