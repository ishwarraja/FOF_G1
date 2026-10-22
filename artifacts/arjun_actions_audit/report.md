# Arjun action-sheet audit

- Metadata: `public/assets/characters/arjun/actions/actions.json`
- Actions found: **18**
- Errors: **0**
- Warnings: **1**

## Per-action results

| Action | Sheet size | Frames | Exact unique | Low-change transitions | Result files |
|---|---:|---:|---:|---:|---|
| `idle` | 2048×448 | 8/8 | 7 | 0.0% | `artifacts/arjun_actions_audit/idle_contact.png`, `artifacts/arjun_actions_audit/idle_preview.gif` |
| `walk_forward` | 2048×448 | 8/8 | 7 | 0.0% | `artifacts/arjun_actions_audit/walk_forward_contact.png`, `artifacts/arjun_actions_audit/walk_forward_preview.gif` |
| `walk_backward` | 2048×448 | 8/8 | 7 | 0.0% | `artifacts/arjun_actions_audit/walk_backward_contact.png`, `artifacts/arjun_actions_audit/walk_backward_preview.gif` |
| `crouch` | 1280×448 | 5/5 | 1 | 100.0% | `artifacts/arjun_actions_audit/crouch_contact.png`, `artifacts/arjun_actions_audit/crouch_preview.gif` |
| `light_punch` | 2304×448 | 9/9 | 6 | 25.0% | `artifacts/arjun_actions_audit/light_punch_contact.png`, `artifacts/arjun_actions_audit/light_punch_preview.gif` |
| `heavy_punch` | 3328×448 | 13/13 | 11 | 8.3% | `artifacts/arjun_actions_audit/heavy_punch_contact.png`, `artifacts/arjun_actions_audit/heavy_punch_preview.gif` |
| `light_kick` | 2304×448 | 9/9 | 6 | 25.0% | `artifacts/arjun_actions_audit/light_kick_contact.png`, `artifacts/arjun_actions_audit/light_kick_preview.gif` |
| `heavy_kick` | 3584×448 | 14/14 | 12 | 15.4% | `artifacts/arjun_actions_audit/heavy_kick_contact.png`, `artifacts/arjun_actions_audit/heavy_kick_preview.gif` |
| `special_1` | 3840×448 | 15/15 | 14 | 7.1% | `artifacts/arjun_actions_audit/special_1_contact.png`, `artifacts/arjun_actions_audit/special_1_preview.gif` |
| `special_2` | 4352×448 | 17/17 | 16 | 6.2% | `artifacts/arjun_actions_audit/special_2_contact.png`, `artifacts/arjun_actions_audit/special_2_preview.gif` |
| `special_3` | 4096×448 | 16/16 | 15 | 6.7% | `artifacts/arjun_actions_audit/special_3_contact.png`, `artifacts/arjun_actions_audit/special_3_preview.gif` |
| `special_4` | 6144×448 | 24/24 | 22 | 13.0% | `artifacts/arjun_actions_audit/special_4_contact.png`, `artifacts/arjun_actions_audit/special_4_preview.gif` |
| `jump` | 2560×448 | 10/10 | 9 | 0.0% | `artifacts/arjun_actions_audit/jump_contact.png`, `artifacts/arjun_actions_audit/jump_preview.gif` |
| `block` | 1792×448 | 7/7 | 4 | 0.0% | `artifacts/arjun_actions_audit/block_contact.png`, `artifacts/arjun_actions_audit/block_preview.gif` |
| `hurt_high` | 2048×448 | 8/8 | 6 | 0.0% | `artifacts/arjun_actions_audit/hurt_high_contact.png`, `artifacts/arjun_actions_audit/hurt_high_preview.gif` |
| `hurt_low` | 2048×448 | 8/8 | 4 | 14.3% | `artifacts/arjun_actions_audit/hurt_low_contact.png`, `artifacts/arjun_actions_audit/hurt_low_preview.gif` |
| `knockdown` | 3328×448 | 13/13 | 10 | 25.0% | `artifacts/arjun_actions_audit/knockdown_contact.png`, `artifacts/arjun_actions_audit/knockdown_preview.gif` |
| `ko` | 4608×448 | 18/18 | 16 | 11.8% | `artifacts/arjun_actions_audit/ko_contact.png`, `artifacts/arjun_actions_audit/ko_preview.gif` |

## Errors

- None detected.

## Warnings

- crouch: suspected low animation variety (1/5 exact unique frames; 100.0% adjacent transitions below 0.015)

## Interpretation

Passing the dimension checks only proves that the sprite sheet and metadata agree. It does **not** prove that the character changes pose convincingly. Review each contact sheet and preview GIF. Replace repeated or weakly varying poses with authored animation frames or rendered frames from a consistently rigged model; do not try to solve missing limb motion by adjusting hitboxes or CSS alone.
