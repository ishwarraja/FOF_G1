import React, { useState, useRef } from 'react';
import { LOCATION_PRESETS, LocationPreset, getStageVisual } from '../../data/stageBackgrounds';
import { soundFX } from '../../utils/audio';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Sun,
  Compass,
  Moon,
  Hourglass,
  Trees,
} from 'lucide-react';

interface FofLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStageId?: string;
  customBgUrl?: string;
  onSelectLocation: (stageId: string, customBgUrl?: string) => void;
}

export const FofLocationModal: React.FC<FofLocationModalProps> = ({
  isOpen,
  onClose,
  currentStageId,
  customBgUrl,
  onSelectLocation,
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: LocationPreset) => {
    soundFX.playClick();
    onSelectLocation(preset.stageId, preset.imageUrl);
    onClose();
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        soundFX.playSuperFlash();
        onSelectLocation(currentStageId || 'stage_kala_chakra_time', dataUrl);
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    soundFX.playClick();
    onSelectLocation(currentStageId || 'stage_kala_chakra_time', urlInput.trim());
    setUrlInput('');
    onClose();
  };

  const handleResetDefault = () => {
    soundFX.playClick();
    onSelectLocation(currentStageId || 'stage_kala_chakra_time', undefined);
    onClose();
  };

  const getPresetIcon = (id: string) => {
    switch (id) {
      case 'location1': return <Sun className="w-4 h-4 text-amber-400" />;
      case 'location2': return <Compass className="w-4 h-4 text-rose-400" />;
      case 'location3': return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'location4': return <Hourglass className="w-4 h-4 text-orange-400" />;
      case 'location5': return <Trees className="w-4 h-4 text-emerald-400" />;
      default: return <Sparkles className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div
      id="modal-location-backgrounds"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-stone-950 border-2 border-amber-500/70 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.4)] overflow-hidden flex flex-col font-mono text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-amber-950/80 to-stone-900 border-b border-amber-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-400 rounded-lg">
              <ImageIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wider flex items-center gap-2">
                STAGE BACKGROUND & LOCATIONS (.JPEG, .GIF, .PNG)
              </h2>
              <p className="text-xs text-amber-300/80 font-normal">
                Select from local .jpeg, animated .gif, and .png stages or upload your own picture file
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/60 hover:bg-red-950 border border-white/10 hover:border-red-500 text-gray-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Clear Directory Guide Callout */}
          <div className="p-3 bg-stone-900/90 border border-amber-500/40 rounded-xl flex items-start gap-3">
            <div className="p-1.5 bg-amber-500/20 border border-amber-400/60 rounded-md shrink-0 mt-0.5">
              <ImageIcon className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-300">
                📁 Image Storage Directory: <code className="bg-black/80 px-1.5 py-0.5 rounded text-amber-200 border border-amber-500/40">/public/stages/</code>
              </p>
              <p className="text-gray-300 text-[11px] leading-relaxed">
                Place your image files directly into the project's <code className="text-amber-200">public/stages/</code> directory (e.g. <code className="text-amber-200">public/stages/my_arena.png</code>, <code className="text-amber-200">.jpeg</code>, or animated <code className="text-amber-200">.gif</code>). They become instantly accessible at <code className="text-amber-200">/stages/my_arena.png</code> and render across both 2.5D and 2D arenas without leaving the screen.
              </p>
            </div>
          </div>

          {/* Custom File Upload Drag & Drop Zone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                UPLOAD ATTACHED LOCATION IMAGE (Location1.png - Location5.png)
              </span>
              {customBgUrl && (
                <button
                  onClick={handleResetDefault}
                  className="text-[11px] text-gray-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to Stage Default
                </button>
              )}
            </div>

            <div
              onDragOver={e => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 sm:p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center select-none ${
                dragOver
                  ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                  : 'border-amber-500/40 hover:border-amber-400 bg-black/40 hover:bg-stone-900/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <Upload className={`w-7 h-7 ${dragOver ? 'text-amber-400 animate-bounce' : 'text-gray-400'}`} />
              <div>
                <p className="text-xs font-bold text-gray-200">
                  Click to select or drag & drop <span className="text-amber-400 font-mono">Location1.png – Location5.png</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Directly renders in both 2.5D WebGL 3D Arena and 2D Retro modes
                </p>
              </div>
            </div>

            {/* Direct Image URL Form */}
            <form onSubmit={handleUrlSubmit} className="mt-2.5 flex gap-2">
              <input
                type="url"
                placeholder="Or paste image URL (https://...)"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-black/70 border border-stone-700 rounded-lg text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-black text-xs uppercase rounded-lg cursor-pointer transition-colors"
              >
                APPLY URL
              </button>
            </form>
          </div>

          {/* 5 Attached Location Presets */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                THE 5 ATTACHED LOCATIONS
              </span>
              <span className="text-[10px] text-gray-400">
                Click any location to activate
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LOCATION_PRESETS.map((loc, idx) => {
                const isSelected =
                  customBgUrl === loc.imageUrl ||
                  (!customBgUrl && currentStageId === loc.stageId);

                return (
                  <div
                    key={loc.id}
                    onClick={() => handleSelectPreset(loc)}
                    className={`group relative rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer flex flex-col ${
                      isSelected
                        ? 'border-amber-400 bg-stone-900 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                        : 'border-stone-800 hover:border-amber-500/60 bg-black/60 hover:bg-stone-900/80'
                    }`}
                  >
                    {/* Thumbnail Artwork Preview */}
                    <div className="relative h-28 w-full overflow-hidden">
                      <img
                        src={loc.imageUrl}
                        alt={loc.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90 group-hover:brightness-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-black/40" />

                      {/* Location Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 border border-white/20 text-[10px] font-black uppercase text-white shadow">
                        {getPresetIcon(loc.id)}
                        <span>{loc.id.toUpperCase()}</span>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase shadow animate-pulse">
                          <CheckCircle2 className="w-3 h-3" />
                          ACTIVE
                        </div>
                      )}
                    </div>

                    {/* Information */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-black uppercase text-white tracking-wide group-hover:text-amber-300 transition-colors">
                          {loc.name}
                        </h3>
                        <p className="text-[11px] font-bold text-amber-400 mt-0.5">
                          {loc.subtitle}
                        </p>
                        <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                          {loc.description}
                        </p>
                      </div>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleSelectPreset(loc);
                        }}
                        className={`mt-2.5 w-full py-1 px-2 text-[10px] font-black uppercase rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-black/60 hover:bg-amber-600 text-gray-300 hover:text-black border-stone-700 hover:border-amber-400'
                        }`}
                      >
                        {isSelected ? 'CURRENTLY ACTIVE' : 'USE THIS LOCATION'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-black/90 border-t border-stone-800 flex items-center justify-between text-[11px] text-gray-400">
          <span>Active: {customBgUrl ? 'Custom Image Location' : currentStageId}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white font-bold uppercase rounded-lg cursor-pointer transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
