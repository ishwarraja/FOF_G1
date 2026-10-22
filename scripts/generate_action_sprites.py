#!/usr/bin/env python3
"""
Fate of Fighters (FOF) — Automated 2.5D Action Sprite Generator
Specification: FOFv0.4_26Sep
Commercial 2.5D Arcade Standards (Guilty Gear Strive / KOF XV / Street Fighter 6)

Reads character specs from FOF_character_specs.json and move matrix from FOF_special_move_matrix.csv.
Generates frame-accurate transparent multi-frame sprite sheets, animated GIFs,
actions.json frame metadata, and an exportable ZIP archive.
"""

import os
import sys
import json
import csv
import math
import zipfile
from PIL import Image, ImageDraw

FRAME_WIDTH = 192
FRAME_HEIGHT = 192

# Standard frame rates: ~16.6ms per tick at 60 FPS.
# Standard 2D fighting animation displays frames at 60ms - 90ms duration.
DEFAULT_FRAME_DURATION_MS = 75

ACTIONS_CONFIG = {
    "idle": {"frames": 6, "loop": True, "startup": 0, "active": 0, "recovery": 0},
    "walk_forward": {"frames": 6, "loop": True, "startup": 0, "active": 0, "recovery": 0},
    "walk_backward": {"frames": 6, "loop": True, "startup": 0, "active": 0, "recovery": 0},
    "crouch_idle": {"frames": 4, "loop": True, "startup": 0, "active": 0, "recovery": 0},
    "jump": {"frames": 6, "loop": False, "startup": 2, "active": 2, "recovery": 2},
    "block": {"frames": 4, "loop": True, "startup": 0, "active": 0, "recovery": 0},
    "punch_light": {"frames": 4, "loop": False, "startup": 1, "active": 2, "recovery": 1},
    "punch_heavy": {"frames": 6, "loop": False, "startup": 2, "active": 2, "recovery": 2},
    "kick_light": {"frames": 4, "loop": False, "startup": 1, "active": 2, "recovery": 1},
    "kick_heavy": {"frames": 6, "loop": False, "startup": 2, "active": 2, "recovery": 2},
    "special_1": {"frames": 6, "loop": False, "startup": 2, "active": 2, "recovery": 2},
    "special_2": {"frames": 7, "loop": False, "startup": 2, "active": 3, "recovery": 2},
    "special_3": {"frames": 7, "loop": False, "startup": 2, "active": 3, "recovery": 2},
    "hurt_high": {"frames": 4, "loop": False, "startup": 0, "active": 0, "recovery": 4},
    "hurt_low": {"frames": 4, "loop": False, "startup": 0, "active": 0, "recovery": 4},
    "knockdown": {"frames": 6, "loop": False, "startup": 0, "active": 0, "recovery": 6},
    "ko": {"frames": 5, "loop": False, "startup": 0, "active": 0, "recovery": 5},
}

def hex_to_rgba(hex_code, alpha=255):
    hex_code = hex_code.lstrip('#')
    if len(hex_code) == 3:
        hex_code = ''.join([c * 2 for c in hex_code])
    if len(hex_code) == 6:
        r = int(hex_code[0:2], 16)
        g = int(hex_code[2:4], 16)
        b = int(hex_code[4:6], 16)
        return (r, g, b, alpha)
    return (200, 200, 200, alpha)

