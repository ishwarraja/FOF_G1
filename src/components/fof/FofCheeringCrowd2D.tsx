import React, { useMemo } from 'react';

interface FofCheeringCrowd2DProps {
  isExcited?: boolean;
  comboHits?: number;
}

interface Spectator2D {
  id: number;
  leftPercent: number;
  shirtColor: string;
  hairColor: string;
  skinTone: string;
  cheerType: 'fist' | 'both_hands' | 'flag' | 'clap' | 'jump';
  delay: number;
  scale: number;
  hasTurban?: boolean;
  hasCamera?: boolean;
}

export const FofCheeringCrowd2D: React.FC<FofCheeringCrowd2DProps> = ({
  isExcited = false,
  comboHits = 0,
}) => {
  const isHyped = isExcited || comboHits > 5;

  // Generate 16 distinct human spectators along the arena barrier
  const spectators = useMemo<Spectator2D[]>(() => {
    const shirtColors = [
      '#ef4444', // Red
      '#f59e0b', // Saffron
      '#10b981', // Emerald
      '#06b6d4', // Cyan
      '#8b5cf6', // Purple
      '#f97316', // Orange
      '#ec4899', // Pink
      '#f8fafc', // White
      '#3b82f6', // Blue
      '#d97706', // Gold
      '#059669', // Teal
      '#6366f1', // Indigo
    ];

    const skinTones = ['#e0ac69', '#c68642', '#8d5524', '#f1c27d', '#ffdbac'];
    const hairColors = ['#171717', '#292524', '#44403c', '#ffffff'];

    const types: ('fist' | 'both_hands' | 'flag' | 'clap' | 'jump')[] = [
      'fist',
      'both_hands',
      'flag',
      'jump',
      'clap',
      'fist',
      'jump',
      'both_hands',
      'flag',
      'clap',
    ];

    const specs: Spectator2D[] = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const leftPercent = 3 + (i / (count - 1)) * 94 + (Math.sin(i * 3) * 1.5);
      specs.push({
        id: i,
        leftPercent,
        shirtColor: shirtColors[i % shirtColors.length],
        skinTone: skinTones[i % skinTones.length],
        hairColor: hairColors[i % hairColors.length],
        cheerType: types[i % types.length],
        delay: (i * 0.18) % 1.2,
        scale: 0.88 + (i % 3) * 0.08,
        hasTurban: i % 3 === 0,
        hasCamera: i === 3 || i === 11,
      });
    }
    return specs;
  }, []);

  return (
    <div className="absolute inset-x-0 bottom-16 h-36 pointer-events-none z-10 overflow-hidden select-none">
      {/* 1. Moving Atmospheric Cloud Bands in Midground Sky */}
      <div className="absolute -top-12 inset-x-0 h-16 pointer-events-none opacity-40 overflow-hidden">
        <div className="flex w-[200%] animate-clouds-move">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent blur-md" />
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent blur-md" />
        </div>
      </div>

      {/* 2. Cheering Spectators Row */}
      <div className="absolute inset-x-0 bottom-4 h-28 flex items-end">
        {spectators.map(spec => (
          <div
            key={spec.id}
            className={`absolute bottom-0 flex flex-col items-center origin-bottom transition-transform duration-300 ${
              isHyped ? 'animate-crowd-jump-fast' : 'animate-crowd-cheer'
            }`}
            style={{
              left: `${spec.leftPercent}%`,
              transform: `scale(${spec.scale})`,
              animationDelay: `${spec.delay}s`,
              animationDuration: isHyped ? '0.45s' : '0.85s',
            }}
          >
            {/* Camera Flash effect */}
            {spec.hasCamera && (
              <div
                className={`absolute -top-6 -right-2 w-6 h-6 rounded-full bg-white blur-[2px] pointer-events-none ${
                  isHyped ? 'animate-ping' : 'animate-pulse'
                }`}
                style={{ animationDuration: '0.8s' }}
              />
            )}

            {/* Arms / Cheer Gesture */}
            <div className="relative w-12 h-8 flex justify-center items-center">
              {spec.cheerType === 'fist' && (
                <>
                  {/* Left resting arm */}
                  <div
                    className="absolute -left-1 bottom-1 w-2.5 h-6 rounded-full -rotate-12"
                    style={{ backgroundColor: spec.shirtColor }}
                  />
                  {/* Right arm pumping fist */}
                  <div
                    className="absolute -right-2 bottom-2 w-3 h-8 rounded-full rotate-12 flex flex-col items-center justify-start origin-bottom animate-bounce"
                    style={{ backgroundColor: spec.shirtColor, animationDuration: '0.4s' }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/30"
                      style={{ backgroundColor: spec.skinTone }}
                    />
                  </div>
                </>
              )}

              {spec.cheerType === 'both_hands' && (
                <>
                  {/* Dual raised cheering arms */}
                  <div
                    className="absolute -left-2.5 bottom-2 w-2.5 h-8 rounded-full -rotate-25 origin-bottom animate-pulse"
                    style={{ backgroundColor: spec.shirtColor }}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-black/30"
                      style={{ backgroundColor: spec.skinTone }}
                    />
                  </div>
                  <div
                    className="absolute -right-2.5 bottom-2 w-2.5 h-8 rounded-full rotate-25 origin-bottom animate-pulse"
                    style={{ backgroundColor: spec.shirtColor }}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-black/30"
                      style={{ backgroundColor: spec.skinTone }}
                    />
                  </div>
                </>
              )}

              {spec.cheerType === 'flag' && (
                <>
                  {/* Waving flag banner */}
                  <div className="absolute -right-4 bottom-2 flex flex-col items-center origin-bottom animate-flag-wave">
                    {/* Pole */}
                    <div className="w-1 h-12 bg-gray-300 rounded" />
                    {/* Fabric flag */}
                    <div
                      className="absolute top-0 left-1 px-1.5 py-0.5 rounded-r shadow text-[7px] font-black text-white italic uppercase tracking-wider"
                      style={{
                        backgroundColor: spec.id % 2 === 0 ? '#ef4444' : '#f59e0b',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                      }}
                    >
                      SF6
                    </div>
                  </div>
                  <div
                    className="absolute -left-1 bottom-1 w-2.5 h-6 rounded-full -rotate-12"
                    style={{ backgroundColor: spec.shirtColor }}
                  />
                </>
              )}

              {spec.cheerType === 'clap' && (
                <div className="flex items-center gap-0.5 animate-pulse">
                  <div
                    className="w-2.5 h-6 rounded-full rotate-25"
                    style={{ backgroundColor: spec.shirtColor }}
                  />
                  <div
                    className="w-3 h-3 rounded-full border border-black/30"
                    style={{ backgroundColor: spec.skinTone }}
                  />
                  <div
                    className="w-2.5 h-6 rounded-full -rotate-25"
                    style={{ backgroundColor: spec.shirtColor }}
                  />
                </div>
              )}

              {spec.cheerType === 'jump' && (
                <>
                  <div
                    className="absolute -left-2 bottom-3 w-2.5 h-8 rounded-full -rotate-30 origin-bottom"
                    style={{ backgroundColor: spec.shirtColor }}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-black/30"
                      style={{ backgroundColor: spec.skinTone }}
                    />
                  </div>
                  <div
                    className="absolute -right-2 bottom-3 w-2.5 h-8 rounded-full rotate-30 origin-bottom"
                    style={{ backgroundColor: spec.shirtColor }}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-black/30"
                      style={{ backgroundColor: spec.skinTone }}
                    />
                  </div>
                </>
              )}

              {/* Head / Face */}
              <div
                className="relative w-6 h-6 rounded-full shadow-md border border-black/20 z-10 flex flex-col items-center justify-center overflow-visible"
                style={{ backgroundColor: spec.skinTone }}
              >
                {/* Hair or Turban */}
                {spec.hasTurban ? (
                  <div
                    className="absolute -top-2 w-7 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: spec.id % 2 === 0 ? '#f59e0b' : '#ef4444' }}
                  />
                ) : (
                  <div
                    className="absolute -top-1 w-6 h-3 rounded-t-full"
                    style={{ backgroundColor: spec.hairColor }}
                  />
                )}
                {/* Cheering open mouth */}
                <div className="w-2 h-1.5 bg-red-950 rounded-full mt-1.5" />
              </div>
            </div>

            {/* Torso / Shirt */}
            <div
              className="w-8 h-9 rounded-t-md shadow-lg border-t border-white/20 relative"
              style={{ backgroundColor: spec.shirtColor }}
            >
              {/* Vest / Collar stripe */}
              <div className="absolute inset-x-2.5 top-0 bottom-0 bg-black/15" />
            </div>

            {/* Lower body / Legs */}
            <div className="flex gap-1 w-7 h-5">
              <div className="w-3 h-full bg-slate-800 rounded-b" />
              <div className="w-3 h-full bg-slate-800 rounded-b" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Perimeter Railing & Bunting Pennants */}
      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-slate-900 to-slate-800 border-t-2 border-slate-600 shadow-xl flex items-center justify-around">
        {/* Railing Vertical Posts */}
        {[...Array(14)].map((_, i) => (
          <div key={i} className="relative flex flex-col items-center">
            <div className="w-1.5 h-6 -mt-3 bg-gradient-to-b from-slate-400 via-slate-600 to-slate-900 rounded-sm shadow" />
            {/* Triangular Bunting Pennant */}
            {i % 2 === 0 && (
              <div
                className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] -mt-1 shadow"
                style={{
                  borderTopColor: ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'][i % 5],
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
