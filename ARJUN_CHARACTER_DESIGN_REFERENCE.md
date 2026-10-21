# Fate of Fighters (FOF) — Master Character Design Reference
## Protagonist: Arjun Rao (The Union Steelworker / Martial Artist)

**Document Type:** 3D Character Modeling, Texturing & Concept Design Bible  
**Visual Reference Assets:**  
- Scalable Master Vector: [`/characters/arjun_design_reference.svg`](/characters/arjun_design_reference.svg)  
- High-Resolution Raster Reference (3:4, 768x1024): [`/characters/arjun_design_reference.png`](/characters/arjun_design_reference.png)  
- In-Game Action Portrait / Icon: [`/characters/icon/Arjun.png`](/characters/icon/Arjun.png)  

---

## 1. Character Identity & Lore Foundation

| Attribute | Specification |
| :--- | :--- |
| **Full Name** | Arjun Rao |
| **Game Title** | Fate of Fighters (FOF) — Independent 2.5D Fighting Game |
| **Role** | Lead Protagonist / Balanced Strike & Grapple Brawler |
| **Archetype** | Working-class Indian factory worker turned disciplined martial artist |
| **Demeanor** | Grounded, tenacious, disciplined, resilient; calm focus with explosive kinetic bursts |
| **Combat Style** | Hybrid Industrial Strike & Kalaripayattu/Pankration (practical footwork, grounded balance, tight guard) |

---

## 2. Anatomical Proportions & Physical Attributes

* **Height:** 182 cm (6'0") — standard 7.5 heads athletic human scale.
* **Weight:** 82 kg (181 lbs) — lean athletic, functional musculature built through industrial steelwork and martial conditioning; not cartoonishly exaggerated or bodybuilder bulk.
* **Facial Features:** 
  - Distinctive Indian/South Asian adult male in his late 20s to early 30s.
  - Strong, weathered jawline with determined jaw set.
  - Expressive deep brown eyes with focused martial gaze and sharp brow ridge.
  - Cleanly trimmed dark beard and mustache with natural line along cheeks and neck.
  - Short, textured dark hair styled practically for high-mobility combat.
* **Hands & Feet:**
  - Realistic anatomical proportions with visible tendon and knuckle definition.
  - Right hand in measured forward martial guard (semi-curled fingers ready for striking or parrying); left hand guarding solar plexus and chin.
  - Grounded stance with solid contact between boot tread and floor ($Y = 0$).

---

## 3. Costume & Material Specifications

Every garment is designed to look physically wearable, tailored for combat mobility, and durable under impact.

```
       [Short Textured Dark Hair & Trim Beard]
                        │
      [Muted Rust-Red Shirt (#8a3429) at Collar]
                        │
    [Deep Indigo Sleeveless Canvas Jacket (#1b283d)]
     ├── Double-stitched reinforced lapel & seams
     ├── Heavy-duty brass central zipper (#c89d54)
     └── Chest utility pocket with brass snap rivet
                        │
     [Cloth Wrist Wraps (#d6cebf) Forearm to Knuckles]
                        │
     [Practical Charcoal Combat Cargo Trousers (#2f3136)]
     ├── Heavy utility leather belt & steel frame buckle
     ├── Side thigh cargo pockets for practical storage
     └── Articulated knee reinforcement patches (#202226)
                        │
     [Sturdy Dark Brown Leather Combat Boots (#332217)]
     └── Deep-lug anti-slip vulcanized rubber sole (#121314)
```

### Color Palette & Material Finish

| Component | Color Name | Hex Code | Material Type | PBR Shader Roughness / Metallic |
| :--- | :--- | :--- | :--- | :--- |
| **Vest / Jacket** | Deep Indigo | `#1b283d` to `#24344d` | Heavy Duck Canvas / Raw Denim | Roughness: `0.78` \| Metallic: `0.02` |
| **Undershirt** | Muted Rust-Red | `#8a3429` to `#a34336` | Slub Cotton Jersey Knit | Roughness: `0.85` \| Metallic: `0.00` |
| **Trousers** | Practical Charcoal | `#2f3136` to `#3e4147` | Ripstop Poly-Cotton Twill | Roughness: `0.80` \| Metallic: `0.04` |
| **Knee Patches** | Reinforced Dark Carbon | `#202226` | High-denier Ballistic Cordura | Roughness: `0.65` \| Metallic: `0.08` |
| **Wrist Wraps** | Raw Unbleached Cotton | `#d6cebf` to `#f0ebe1` | Woven Martial Gauze Wrap | Roughness: `0.90` \| Metallic: `0.00` |
| **Combat Boots** | Oiled Saddle Brown | `#332217` to `#4a3325` | Full-Grain Cowhide Leather | Roughness: `0.45` \| Metallic: `0.05` |
| **Boot Soles** | Carbon Black | `#121314` | High-Tread Vulcanized Rubber | Roughness: `0.88` \| Metallic: `0.00` |
| **Hardware** | Antiqued Brass | `#c89d54` | Cast Brass Zipper & Rivets | Roughness: `0.32` \| Metallic: `0.88` |
| **Skin Tone** | Warm South Asian Tan | `#b67a4e` to `#c98d60` | Realistic Sub-surface Scattering | SSS Radius: `[0.48, 0.22, 0.12]` |

---

## 4. Silhouette & 3D Modeling Guidelines

1. **Clear Negative Space Separation:**
   - Separation between the left (back) defensive arm and torso.
   - Separation between the right (front) guard forearm and upper chest.
   - Distinct space between thighs and knees to ensure readable leg physics during walk forward, walk backward, and jump takeoff.
2. **Topology & Edge Loops:**
   - 3-loop concentric rings around elbows and knees to support clean deformation without crushing volume during deep squats or punches.
   - Sleeveless armhole topology loops smoothly into the chest to prevent clipping when raising arms into high block or uppercut poses.
3. **Studio Environment & Composition Rules:**
   - Solid neutral studio backdrop (`#26262a` to `#18181b` subtle vignette).
   - Zero environment props, floating logos, typography, or handheld weapons.
   - Controlled 3-point studio lighting: warm key light (45° right, color temperature ~5200K), cool fill light (left, ~6500K), and subtle rim highlight along the left contour.

---

## 5. Consistency Directive for Future Roster & 3D Assets

All subsequent character models, 3D rigs, skins, and 2.5D fighting sprites for Arjun must strictly adhere to:
* The specified **182 cm athletic working-class human proportions**.
* The **Deep Indigo + Rust-Red + Charcoal** signature three-tone color harmony.
* The distinctive, authentic facial structure and natural beard styling.
* The functional, physically grounded costume construction without impractical fantasy ornaments.
