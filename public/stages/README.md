# Stage 3D Models (.glb) & Background Pictures Directory (.jpeg, .gif, .png, .jpg)

Welcome to the **Fate of Fighters (FOF)** Stage Asset Directory!

All stage background images and portable 3D environments are stored as standard graphic files (**`.jpeg`**, **`.gif`**, **`.png`**, and **`.jpg`**) and binary glTF 2.0 files (**`.glb`**) in this `/public/stages/` folder.

---

## 🏛️ Available 3D Stage Environments (.glb)

Each `.glb` binary file contains an authoritative 3D combat environment with standard named nodes recognized by the FOF Three.js engine:
- `FOF_StageBackdrop`: High-resolution textured panoramic backdrop plane (60m x 30m)
- `FOF_FightingFloor`: Textured fighting floor platform (48m x 20m)
- `FOF_LeftBoundary` & `FOF_RightBoundary`: Combat ring laser boundary posts (at ±16m)
- `FOF_Sky`, `FOF_Far`, `FOF_Mid`, `FOF_Crowd`, `FOF_Foreground`: Parallax layer anchoring nodes

### Available GLB Stage Models:
- `/stages/stage_street_fighter_arena.glb` — Street Fighter 6 Grand Championship Arena
- `/stages/stage_metro_rain.glb` — Metro City Rain (Cyber Neon Skyscraper Downpour)
- `/stages/stage_riverfront_sunset.glb` — Riverfront Sunset (Sacred Ghats & Floating Diyas)
- `/stages/stage_sky_observatory.glb` — Sky Observatory (Samrat Yantra Astronomical Stairs)
- `/stages/stage_bioluminescent_ruins.glb` — Bioluminescent Ruins (Tapovan Grove & Glowing Moss)
- `/stages/stage_kala_chakra_time.glb` — Kala Chakra: Sun Temple of Time
- `/stages/stage_jantar_mantar_space.glb` — Jantar Mantar: Celestial Geometry
- `/stages/stage_antariksha_space.glb` — Antariksha: Cosmic Brahmanda Void
- `/stages/stage_dandakaranya_forest.glb` — Dandakaranya: Sacred Tapovan Forest
- `/stages/stage_kumbh_sangam_gathering.glb` — Maha Kumbh: Twilight Ghats
- `/stages/stage_hegemony_arena.glb` — Hegemony Championship Colosseum

---

## 📁 Available Background Image Files

### 1. `.jpeg` / `.jpg` Stages (High-Definition Photographic Panoramic Arenas)
- `/stages/stage_street_fighter_arena.jpg` — Street Fighter 6 Grand Championship Arena
- `/stages/stage_kala_chakra_time.jpeg` — Konark Surya Sun Temple of Time
- `/stages/stage_jantar_mantar_space.jpeg` — Jantar Mantar Astronomical Observatory
- `/stages/stage_dandakaranya_forest.jpeg` — Dandakaranya Sacred Tapovan Forest
- `/stages/stage_kumbh_sangam_gathering.jpeg` — Maha Kumbh Twilight Ghats
- `/stages/stage_antariksha_space.jpeg` — Cosmic Antariksha Galaxy Void
- `/stages/stage_hegemony_arena.jpeg` — Hegemony Colosseum
- `/stages/stage_sector7_quarantine.jpeg` — Sector 7 Industrial Outskirts
- `/stages/stage_aether_server_vault.jpeg` — Aether Core Quantum Mainframe
- `/stages/stage_spire_apex.jpeg` — Spire Apex Skyscraper Penthouse
- `/stages/stage_subway_slums.jpeg` — Underground Metro District

### 2. `.png` Stages (Crisp Textured Arenas & Battlegrounds)
- `/stages/stage_metro_rain.png` — Metro City Rain (Cyber Neon)
- `/stages/stage_riverfront_sunset.png` — Riverfront Twilight Sunset
- `/stages/stage_sky_observatory.png` — Sky Observatory (Samrat Yantra)
- `/stages/stage_bioluminescent_ruins.png` — Bioluminescent Sacred Ruins
- `/stages/stage_sun_temple_arena.png` — Sun Temple Sandstone Arena
- `/stages/stage_ancient_battleground.png` — Ancient Tournament Colosseum
- `/stages/stage_metro_city_rooftop.png` — Metro City Skyline Battleground

### 3. `.gif` Stages (Animated Moving Cheering Background)
- `/stages/stage_cheering_crowd_animated.gif` — Animated looping arena featuring cheering humans, moving tournament lights, and spectators celebrating in the stadium!

---

## 🖼️ How to Add Custom Stages

You can drop any `.glb`, `.jpeg`, `.jpg`, `.png`, or `.gif` file directly into this `public/stages/` directory:
1. Save your file here, e.g., `public/stages/my_custom_stage.glb` or `public/stages/my_custom_stage.png`.
2. In the game, select it from the **Stage Selector** (Location menu in the top bar) or link it in `/src/data/stageBackgrounds.ts` with `imageUrl: '/stages/my_custom_stage.png'` and `glbUrl: '/stages/my_custom_stage.glb'`.
3. The game supports both `.glb` 3D models and `.jpeg`/`.png`/`.gif` backdrops seamlessly in 2D and 3D camera modes!
