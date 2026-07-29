# LudoVerse - Milestones & Issue Breakdown

This document outlines the project milestones and granular issues to be tracked in GitHub Projects. Claude Code (as the Senior Engineer) will implement these issues sequentially.

---

## 🟢 Phase 1: Foundation (Architect/Scaffolder)
**Objective:** Repository setup, architecture, CI/CD, and basic skeletons.
- [x] **Issue 1.1**: Initialize repository structure and `.gitignore`.
- [x] **Issue 1.2**: Generate Architecture Documents (SRS, SDD, API Contracts).
- [x] **Issue 1.3**: Set up local DevOps (Docker Compose, GitHub Actions).
- [x] **Issue 1.4**: Scaffold NestJS + Colyseus Backend.
- [ ] **Issue 1.5**: Initialize Unity 6 Client skeleton and asset structure.

---

## 🟡 Phase 2: Core Gameplay (Claude Code)
**Objective:** Implement the offline board logic and rules engine in Unity.
- [ ] **Issue 2.1**: Implement the Ludo Board UI and grid system (Unity).
- [ ] **Issue 2.2**: Create the Pawn movement logic and pathfinding.
- [ ] **Issue 2.3**: Implement the Dice RNG and physics animation.
- [ ] **Issue 2.4**: Build the turn-based state machine (Turn -> Roll -> Move -> Check Win).
- [ ] **Issue 2.5**: Add game rules (Safe zones, capturing pawns, winning).
- [ ] **Issue 2.6**: Implement offline Undo feature.

---

## 🟠 Phase 3: Online Multiplayer (Claude Code)
**Objective:** Real-time multiplayer synchronization using Colyseus.
- [ ] **Issue 3.1**: Integrate Firebase Auth in Unity and NestJS.
- [ ] **Issue 3.2**: Create Colyseus `LudoRoom` state schema on the backend.
- [ ] **Issue 3.3**: Implement client-side Colyseus connection and state sync.
- [ ] **Issue 3.4**: Move dice RNG and move validation to the authoritative server.
- [ ] **Issue 3.5**: Build the matchmaking queue and room creation API.
- [ ] **Issue 3.6**: Implement network reconnection and state recovery logic.

---

## 🔵 Phase 4: Voice & Video (Claude Code)
**Objective:** Integrate LiveKit for real-time media.
- [ ] **Issue 4.1**: Set up LiveKit Server integration on NestJS (Token generation).
- [ ] **Issue 4.2**: Integrate LiveKit Unity SDK.
- [ ] **Issue 4.3**: Implement Voice Chat (Push-to-talk, muting, noise suppression).
- [ ] **Issue 4.4**: Implement Video Chat (Picture-in-Picture, Camera toggles).

---

## 🟣 Phase 5: Social Systems & DB (Claude Code)
**Objective:** Friends, profiles, and leaderboards.
- [ ] **Issue 5.1**: Implement PostgreSQL Prisma/TypeORM models in NestJS.
- [ ] **Issue 5.2**: Build Friends system (Add, Accept, Remove) and Presence via Redis.
- [ ] **Issue 5.3**: Create Global and Friends Leaderboard APIs.
- [ ] **Issue 5.4**: Implement Player Profiles and Match History UI in Unity.
- [ ] **Issue 5.5**: Add in-game Text Chat and Emotes.

---

## 🔴 Phase 6: Monetization & AI (Claude Code)
**Objective:** Shop, passes, and bot logic.
- [ ] **Issue 6.1**: Implement Offline AI opponent (Easy/Medium/Hard).
- [ ] **Issue 6.2**: Add server-side AFK detection and Auto-Play Bot takeover.
- [ ] **Issue 6.3**: Build the In-Game Store UI (Skins, Dice, Frames).
- [ ] **Issue 6.4**: Integrate Payment gateway / Virtual Economy APIs.

---

## ⚫ Phase 7: Quality & Release
**Objective:** Polish, testing, and deployment.
- [ ] **Issue 7.1**: DOTween UI Polish and Kawase Blur implementations.
- [ ] **Issue 7.2**: Implement FMOD/Unity Audio Manager and SFX.
- [ ] **Issue 7.3**: Memory profiling, Object Pooling, and 120 FPS optimization.
- [ ] **Issue 7.4**: Final deployment to production infrastructure.
