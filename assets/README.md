# assets/

Shared, source-of-truth media exported from `design/` before it is imported
into the Unity project.

| Folder        | Contents                                                        |
| ------------- | --------------------------------------------------------------- |
| `ui/`         | Sprites, icons, frames, nine-slice panels, Lottie JSON           |
| `audio/`      | Music beds and SFX (dice, capture, win, UI clicks)               |
| `video/`      | Cinematics, store promos, tutorial clips                         |
| `animations/` | Spine/DOTween/timeline sources and exported animation clips      |

Keep binaries here lean: large or frequently revised media should go through
Git LFS, and Unity-specific `.meta` files stay with the Unity project under
`client/Assets/`.
