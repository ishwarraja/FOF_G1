import React from 'react';

interface FofSuperArtGaugeProps {
  isPlayer1: boolean;
  superMeter: number;
  maxMeter: number;
  meterStocks: number;
  accentColor?: string;
  fighterName: string;
}

export const FofSuperArtGauge: React.FC<FofSuperArtGaugeProps> = ({
  isPlayer1,
  superMeter,
  maxMeter,
  meterStocks,
  accentColor = '#ef4444',
  fighterName,
}) => {
  // Meter level 0 to 3
  const level = Math.min(3, Math.max(0, meterStocks));
  const subMeterProgress = Math.max(0, Math.min(100, (superMeter / maxMeter) * 100));
  const isMaxLevel = level >= 3;

  return (
    <div
      id={`sf6-super-art-gauge-${isPlayer1 ? 'p1' : 'p2'}`}
      className={`flex items-end gap-2 font-mono select-none pointer-events-none drop-shadow-2xl ${
        isPlayer1 ? 'flex-row' : 'flex-row-reverse'
      }`}
    >
      {/* Big SF6 Style Numeric Level Badge */}
      <div
        className={`relative flex items-center justify-center w-12 sm:w-14 h-12 sm:h-14 bg-black/95 border-2 transform ${
          isPlayer1 ? '-skew-x-12 border-pink-500' : 'skew-x-12 border-cyan-400'
        } shadow-2xl overflow-hidden`}
        style={{
          boxShadow: isMaxLevel
            ? '0 0 20px rgba(234, 179, 8, 0.9), inset 0 0 15px rgba(245, 158, 11, 0.5)'
            : isPlayer1
            ? '0 0 14px rgba(236, 72, 153, 0.6)'
            : '0 0 14px rgba(6, 182, 212, 0.6)',
        }}
      >
        {/* Background flash for max level */}
        {isMaxLevel && (
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/40 via-yellow-400/30 to-red-500/40 animate-pulse" />
        )}
        <div className="flex flex-col items-center justify-center z-10">
          <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-stone-400 leading-none">
            {isMaxLevel ? 'MAX' : 'LV'}
          </span>
          <span
            className={`text-2xl sm:text-3xl font-black italic leading-none ${
              isMaxLevel
                ? 'text-yellow-300 drop-shadow-[0_0_8px_#f59e0b]'
                : isPlayer1
                ? 'text-pink-400 drop-shadow-[0_0_6px_#ec4899]'
                : 'text-cyan-300 drop-shadow-[0_0_6px_#06b6d4]'
            }`}
          >
            {level}
          </span>
        </div>
      </div>

      {/* Super Art Gauge Slanted Meter Bars */}
      <div className={`flex flex-col gap-1 w-32 sm:w-44 ${isPlayer1 ? 'items-start' : 'items-end'}`}>
        <div className="flex items-center gap-1.5 w-full justify-between">
          <span
            className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${
              isMaxLevel ? 'text-yellow-300 animate-pulse' : 'text-stone-300'
            }`}
          >
            {isMaxLevel ? 'CRITICAL ART READY' : 'SUPER ART'}
          </span>
          <span className="text-[8px] font-bold text-stone-500">
            {meterStocks}/3
          </span>
        </div>

        {/* 3 Stock Segmented Energy Bar */}
        <div className="flex items-center gap-1 w-full">
          {[1, 2, 3].map((stockNum) => {
            const isFilled = meterStocks >= stockNum;
            const isCurrentStock = meterStocks === stockNum - 1;
            const currentStockPercent = isFilled ? 100 : isCurrentStock ? subMeterProgress : 0;

            return (
              <div
                key={stockNum}
                className={`flex-1 h-3 sm:h-3.5 bg-black/90 border border-stone-700 relative overflow-hidden transform ${
                  isPlayer1 ? '-skew-x-12' : 'skew-x-12'
                }`}
              >
                {/* Meter fill */}
                <div
                  className={`h-full transition-all duration-150 ${
                    isMaxLevel
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-300 to-red-500 animate-pulse'
                      : isPlayer1
                      ? 'bg-gradient-to-r from-pink-600 via-rose-500 to-amber-300'
                      : 'bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-200'
                  }`}
                  style={{ width: `${currentStockPercent}%` }}
                >
                  <div className="h-1/2 bg-white/30" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
