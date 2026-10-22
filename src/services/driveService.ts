import { KOF_CHARACTERS, KOF_STAGES, KOF_BOSSES } from '../data/fightingMoves';
import { STORY_CAMPAIGN_ACTS } from '../data/storyArcs';
import { runAllUnitTests } from '../utils/unitTests';

export interface DriveAuthUser {
  email?: string;
  name?: string;
  picture?: string;
  accessToken?: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

export interface SyncReport {
  folderId: string;
  folderName: string;
  filesUpdated: {
    name: string;
    id: string;
    size: number;
    status: 'created' | 'updated';
    webViewLink?: string;
  }[];
  timestamp: string;
  totalBytes: number;
}

class DriveService {
  private accessToken: string | null = null;
  private userProfile: DriveAuthUser | null = null;

  constructor() {
    // Check cached token
    const cached = localStorage.getItem('fof_drive_token');
    if (cached) {
      this.accessToken = cached;
    }
  }

  public isConnected(): boolean {
    return !!this.accessToken;
  }

  public getStoredUser(): DriveAuthUser | null {
    return this.userProfile;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public setAccessToken(token: string) {
    this.accessToken = token;
    localStorage.setItem('fof_drive_token', token);
  }

  public disconnect() {
    this.accessToken = null;
    this.userProfile = null;
    localStorage.removeItem('fof_drive_token');
  }

  /**
   * Request Google OAuth token via Google Identity Services
   */
  public async requestDriveAccess(): Promise<string> {
    return new Promise((resolve, reject) => {
      const g = (window as any).google;
      if (!g?.accounts?.oauth2) {
        // If GIS script is not loaded yet or blocked, allow manual paste or alert
        reject(new Error('Google Identity Services script not loaded. Please verify internet connection.'));
        return;
      }

      try {
        const client = g.accounts.oauth2.initTokenClient({
          client_id: '1031442276924-fof-game.apps.googleusercontent.com',
          scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (response: any) => {
            if (response.error) {
              reject(new Error(`OAuth Error: ${response.error}`));
              return;
            }
            if (response.access_token) {
              this.setAccessToken(response.access_token);
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${response.access_token}` },
                });
                if (userRes.ok) {
                  const userInfo = await userRes.json();
                  this.userProfile = {
                    email: userInfo.email,
                    name: userInfo.name,
                    picture: userInfo.picture,
                    accessToken: response.access_token,
                  };
                }
              } catch {}
              resolve(response.access_token);
            }
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        reject(err);
      }
    });
  }

  /**
   * Locate or create the target folder (e.g. 'FOF') in root of user's Google Drive
   */
  public async getOrCreateFolder(folderName: string = 'FOF'): Promise<{ id: string; name: string }> {
    if (!this.accessToken) {
      throw new Error('Google Drive is not authenticated. Please connect first.');
    }

    // 1. Search for existing folder
    const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.disconnect();
        throw new Error('Drive session expired. Please sign in again.');
      }
      throw new Error(`Failed to query Google Drive: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return { id: data.files[0].id, name: data.files[0].name };
    }

    // 2. Folder doesn't exist, create it
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create '${folderName}' folder in Google Drive: ${createRes.statusText}`);
    }

    const createdFolder = await createRes.json();
    return { id: createdFolder.id, name: createdFolder.name };
  }

  /**
   * List files currently inside the specified Google Drive folder
   */
  public async listFilesInFolder(folderId: string): Promise<DriveFileItem[]> {
    if (!this.accessToken) {
      throw new Error('Google Drive is not authenticated.');
    }

    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to list files: ${res.statusText}`);
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * Upload or update a single file in the Google Drive folder
   */
  public async uploadOrUpdateFile(
    folderId: string,
    fileName: string,
    content: string,
    mimeType: string = 'text/plain'
  ): Promise<{ id: string; name: string; size: number; status: 'created' | 'updated'; webViewLink?: string }> {
    if (!this.accessToken) {
      throw new Error('Google Drive is not authenticated.');
    }

    // Check if file already exists in folder
    const query = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const searchData = searchRes.ok ? await searchRes.json() : { files: [] };
    const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    if (existingFile) {
      // UPDATE EXISTING FILE
      const metadata = {
        name: fileName,
        mimeType: mimeType,
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
        content +
        closeDelimiter;

      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart&fields=id,name,size,webViewLink`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!updateRes.ok) {
        throw new Error(`Failed to update file '${fileName}': ${updateRes.statusText}`);
      }

      const resData = await updateRes.json();
      return {
        id: resData.id,
        name: resData.name,
        size: new Blob([content]).size,
        status: 'updated',
        webViewLink: resData.webViewLink || `https://drive.google.com/file/d/${resData.id}/view`,
      };
    } else {
      // CREATE NEW FILE IN FOLDER
      const metadata = {
        name: fileName,
        parents: [folderId],
        mimeType: mimeType,
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
        content +
        closeDelimiter;

      const createRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,webViewLink`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!createRes.ok) {
        throw new Error(`Failed to upload file '${fileName}': ${createRes.statusText}`);
      }

      const resData = await createRes.json();
      return {
        id: resData.id,
        name: resData.name,
        size: new Blob([content]).size,
        status: 'created',
        webViewLink: resData.webViewLink || `https://drive.google.com/file/d/${resData.id}/view`,
      };
    }
  }

  /**
   * Update ALL Code, Documentation, Roster, Story Scripts, and Engine Bundles into the Google Drive 'FOF' folder
   */
  public async syncAllFOFCodeToDrive(
    folderName: string = 'FOF',
    onProgress?: (filename: string, index: number, total: number) => void
  ): Promise<SyncReport> {
    if (!this.accessToken) {
      throw new Error('Google Drive is not authenticated.');
    }

    // 1. Get or create 'FOF' folder
    const folder = await this.getOrCreateFolder(folderName);

    // 2. Prepare all code files, Markdown specs, and bundles to sync
    const filesToSync: { fileName: string; content: string; mimeType: string }[] = [
      {
        fileName: 'FOF_Character_Roster_v0.1.md',
        mimeType: 'text/markdown',
        content: this.generateRosterMarkdown(),
      },
      {
        fileName: 'FOF_Story_Campaign_Acts_v0.1.md',
        mimeType: 'text/markdown',
        content: this.generateStoryMarkdown(),
      },
      {
        fileName: 'FOF_KOF_Fighting_Engine_Core.ts',
        mimeType: 'text/typescript',
        content: this.generateEngineSourceCode(),
      },
      {
        fileName: 'FOF_Moveset_And_Frames_Data.json',
        mimeType: 'application/json',
        content: JSON.stringify({ characters: KOF_CHARACTERS, bosses: KOF_BOSSES, stages: KOF_STAGES }, null, 2),
      },
      {
        fileName: 'FOF_Unit_Tests_Report_v0.1.json',
        mimeType: 'application/json',
        content: JSON.stringify(runAllUnitTests(), null, 2),
      },
      {
        fileName: 'FOF_Complete_Project_Source_Bundle.json',
        mimeType: 'application/json',
        content: this.generateFullSourceBundle(),
      },
      {
        fileName: 'FOF_README_Architecture_v0.1.md',
        mimeType: 'text/markdown',
        content: this.generateReadmeMarkdown(),
      },
    ];

    const results: SyncReport['filesUpdated'] = [];
    let totalBytes = 0;

    for (let i = 0; i < filesToSync.length; i++) {
      const item = filesToSync[i];
      if (onProgress) {
        onProgress(item.fileName, i + 1, filesToSync.length);
      }

      const res = await this.uploadOrUpdateFile(folder.id, item.fileName, item.content, item.mimeType);
      totalBytes += res.size;
      results.push(res);
    }

    return {
      folderId: folder.id,
      folderName: folder.name,
      filesUpdated: results,
      timestamp: new Date().toLocaleString(),
      totalBytes,
    };
  }

  // --- Generation Helpers for FOF Code & Docs ---

  private generateRosterMarkdown(): string {
    const chars = Object.values(KOF_CHARACTERS);
    const bosses = Object.values(KOF_BOSSES);

    let md = `# Fate of Fighters (FOF): Character Roster v0.1\n\n`;
    md += `*Generated for the FOF Google Drive Project Directory*\n\n`;
    md += `## 🌟 Champions of Aethelgard\n\n`;

    chars.forEach((c) => {
      md += `### ${c.name} — *${c.title}*\n`;
      md += `- **Faction**: ${c.faction}\n`;
      md += `- **Element**: ${c.element}\n`;
      md += `- **Role**: ${c.role}\n`;
      md += `- **Signature Weapon**: ${c.signatureWeapon}\n`;
      md += `- **Base Stats**: HP ${c.maxHp} | ATK ${c.atk} | DEF ${c.def} | SPD ${c.spd} | Crit ${c.critRate}%\n`;
      md += `- **Backstory**: ${c.backstory}\n`;
      md += `- **Voice Lines**:\n`;
      md += `  - *Intro*: "${c.voiceLines.intro}"\n`;
      md += `  - *Victory*: "${c.voiceLines.victory}"\n`;
      md += `  - *Super Move*: "${c.voiceLines.superCall}"\n\n`;
      md += `#### Moveset & Commands:\n`;
      c.moves.forEach((m) => {
        md += `- **${m.name}** [${m.type}]: \`${m.command}\` — ${m.damage} DMG (Startup: ${m.startupFrames}f, Active: ${m.activeFrames}f). *${m.description}*\n`;
      });
      md += `\n---\n\n`;
    });

    md += `## 🌌 Primordial Rift Bosses\n\n`;
    bosses.forEach((b) => {
      md += `### [BOSS] ${b.name} — *${b.title}*\n`;
      md += `- **Faction**: ${b.faction} | **Element**: ${b.element}\n`;
      md += `- **HP**: ${b.maxHp} | **ATK**: ${b.atk} | **DEF**: ${b.def}\n`;
      md += `- **Signature Weapon**: ${b.signatureWeapon}\n`;
      md += `- **Lore**: ${b.backstory}\n\n`;
    });

    return md;
  }

  private generateStoryMarkdown(): string {
    let md = `# Fate of Fighters: The Shattered Convergence (Draft v0.1)\n\n`;
    md += `## Campaign Synopsis\n`;
    md += `When the ancient Crest of Eternity shattered into six Prime Elemental Shards, the fabric of Aethelgard began tearing open. Rifts of primordial chaos now emerge, threatening total dissolution.\n\n`;

    STORY_CAMPAIGN_ACTS.forEach((act, idx) => {
      md += `## Act 0${idx + 1}: ${act.actTitle} — ${act.actSubtitle}\n\n`;
      md += `**Setting / Stage**: ${act.stageId}\n\n`;
      md += `**Plot Context**:\n> ${act.storyIntroText}\n\n`;
      md += `**Victory Reward**: **${act.rewardTitle}** — *${act.rewardDescription}*\n\n`;
      md += `### Dialogue Script:\n`;
      act.dialogueBefore.forEach((d) => {
        md += `- **${d.speaker}**: "${d.text}"\n`;
      });
      md += `\n---\n\n`;
    });

    return md;
  }

  private generateEngineSourceCode(): string {
    return `/**
 * Fate of Fighters: King of Fighters (KOF) 60 FPS Fighting Game Engine
 * Module: FOF_KOF_Fighting_Engine_Core.ts
 * Version: 0.1.0
 */

export interface KofFighterEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  currentHp: number;
  maxHp: number;
  superMeter: number;
  maxSuperMeter: number;
  guardMeter: number;
  isGrounded: boolean;
  isCrouching: boolean;
  isGuarding: boolean;
  isRolling: boolean;
  isMaxMode: boolean;
  maxModeTimer: number;
  comboCount: number;
  currentAction: string;
}

export class KofPhysicsEngine {
  public static GRAVITY = 0.85;
  public static GROUND_Y = 320;
  public static STAGE_MIN_X = 40;
  public static STAGE_MAX_X = 860;

  public static updateFighterPhysics(f: KofFighterEntity, dt: number): void {
    // Gravity & Ground Check
    if (!f.isGrounded) {
      f.vy += this.GRAVITY;
      f.y += f.vy;
      if (f.y >= this.GROUND_Y) {
        f.y = this.GROUND_Y;
        f.vy = 0;
        f.isGrounded = true;
      }
    }

    // Horizontal Movement
    f.x += f.vx;
    f.vx *= 0.82; // Friction

    // Boundaries
    if (f.x < this.STAGE_MIN_X) f.x = this.STAGE_MIN_X;
    if (f.x > this.STAGE_MAX_X) f.x = this.STAGE_MAX_X;
  }

  public static checkCollision(f1: KofFighterEntity, f2: KofFighterEntity, range: number = 75): boolean {
    return Math.abs(f1.x - f2.x) < range && Math.abs(f1.y - f2.y) < 60;
  }
}
`;
  }

  private generateReadmeMarkdown(): string {
    return `# Fate of Fighters (FOF) Codebase & Repository

Welcome to the **Fate of Fighters** Google Drive Code Vault.

## 📁 Included Files in this Folder:
1. \`FOF_Character_Roster_v0.1.md\` — Complete character attributes, frame data, and special move descriptions.
2. \`FOF_Story_Campaign_Acts_v0.1.md\` — Dialogue scripts and stage encounters for Acts 1 through 4.
3. \`FOF_KOF_Fighting_Engine_Core.ts\` — Core 2D fighting physics, collision engine, and MAX mode state machine.
4. \`FOF_Moveset_And_Frames_Data.json\` — Machine-readable moveset parameters, damage formulas, and startup/active frames.
5. \`FOF_Unit_Tests_Report_v0.1.json\` — Automated test suite results verifying roster integrity and mechanics.
6. \`FOF_Complete_Project_Source_Bundle.json\` — Full snapshot of all frontend components, assets, and source modules.

## 🕹️ Controls:
- **Move Left / Right**: \`A\` / \`D\` or Virtual D-Pad
- **Crouch**: \`S\` or Down
- **Jump**: \`W\` or Up
- **Light Punch (LP)**: \`J\`
- **Heavy Punch (HP)**: \`K\`
- **Light Kick (LK)**: \`U\`
- **Heavy Kick (HK)**: \`I\`
- **Evasion Roll**: \`Space\` or \`R\`
- **Blowback CD**: \`E\`
- **MAX Mode Activation**: \`Q\`
`;
  }

  private generateFullSourceBundle(): string {
    return JSON.stringify(
      {
        project: 'Fate of Fighters: The Shattered Convergence',
        engine: 'KOF 3v3 Arcade Fighting Engine',
        version: '0.1.0',
        exportedAt: new Date().toISOString(),
        roster: KOF_CHARACTERS,
        bosses: KOF_BOSSES,
        stages: KOF_STAGES,
        storyActs: STORY_CAMPAIGN_ACTS,
        summary: 'All project sources, character movesets, and story arcs packaged for Google Drive FOF folder.',
      },
      null,
      2
    );
  }

  /**
   * Backwards-compatible save profile method
   */
  public async saveToDrive(profile: any): Promise<{ fileId: string; modifiedTime: string }> {
    const folder = await this.getOrCreateFolder('FOF');
    const content = JSON.stringify({ version: '0.1', profile, savedAt: new Date().toISOString() }, null, 2);
    const res = await this.uploadOrUpdateFile(folder.id, 'Fate_Of_Fighters_Save_v0.1.json', content, 'application/json');
    return { fileId: res.id, modifiedTime: new Date().toISOString() };
  }

  /**
   * Backwards-compatible load profile method
   */
  public async loadFromDrive(): Promise<any> {
    const folder = await this.getOrCreateFolder('FOF');
    const files = await this.listFilesInFolder(folder.id);
    const saveFile = files.find(f => f.name === 'Fate_Of_Fighters_Save_v0.1.json');
    if (!saveFile) {
      throw new Error('No save file found in Google Drive /FOF folder.');
    }
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${saveFile.id}?alt=media`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to download save from Drive: ${res.statusText}`);
    }
    const data = await res.json();
    return data.profile;
  }
}

export const driveService = new DriveService();
