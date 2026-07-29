# LudoVerse Unity Client

Unity 6 LTS client for the LudoVerse platform (Android, iOS, Web, Windows, macOS).

## First open

This folder is a **project skeleton**, not a project that has been opened in an
Editor. Unity generates several things itself — `.meta` files, `Library/`,
scene files, and the bulk of `ProjectSettings/` — so they are deliberately not
hand-written here. On first open:

1. Open `client/` with **Unity 6000.0 LTS** (see `ProjectSettings/ProjectVersion.txt`).
   Unity imports the assets and writes the `.meta` files; commit them.
2. Package Manager restores everything in `Packages/manifest.json`. If it flags
   a version, let it upgrade to the version bundled with your editor.
3. Run **LudoVerse > Apply Project Settings** to set the product name, linear
   colour space, and portrait orientation.
4. Run **LudoVerse > Create Base Scenes** to generate `Boot`, `Lobby` and `Game`
   under `Assets/Scenes/` and register them in the build settings. The `Boot`
   scene gets a `GameBootstrap` object; the menu item is safe to re-run.
5. Create a `ServerEndpoints` asset (**Assets > Create > LudoVerse > Server
   Endpoints**) under `Assets/Settings/` and assign it on `GameBootstrap`.
   Defaults already match `docker/docker-compose.yml`.

## Packages

Restored automatically from `Packages/manifest.json`:

| Package | Purpose |
| ------- | ------- |
| UniTask (OpenUPM) | Allocation-free async/await |
| VContainer (OpenUPM) | Dependency injection |
| Input System | Cross-platform input |
| Localization | 100+ language support |
| Addressables | Asset streaming |
| Universal RP | Render pipeline for the premium UI |
| Test Framework | Edit/Play mode tests |

Installed manually — these are not on the Unity or OpenUPM registries:

| Package | How |
| ------- | --- |
| Colyseus Unity SDK | Package Manager > Add package from git URL, per the [SDK docs](https://github.com/colyseus/colyseus-unity-sdk) |
| DOTween | Asset Store / `.unitypackage`, then run its setup panel |
| Firebase Unity SDK (Auth, Analytics, Crashlytics, Messaging) | Import the `.unitypackage`s from the [Firebase SDK download](https://firebase.google.com/download/unity) |
| LiveKit Unity SDK | Added in Phase 4 (Issue 4.2) |

A URP asset is not committed: create one via **Assets > Create > Rendering >
URP Asset** and assign it in Project Settings > Graphics once the render
pipeline is configured for the target platforms.

## Layout

```
Assets/
  Scripts/
    Core/       Bootstrap, scene names, server endpoint config  (LudoVerse.Core)
    Gameplay/   Board, pawns, dice, rules engine                (LudoVerse.Gameplay)
    Network/    Colyseus client, REST calls, reconnection       (LudoVerse.Network)
    UI/         Screens, HUD, shop, profile                     (LudoVerse.UI)
    Editor/     Project setup and scene scaffolding tools       (LudoVerse.Editor)
  Tests/
    EditMode/   Fast tests with no scene load
    PlayMode/   Tests that need a running scene
  Prefabs/  Scenes/  Settings/  Art/  Audio/  Resources/
```

Assemblies are split so gameplay does not depend on UI, and so Phase 2 offline
logic stays testable without the network layer. Dependencies flow one way:
`UI -> Gameplay -> Core` and `Network -> Core`.

## Testing

Window > General > Test Runner, or from CI once Issue 1.5's build job is
enabled. Edit mode tests cover pure C# (rules, pathfinding, config); play mode
tests cover scene-dependent behaviour.

## Roadmap

Board, pawns, dice and the turn state machine are Phase 2; the Colyseus
connection is Phase 3. See `docs/MILESTONES.md`.