def draw_fighter_frame(char_spec, action, frame_idx, total_frames, move_meta=None):
    """
    Renders an individual frame of a fighter action onto a transparent RGBA PIL Image.
    Incorporates character palette, kinematics, weapon posture, strike trails, and contact grounding.
    """
    img = Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    palette = char_spec.get("palette", {})
    primary = hex_to_rgba(palette.get("primary", "#1e293b"))
    secondary = hex_to_rgba(palette.get("secondary", "#0f172a"))
    trim = hex_to_rgba(palette.get("trim", "#38bdf8"))
    skin = hex_to_rgba(palette.get("skin", "#fed7aa"))
    fx_color = hex_to_rgba(palette.get("fx", "#38bdf8"))
    shadow_color = (10, 10, 15, 120)

    # Reference Origin Ground Y = 168 (leaving margin at bottom for ground contact shadow)
    ground_y = 168
    root_x = 96
    root_y = 110

    t_norm = frame_idx / max(1, total_frames - 1)
    phase = (frame_idx / total_frames) * math.pi * 2

    # Kinetic kinematic offsets based on action state
    body_y_offset = 0
    body_x_offset = 0
    torso_angle = 0
    lead_arm_x = 0
    lead_arm_y = 0
    rear_arm_x = 0
    rear_arm_y = 0
    leg_spread = 24
    weapon_thrust = 0
    strike_trail = False

    if action == "idle":
        body_y_offset = math.sin(phase) * 3
        lead_arm_y = math.sin(phase) * 2
        rear_arm_y = -math.sin(phase) * 2
    elif action == "walk_forward":
        body_x_offset = math.sin(phase) * 6
        body_y_offset = abs(math.sin(phase)) * 4
        leg_spread = 28 + math.sin(phase) * 16
        lead_arm_x = math.cos(phase) * 14
        rear_arm_x = -math.cos(phase) * 14
        torso_angle = 0.08
    elif action == "walk_backward":
        body_x_offset = -math.sin(phase) * 5
        body_y_offset = abs(math.sin(phase)) * 3
        leg_spread = 26 - math.sin(phase) * 14
        lead_arm_x = -math.cos(phase) * 10
        rear_arm_x = math.cos(phase) * 10
        torso_angle = -0.06
    elif action == "crouch_idle":
        body_y_offset = 24
        leg_spread = 36
        lead_arm_y = 8
        rear_arm_y = 10
    elif action == "jump":
        # Arc trajectory: 0 -> peak -> landing
        jump_height = math.sin(t_norm * math.pi) * 48
        body_y_offset = -jump_height
        leg_spread = 18 - (jump_height * 0.1)
    elif action == "block":
        body_x_offset = -4
        torso_angle = -0.08
        lead_arm_x = -12
        lead_arm_y = -10
        rear_arm_x = -8
        rear_arm_y = -8
        # Guard shield aura
        draw.arc([root_x + 12, root_y - 45, root_x + 65, root_y + 45], 270, 90, fill=trim, width=4)
    elif action in ("punch_light", "punch_heavy"):
        if frame_idx == 0:
            # Startup windup
            body_x_offset = -6
            lead_arm_x = -15
            lead_arm_y = 4
        elif frame_idx in (1, 2) or (action == "punch_heavy" and frame_idx in (2, 3)):
            # Active strike
            extension = 38 if action == "punch_light" else 56
            body_x_offset = 12
            lead_arm_x = extension
            weapon_thrust = extension + 10
            strike_trail = True
            torso_angle = 0.15
        else:
            # Recovery
            body_x_offset = 4
            lead_arm_x = 12
            lead_arm_y = 2
    elif action in ("kick_light", "kick_heavy"):
        if frame_idx == 0:
            body_x_offset = -4
        elif frame_idx in (1, 2) or (action == "kick_heavy" and frame_idx in (2, 3)):
            body_x_offset = 10
            leg_spread = 54 if action == "kick_light" else 68
            strike_trail = True
            torso_angle = -0.18
        else:
            body_x_offset = 2
            leg_spread = 30
    elif action.startswith("special_"):
        if frame_idx < 2:
            body_x_offset = -8
            body_y_offset = 4
        elif frame_idx in (2, 3, 4):
            body_x_offset = 18
            weapon_thrust = 60
            strike_trail = True
            torso_angle = 0.22
            # Elemental energy blast disc
            blast_x = root_x + 75
            blast_y = root_y - 10
            draw.ellipse([blast_x - 18, blast_y - 18, blast_x + 18, blast_y + 18], fill=fx_color, outline=(255, 255, 255, 220), width=3)
            draw.arc([blast_x - 30, blast_y - 30, blast_x + 30, blast_y + 30], 0, 360, fill=trim, width=2)
        else:
            body_x_offset = 6
    elif action == "hurt_high":
        body_x_offset = -14 - frame_idx * 2
        body_y_offset = -4
        torso_angle = -0.25
        lead_arm_x = -16
        rear_arm_x = -14
    elif action == "hurt_low":
        body_x_offset = -10 - frame_idx * 2
        body_y_offset = 12
        torso_angle = 0.20
    elif action == "knockdown":
        body_x_offset = -18 - frame_idx * 6
        body_y_offset = frame_idx * 10
        torso_angle = -0.45 - (frame_idx * 0.15)
    elif action == "ko":
        body_y_offset = 40
        body_x_offset = -20
        torso_angle = -1.45

    current_root_x = root_x + body_x_offset
    current_root_y = root_y + body_y_offset

    # 1. Ground Contact Shadow Blob (anchored on ground plane)
    shadow_w = max(16, 52 - abs(body_y_offset) * 0.4)
    shadow_h = 14
    draw.ellipse(
        [current_root_x - shadow_w, ground_y - shadow_h // 2, current_root_x + shadow_w, ground_y + shadow_h // 2],
        fill=shadow_color
    )

    # 2. Strike Energy Trails (on Active Frames)
    if strike_trail:
        trail_start = current_root_x + 20
        trail_end = current_root_x + 70 + weapon_thrust
        trail_y = current_root_y - 12
        draw.line([trail_start, trail_y, trail_end, trail_y], fill=fx_color, width=8)
        draw.line([trail_start, trail_y - 6, trail_end - 10, trail_y - 6], fill=(255, 255, 255, 200), width=3)
        draw.line([trail_start, trail_y + 6, trail_end - 10, trail_y + 6], fill=trim, width=3)
        # Impact Star
        draw.polygon([
            (trail_end, trail_y - 12),
            (trail_end + 12, trail_y),
            (trail_end, trail_y + 12),
            (trail_end - 6, trail_y)
        ], fill=(255, 255, 255, 240))

    # 3. Rear Leg
    rear_foot_x = current_root_x - leg_spread
    draw.line([current_root_x - 8, current_root_y + 22, rear_foot_x, ground_y - 2], fill=secondary, width=14)
    draw.ellipse([rear_foot_x - 6, ground_y - 6, rear_foot_x + 10, ground_y + 2], fill=(15, 23, 42, 255))

    # 4. Rear Arm / Weapon Ready
    draw.line([current_root_x - 12, current_root_y - 14, current_root_x - 28 + rear_arm_x, current_root_y + rear_arm_y], fill=primary, width=12)

    # 5. Torso / Chest Armor
    torso_top = current_root_y - 28
    torso_bottom = current_root_y + 22
    torso_w = 26
    draw.rectangle([current_root_x - torso_w // 2, torso_top, current_root_x + torso_w // 2, torso_bottom], fill=primary)
    # Armor Vest Overlay / Trim
    draw.rectangle([current_root_x - torso_w // 2 + 3, torso_top + 4, current_root_x + torso_w // 2 - 3, torso_bottom - 6], fill=secondary, outline=trim, width=2)
    # Chest Core Emblem
    draw.ellipse([current_root_x - 6, torso_top + 10, current_root_x + 6, torso_top + 22], fill=trim)

    # 6. Head & Face
    head_y = torso_top - 18
    draw.ellipse([current_root_x - 12, head_y - 12, current_root_x + 12, head_y + 12], fill=skin)
    # Hair / Helmet
    draw.arc([current_root_x - 14, head_y - 16, current_root_x + 14, head_y + 4], 180, 360, fill=primary, width=6)
    # Focused Eyes / Visor
    draw.line([current_root_x + 2, head_y - 2, current_root_x + 8, head_y - 2], fill=trim, width=3)

    # 7. Lead Leg
    lead_foot_x = current_root_x + leg_spread
    draw.line([current_root_x + 8, current_root_y + 22, lead_foot_x, ground_y - 2], fill=secondary, width=14)
    draw.ellipse([lead_foot_x - 4, ground_y - 6, lead_foot_x + 12, ground_y + 2], fill=(15, 23, 42, 255))

    # 8. Lead Arm & Signature Weapon
    hand_x = current_root_x + 20 + lead_arm_x
    hand_y = current_root_y - 6 + lead_arm_y
    draw.line([current_root_x + 10, current_root_y - 14, hand_x, hand_y], fill=primary, width=12)
    draw.ellipse([hand_x - 4, hand_y - 4, hand_x + 4, hand_y + 4], fill=skin)

    # Weapon rendering based on archetype
    weapon_name = char_spec.get("signatureWeapon", "").lower()
    if "wrench" in weapon_name or "hammer" in weapon_name or "maul" in weapon_name:
        # Arjun Heavy Industrial Wrench / Sledge
        w_len = 32 + weapon_thrust
        draw.line([hand_x, hand_y, hand_x + w_len, hand_y - 8], fill=(148, 163, 184, 255), width=7)
        draw.rectangle([hand_x + w_len - 6, hand_y - 16, hand_x + w_len + 8, hand_y], fill=trim)
    elif "saber" in weapon_name or "blade" in weapon_name:
        # Steele / Valeria Plasma Blade
        w_len = 36 + weapon_thrust
        draw.line([hand_x, hand_y, hand_x + w_len, hand_y - 6], fill=trim, width=4)
        draw.line([hand_x + 4, hand_y - 2, hand_x + w_len - 4, hand_y - 6], fill=(255, 255, 255, 255), width=2)
    elif "injector" in weapon_name or "scalpel" in weapon_name:
        # Elena Nanite Needle
        draw.line([hand_x, hand_y, hand_x + 26 + weapon_thrust, hand_y - 2], fill=trim, width=4)
        draw.ellipse([hand_x + 24 + weapon_thrust, hand_y - 4, hand_x + 30 + weapon_thrust, hand_y + 2], fill=(255, 255, 255, 255))
    else:
        # Standard combat fist / focus glove
        draw.ellipse([hand_x, hand_y - 5, hand_x + 10, hand_y + 5], fill=trim)

    return img

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    specs_path = os.path.join(base_dir, "FOF_character_specs.json")
    matrix_path = os.path.join(base_dir, "FOF_special_move_matrix.csv")

    if not os.path.exists(specs_path):
        print(f"Error: {specs_path} not found.")
        sys.exit(1)

    with open(specs_path, "r", encoding="utf-8") as f:
        specs_data = json.load(f)

    # Read Move Matrix
    move_matrix = {}
    if os.path.exists(matrix_path):
        with open(matrix_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cid = row.get("character_id")
                act = row.get("action_state")
                if cid and act:
                    move_matrix[(cid, act)] = row

    characters = specs_data.get("characters", [])
    print(f"Loaded {len(characters)} character specifications.")

    all_generated_files = []

    for char in characters:
        char_id = char["id"]
        char_name = char["name"]
        print(f"\nProcessing character [{char_id}]: {char_name}...")

        output_dir = os.path.join(base_dir, "public", "assets", "characters", char_id, "actions")
        os.makedirs(output_dir, exist_ok=True)

        character_manifest = {
            "characterId": char_id,
            "characterName": char_name,
            "standardFps": 60,
            "frameWidth": FRAME_WIDTH,
            "frameHeight": FRAME_HEIGHT,
            "actions": {}
        }

        spritesheet_frames = []
        action_offsets = {}
        total_sheet_frames = 0

        for action_name, action_cfg in ACTIONS_CONFIG.items():
            num_frames = action_cfg["frames"]
            move_info = move_matrix.get((char_id, action_name), {})
            
            # Calculate keyframe phase distribution
            if move_info:
                sim_startup = int(move_info.get("startup_frames", 4))
                sim_active = int(move_info.get("active_frames", 4))
                sim_recovery = int(move_info.get("recovery_frames", 6))
                sim_total = int(move_info.get("total_frames", sim_startup + sim_active + sim_recovery)) or (sim_startup + sim_active + sim_recovery)
                if num_frames == 4:
                    startup_k = 1
                    active_k = 2
                    recovery_k = 1
                elif num_frames == 6:
                    startup_k = max(1, min(2, round((sim_startup / sim_total) * num_frames)))
                    active_k = max(1, min(3, round((sim_active / sim_total) * num_frames)))
                    recovery_k = max(1, num_frames - startup_k - active_k)
                elif num_frames >= 7:
                    startup_k = max(1, min(2, round((sim_startup / sim_total) * num_frames)))
                    active_k = max(2, min(3, round((sim_active / sim_total) * num_frames)))
                    recovery_k = max(1, num_frames - startup_k - active_k)
                else:
                    startup_k = action_cfg["startup"]
                    active_k = action_cfg["active"]
                    recovery_k = action_cfg["recovery"]
            else:
                startup_k = action_cfg["startup"]
                active_k = action_cfg["active"]
                recovery_k = action_cfg["recovery"]

            frames = []
            frame_records = []

            for i in range(num_frames):
                frame_img = draw_fighter_frame(char, action_name, i, num_frames, move_info)
                frames.append(frame_img)
                spritesheet_frames.append(frame_img)

                # Determine active strike window & hitbox using proportional keyframe phases
                is_active = (i >= startup_k and i < startup_k + active_k) if (active_k > 0) else False

                hitbox = None
                if is_active:
                    hitbox = {
                        "x": int(move_info.get("hitbox_x", 60)),
                        "y": int(move_info.get("hitbox_y", 75)),
                        "w": int(move_info.get("hitbox_w", 50)),
                        "h": int(move_info.get("hitbox_h", 30))
                    }

                hurtbox = {
                    "x": 30,
                    "y": 20 if action_name != "crouch_idle" else 50,
                    "w": 50,
                    "h": 140 if action_name != "crouch_idle" else 90
                }

                frame_records.append({
                    "frameIndex": i,
                    "sheetIndex": total_sheet_frames + i,
                    "durationMs": DEFAULT_FRAME_DURATION_MS,
                    "isActive": is_active,
                    "hitbox": hitbox,
                    "hurtbox": hurtbox
                })

            action_offsets[action_name] = {
                "startSheetIndex": total_sheet_frames,
                "frameCount": num_frames
            }
            total_sheet_frames += num_frames

            # Save Animated GIF
            gif_filename = f"{action_name}.gif"
            gif_path = os.path.join(output_dir, gif_filename)
            frames[0].save(
                gif_path,
                save_all=True,
                append_images=frames[1:],
                duration=DEFAULT_FRAME_DURATION_MS,
                loop=0 if action_cfg["loop"] else 1,
                disposal=2,
                transparency=0
            )
            all_generated_files.append(gif_path)

            character_manifest["actions"][action_name] = {
                "actionName": action_name,
                "isLooping": action_cfg["loop"],
                "frameCount": num_frames,
                "gifUrl": f"/assets/characters/{char_id}/actions/{gif_filename}",
                "startupFrames": startup_k,
                "activeFrames": active_k,
                "recoveryFrames": recovery_k,
                "damage": int(move_info.get("damage", 0)) if move_info else 0,
                "frames": frame_records
            }

        # Add bidirectional action offsets aliases for seamless engine compatibility
        for canonical, alias in [
            ("punch_light", "light_punch"),
            ("punch_heavy", "heavy_punch"),
            ("kick_light", "light_kick"),
            ("kick_heavy", "heavy_kick"),
            ("crouch_idle", "crouch"),
            ("special_1", "special_move"),
        ]:
            if canonical in action_offsets:
                action_offsets[alias] = action_offsets[canonical]
            if canonical in character_manifest["actions"] and alias not in character_manifest["actions"]:
                character_manifest["actions"][alias] = character_manifest["actions"][canonical]

        # Compile Consolidated Horizontal / Grid Sprite Sheet PNG
        sheet_cols = min(16, total_sheet_frames)
        sheet_rows = math.ceil(total_sheet_frames / sheet_cols)
        sheet_w = sheet_cols * FRAME_WIDTH
        sheet_h = sheet_rows * FRAME_HEIGHT

        spritesheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
        for idx, frame in enumerate(spritesheet_frames):
            c = idx % sheet_cols
            r = idx // sheet_cols
            spritesheet.paste(frame, (c * FRAME_WIDTH, r * FRAME_HEIGHT))

        sheet_filename = "spritesheet.png"
        sheet_path = os.path.join(output_dir, sheet_filename)
        spritesheet.save(sheet_path, "PNG")
        all_generated_files.append(sheet_path)

        character_manifest["spriteSheet"] = {
            "url": f"/assets/characters/{char_id}/actions/{sheet_filename}",
            "width": sheet_w,
            "height": sheet_h,
            "cols": sheet_cols,
            "rows": sheet_rows,
            "totalFrames": total_sheet_frames,
            "actionOffsets": action_offsets
        }

        # Write actions.json
        json_path = os.path.join(output_dir, "actions.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(character_manifest, f, indent=2)
        all_generated_files.append(json_path)

        print(f"  -> Generated {len(ACTIONS_CONFIG)} action GIFs, consolidated spritesheet ({sheet_w}x{sheet_h}), and actions.json")

    # Create Exportable Archive: public/assets/fof_action_sprites.zip
    zip_path = os.path.join(base_dir, "public", "assets", "fof_action_sprites.zip")
    print(f"\nPackaging {len(all_generated_files)} assets into {zip_path}...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zip_f:
        for file_path in all_generated_files:
            rel_name = os.path.relpath(file_path, os.path.join(base_dir, "public"))
            zip_f.write(file_path, arcname=rel_name)

    print(f"Asset generation complete! Archive created at: {zip_path}")

if __name__ == "__main__":
    main()
