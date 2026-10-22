import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { 
  Cloud, 
  CloudRain, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileJson,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

export const DriveSyncModal: React.FC = () => {
  const { 
    profile, 
    isDriveModalOpen, 
    setIsDriveModalOpen, 
    syncToGoogleDrive, 
    loadFromGoogleDrive, 
    isDriveSyncing, 
    driveSyncStatus 
  } = useGame();

  const [localMessage, setLocalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isDriveModalOpen) return null;

  const handleSyncToDrive = async () => {
    soundFX.playClick();
    setLocalMessage(null);
    const success = await syncToGoogleDrive();
    if (success) {
      setLocalMessage({ type: 'success', text: 'Game progress successfully saved to your Google Drive cloud storage!' });
    } else {
      setLocalMessage({ type: 'error', text: driveSyncStatus.error || 'Failed to sync with Google Drive. Check permissions.' });
    }
  };

  const handleLoadFromDrive = async () => {
    soundFX.playClick();
    if (!window.confirm('Restore save file from Google Drive? This will overwrite your current unsaved session progress.')) {
      return;
    }
    setLocalMessage(null);
    const success = await loadFromGoogleDrive();
    if (success) {
      setLocalMessage({ type: 'success', text: 'Save file downloaded and loaded successfully from Google Drive!' });
    } else {
      setLocalMessage({ type: 'error', text: driveSyncStatus.error || 'Failed to download save from Google Drive.' });
    }
  };

  const handleExportJSON = () => {
    soundFX.playClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `FOF_Save_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setLocalMessage({ type: 'success', text: 'Local backup JSON file downloaded!' });
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.roster && parsed.formation) {
            localStorage.setItem('fate_of_fighters_player_profile_v1', JSON.stringify(parsed));
            window.location.reload();
          } else {
            setLocalMessage({ type: 'error', text: 'Invalid JSON save file format.' });
          }
        } catch {
          setLocalMessage({ type: 'error', text: 'Failed to read JSON file.' });
        }
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative">
        {/* Close Button */}
        <button
          onClick={() => {
            soundFX.playClick();
            setIsDriveModalOpen(false);
          }}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-cinzel font-bold text-xl text-white">Google Drive Cloud Vault</h3>
            <p className="text-xs text-slate-400">
              Synchronize your character builds, forge items, and campaign progress across devices.
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Cloud Storage Provider:</span>
            <span className="text-blue-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Google Drive (drive.file)
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Save File Target:</span>
            <span className="text-slate-200">Fate_Of_Fighters_Save_v0.1.json</span>
          </div>

          {driveSyncStatus.lastSynced && (
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400 pt-1 border-t border-slate-850">
              <span>Last Synced Time:</span>
              <span>{driveSyncStatus.lastSynced}</span>
            </div>
          )}
        </div>

        {/* Feedback Messages */}
        {localMessage && (
          <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2 ${
            localMessage.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border border-red-800 text-red-300'
          }`}>
            {localMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <span>{localMessage.text}</span>
          </div>
        )}

        {/* Google Drive Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleSyncToDrive}
            disabled={isDriveSyncing}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm font-cinzel flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition-all disabled:opacity-50"
          >
            <Upload className={`w-4 h-4 ${isDriveSyncing ? 'animate-spin' : ''}`} />
            <span>{isDriveSyncing ? 'Syncing...' : 'Save to Google Drive'}</span>
          </button>

          <button
            onClick={handleLoadFromDrive}
            disabled={isDriveSyncing}
            className="py-3 px-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-200 font-bold text-xs sm:text-sm font-cinzel flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Restore from Drive</span>
          </button>
        </div>

        {/* Local JSON Backup / Restore */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
            Manual Backup / File Transfer:
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportJSON}
              className="flex-1 py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>Export Save (.JSON)</span>
            </button>

            <label className="flex-1 py-2 px-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import Save (.JSON)</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
