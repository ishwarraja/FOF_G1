import React, { useState, useEffect } from 'react';
import { driveService, SyncReport, DriveFileItem, DriveAuthUser } from '../../services/driveService';
import { soundFX } from '../../utils/audio';
import {
  Cloud,
  FolderSync,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Download,
  RefreshCw,
  FileCode,
  FileText,
  Layers,
  Key,
  ShieldCheck,
  FolderCheck,
} from 'lucide-react';

interface FofDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FofDriveSyncModal: React.FC<FofDriveSyncModalProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState<boolean>(driveService.isConnected());
  const [, setCurrentUser] = useState<DriveAuthUser | null>(driveService.getStoredUser());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ filename: string; current: number; total: number } | null>(null);
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [folderFiles, setFolderFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [customToken, setCustomToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && isConnected) {
      loadDriveFolderFiles();
    }
  }, [isOpen, isConnected]);

  const loadDriveFolderFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const folder = await driveService.getOrCreateFolder('FOF');
      const files = await driveService.listFilesInFolder(folder.id);
      setFolderFiles(files);
    } catch (err: any) {
      console.warn('Failed to load folder files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleConnectGoogle = async () => {
    soundFX.playClick();
    setStatusMessage({ type: 'info', text: 'Opening Google Sign-In authorization...' });
    try {
      const token = await driveService.requestDriveAccess();
      if (token) {
        setIsConnected(true);
        setCurrentUser(driveService.getStoredUser());
        setStatusMessage({ type: 'success', text: 'Google Drive connected successfully!' });
        soundFX.playVictoryFanfare();
        loadDriveFolderFiles();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to authenticate Google Drive. You can also paste an OAuth Access Token manually below.',
      });
      setShowTokenInput(true);
    }
  };

  const handleApplyCustomToken = async () => {
    if (!customToken.trim()) return;
    soundFX.playClick();
    driveService.setAccessToken(customToken.trim());
    setIsConnected(true);
    setStatusMessage({ type: 'success', text: 'Access token applied successfully!' });
    soundFX.playReadyFight();
    loadDriveFolderFiles();
  };

  const handleDisconnect = () => {
    soundFX.playClick();
    driveService.disconnect();
    setIsConnected(false);
    setCurrentUser(null);
    setSyncReport(null);
    setFolderFiles([]);
    setStatusMessage({ type: 'info', text: 'Google Drive disconnected.' });
  };

  const handleSyncToFOFFolder = async () => {
    if (!isConnected) {
      handleConnectGoogle();
      return;
    }

    soundFX.playClick();
    setIsSyncing(true);
    setSyncProgress(null);
    setStatusMessage(null);

    try {
      const report = await driveService.syncAllFOFCodeToDrive('FOF', (filename, current, total) => {
        setSyncProgress({ filename, current, total });
      });

      setSyncReport(report);
      setStatusMessage({
        type: 'success',
        text: `Successfully synced ${report.filesUpdated.length} files to Google Drive folder 'FOF'!`,
      });
      soundFX.playVictoryFanfare();
      loadDriveFolderFiles();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error occurred while updating code in Google Drive FOF folder.',
      });
      soundFX.playDefeat();
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleDownloadLocalBackup = () => {
    soundFX.playClick();
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            app: 'Fate of Fighters: The Shattered Convergence',
            exportedAt: new Date().toISOString(),
            rosterDocs: 'FOF_Character_Roster_v0.1.md',
            storyDocs: 'FOF_Story_Campaign_Acts_v0.1.md',
            note: 'Local backup mirror of the FOF Google Drive Code Vault',
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `FOF_Code_Backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setStatusMessage({ type: 'success', text: 'Local FOF backup file downloaded to your device!' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono animate-fade-in">
      <div className="bg-black/95 border-2 border-red-600/60 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            soundFX.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/10 hover:border-red-500 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-red-600 flex items-center justify-center shadow-lg shadow-blue-600/40 shrink-0">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">
              WORKSPACE & GOOGLE DRIVE VAULT
            </span>
            <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white tracking-tight">
              SYNC CODE IN 'FOF' FOLDER
            </h3>
            <p className="text-xs text-gray-400">
              Synchronize the latest character rosters, story acts, 2D engine core, and source files into your Google Drive <span className="text-yellow-400 font-bold">'FOF'</span> directory.
            </p>
          </div>
        </div>

        {/* Connection Status Box */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 uppercase font-bold">STATUS:</span>
              {isConnected ? (
                <span className="px-2.5 py-0.5 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> CONNECTED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-950/80 border border-amber-500/60 text-amber-300 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> NOT CONNECTED
                </span>
              )}
            </div>

            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="text-[10px] text-gray-400 hover:text-red-400 underline cursor-pointer"
              >
                Disconnect Account
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-black/60 rounded-xl border border-white/5">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Target Drive Folder</span>
              <span className="text-yellow-400 font-bold flex items-center gap-1">
                <FolderCheck className="w-3.5 h-3.5 text-yellow-500" /> /FOF
              </span>
            </div>
            <div className="p-2.5 bg-black/60 rounded-xl border border-white/5">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Target Scope</span>
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> drive.file + drive
              </span>
            </div>
          </div>
        </div>

        {/* Notifications & Status alerts */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-500/60 text-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-red-950/70 border border-red-500/60 text-red-200'
                : 'bg-blue-950/70 border border-blue-500/60 text-blue-200'
            }`}
          >
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
            {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 animate-spin" />}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {/* Live Sync Progress Bar */}
        {isSyncing && syncProgress && (
          <div className="bg-red-950/30 border border-red-800/50 p-4 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-red-400 animate-spin" />
                Syncing: {syncProgress.filename}
              </span>
              <span className="text-red-400">
                {syncProgress.current} / {syncProgress.total}
              </span>
            </div>
            <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-red-600 to-yellow-400 h-2 transition-all duration-300"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSyncToFOFFolder}
            disabled={isSyncing}
            className="w-full py-4 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 hover:from-red-500 hover:to-yellow-400 text-black font-black italic uppercase tracking-wider text-sm rounded-2xl shadow-xl shadow-red-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                UPDATING GOOGLE DRIVE 'FOF' FOLDER...
              </>
            ) : (
              <>
                <FolderSync className="w-5 h-5" />
                {isConnected ? "UPDATE CODE IN GOOGLE DRIVE 'FOF' FOLDER" : "CONNECT & UPDATE CODE IN GOOGLE DRIVE 'FOF'"}
              </>
            )}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              onClick={handleDownloadLocalBackup}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/30 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Local JSON Backup
            </button>

            <button
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="text-xs text-gray-500 hover:text-gray-300 underline cursor-pointer"
            >
              {showTokenInput ? 'Hide Manual OAuth Token' : 'Manual OAuth Token Input'}
            </button>
          </div>
        </div>

        {/* Manual OAuth Token Input (if GIS popup is blocked) */}
        {showTokenInput && (
          <div className="p-4 bg-black border border-white/10 rounded-2xl space-y-3">
            <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-yellow-400" /> Manual Google OAuth Access Token
            </span>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="ya29.a0AfH6SM..."
                value={customToken}
                onChange={e => setCustomToken(e.target.value)}
                className="flex-1 bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleApplyCustomToken}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Sync Report List */}
        {syncReport && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-yellow-400 uppercase">
                // UPDATED FILES IN GOOGLE DRIVE (/FOF)
              </span>
              <span className="text-[10px] text-gray-400">
                Total: {(syncReport.totalBytes / 1024).toFixed(1)} KB
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {syncReport.filesUpdated.map((file, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-black/60 border border-white/5 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    {file.name.endsWith('.md') ? (
                      <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : file.name.endsWith('.json') ? (
                      <Layers className="w-4 h-4 text-yellow-400 shrink-0" />
                    ) : (
                      <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span className="font-bold text-white truncate">{file.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        file.status === 'created'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-blue-950 text-blue-300'
                      }`}
                    >
                      {file.status}
                    </span>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-white"
                        title="View in Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Files inside Google Drive /FOF folder */}
        {isConnected && !syncReport && folderFiles.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-gray-300 uppercase">
                // CURRENT FILES IN DRIVE (/FOF) ({folderFiles.length})
              </span>
              <button
                onClick={loadDriveFolderFiles}
                disabled={isLoadingFiles}
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {folderFiles.map(f => (
                <div
                  key={f.id}
                  className="p-2 bg-black/60 border border-white/5 rounded-xl flex items-center justify-between text-xs"
                >
                  <span className="text-white font-mono truncate mr-2">{f.name}</span>
                  {f.webViewLink && (
                    <a
                      href={f.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px]"
                    >
                      Open <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
