# Character Design Images & Sprite Assets Directory

Welcome to the **Fate of Fighters (FOF)** Character Asset Directory!

## 📁 Where to Place Your Custom Character Images

You can place your character images, custom sprite art, and design portraits directly into this folder:

```
public/
  └── characters/
        ├── ignis.png
        ├── valeria.png
        ├── arjun.png
        ├── steele.png
        ├── elena.png
        ├── david.png
        ├── maya.png
        ├── leo.png
        ├── malakor.png
        ├── terran.png
        ├── aurelia.png
        ├── zephyr.png
        ├── vance.png
        ├── ren.png
        ├── zhen.png
        ├── morrigan.png
        ├── dante.png
        ├── nyx.png
        └── custom_fighter.png
```

## 🎨 Recommended Image Specifications
- **Format**: `.png` (recommended for transparent backgrounds), `.webp`, `.svg`, or `.jpg`
- **Resolution**:
  - **Portraits & Character Cards**: 512 x 512 px (Square) or 600 x 800 px (3:4 ratio)
  - **Full-Body Battle Sprites**: 400 x 600 px or transparent SVG/PNG
- **Background**: Transparent PNG (`rgba`) is ideal for in-arena sprite overlay and healthbar portraits.

## 🚀 How the Game Loads Images
1. **Automatic File Match**: When a character with ID `ignis` is loaded, the game checks `/characters/ignis.png`.
2. **In-Game Upload & URL**: In the **Character Select** or **Codex** screen, you can also paste any image URL or upload a local image file directly. It will be stored in your browser session/storage and applied immediately in real-time combat!
3. **Hybrid Rig**: If a custom image is present, the arena dynamically animates it with authentic combat physics (breathing, action tilts, jump arcs, damage flashes, and elemental aura glows). If no image file is found, it automatically uses the high-definition articulated procedural vector fighter rig!
