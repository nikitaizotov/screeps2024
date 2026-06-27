# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A bot (AI) for the game [Screeps](https://screeps.com/), written in TypeScript. Screeps runs your compiled code once per game tick via an exported `module.exports.loop` function. All persistent state lives in the global `Memory` object (serialized to JSON between ticks); there is no other storage. CPU per tick is strictly budgeted, which is why so much of this codebase is about caching to avoid re-running expensive lookups every tick.

## Commands

- `npm run local` — compile: clears `dist/`, runs `tsc`, then flattens to `dist-flat/`. Use this to verify a change builds.
- `npm run build` — build the deploy artifact: same as `local` but also clears `dist-flat/` first, producing the committed flat JS in `dist-flat/` that Screeps deploys (see Deploy below). No upload step — deploy is via git push.

There is no test suite, linter, or test runner configured. The only correctness check available locally is `tsc` (via `npm run local`). Behavior is verified by deploying and watching the in-game console (the bot logs heavily via `console.log`).

### Build pipeline (important)

The deploy is a three-stage transform, and the middle stage is non-obvious:

1. `tsc` compiles `src/**/*` → `dist/`, **preserving the directory structure**.
2. `flattenDist.js` copies every file from `dist/` into a single flat `dist-flat/` directory (via `path.basename`) and rewrites every `require("..../foo")` to `require("./foo")`.

`dist-flat/` is **committed** (not gitignored) — Screeps runs flat JS, so this folder is the deploy artifact that gets synced to the game.

Screeps does not support subdirectories or relative path imports — every module must sit in one flat namespace. This has two consequences you must respect:

- **Filenames must be globally unique across the entire `src` tree.** Two files with the same basename collide silently when flattened (the second overwrites the first). There is already a latent collision: `src/roles/role.interface.ts` and `src/roles/interfaces/role.interface.ts`. Don't add more, and be wary when renaming.
- The flatten regex rewrites imports to `./<basename>`, so deep relative import paths in source are fine — they're normalized at build time.

### Deploy

Deployment is via **Screeps GitHub auto-sync** (Account → GitHub, repo `screeps2024`), not grunt. Screeps pulls the committed `dist-flat/` folder from the **`stable`** git branch into the in-game `stable` branch, so **pushing `stable` = deploying to live**.

Workflow: develop TS on `default`; to ship a completed step → `npm run build` (regenerates `dist-flat/`) → commit `dist-flat/` (+ source) → merge into `stable` and push. The old grunt path is retired; `Gruntfile.js` stays gitignored and unused.

## Runtime architecture

`src/main.ts` is the entry point. Each tick it constructs (or reuses) a single `RoomService` and calls three routines in order:

```
roomService.cacheRoutines()    // refresh Memory caches, clean dead-creep memory
roomService.creepRoutines()    // spawn creeps, then run each creep's role logic
roomService.structureRoutines() // run build planner, then towers + links
```

`RoomService` (`src/services/room.service.ts`) is the orchestrator and owns instances of every role and service. Two cross-cutting patterns dominate the whole codebase:

- **Tick-gated scheduling.** Expensive work is throttled with `if (Game.time % N !== 0) return;`. Different N per concern (sources cached every 1000 ticks, construction sites every 10, build steps at 90/111/222/233/244, etc.). When adding periodic work, follow this convention rather than running it every tick.
- **Defensive `try/catch` per routine.** Nearly every method wraps its body in `try/catch` and logs `Error in <name>: ...`. A throw in one subsystem must not break the whole loop. Preserve this when editing.

### Roles (creep behavior)

A role is an object/class implementing the `CreepRole` interface (`src/roles/role.interface.ts`): `memoryKey`, `namePrefix`, `bodyParts` (+ optional `baseBodyParts`), `creepsPerRoom` / `creepsPerSourcePositions`, `maxBodyPartsMultiplier`, and a `run(creep)` method.

The active set is the `enabledRoles` array in the `RoomService` constructor — **to enable/disable a role, edit that array.** Several roles (scout, ranged/military) exist in the tree but are currently commented out there. `spawnCreeps()` iterates `enabledRoles`, counts existing creeps of each role per room, computes affordable body size from available energy, and spawns; some roles (miner, link manager) have special-cased count logic inline in `spawnCreeps()`.

The main role is the **worker** (`src/roles/room-creeps/worker/`), a state machine: its `memory.task` (Harvesting → Transferring/Upgrading/Building/FixingRampartsAndWalls/ReturnHome/Idling, see `worker.const.ts`) selects which `CreepService.task*` method runs. Task transitions go through `CreepService.setTask`, which always clears `path` and `targetId`.

### Services

- **`CacheService`** (`src/services/cache.service.ts`) — caches structure/source **IDs** (not objects) in `Memory.cache[<type>][roomName]`. Every `find*` method follows the same shape: ensure cache exists, resolve cached IDs via `Game.getObjectById`, and **fall back to a live `room.find(...)` if any ID is stale/missing**. When you need structures, prefer these `find*` helpers over calling `room.find` directly.
- **`CreepService`** (`src/services/creep.service.ts`) — all movement, harvesting, and per-task logic. Notable: `getPath` caches computed paths in `Memory.cacheCreepPaths[roomName][<startPos>:<endPos>]` keyed by coordinates, tracks `usedTimes`/`lastAccessed`, and these are pruned by `clearCreepPathCache`. `moveByPath` invalidates a cached path on `ERR_NOT_FOUND`/`ERR_INVALID_ARGS` or when a creep is stuck (`isCreepIsStuck` counts ticks with unchanged position+energy).
- **`BuildService`** (`src/services/build-service/`) — the base planner. Places structures in a checkerboard spiral out from room center (25,25), respecting `buildOrder`, exit-restricted zones, road corridors, and terrain; also walls/ramparts off room exits (`blockExits`) and plans roads. Caches terrain and structure snapshots in `Memory`.
- **`structures/`** — `LinkManager` (transfers energy from source-links to the storage-link) and `TowerManager` run in `structureRoutines`. The storage-link is identified by `Memory.roomData.links[room][linkId].storageLink === true`.

### Memory layout

The `Memory` shape is declared in `src/types/screeps.d.ts` (`CreepMemory`, `RoomData`, `Memory`). Key regions:

- `Memory.cache` — structure/source ID caches (managed by `CacheService`).
- `Memory.cacheCreepPaths` — coordinate-keyed path cache (managed by `CreepService`).
- `Memory.roomData` — per-room derived facts: `sourcePositions` (count of mineable tiles around sources, drives creep counts), `links`, `exits`, `fixingWallsRampartsEnabled` (a hysteresis flag toggled in `isFixingWallsNeeded` to start/stop wall repair between 650k–700k hits).
- `Memory.structureCache` / `exitZones` / `roomTerrain` — build-planner caches.

`Memory.roomData` is initialized in `main.ts`; `Memory.cache` is lazily initialized by `CacheService.initCacheIfNotExist`. When adding a new `Memory` field, declare it in `screeps.d.ts` and guard reads with existence checks (Memory may be empty on a fresh server).

## Kernel (`src/kernel/`) — the new architecture, in progress

The long-term direction is to replace the role-fixed, single-room logic with an **empire-wide task scheduler**: one brain that models all rooms, derives value-scored objectives, decomposes them into creep-assignable tasks (the "task tree"), assigns tasks to the best-fit creeps (spawning to demand), and runs it all under a hard CPU budget. The seam files:

- `kernel.types.ts` — `Priority`, `CapabilityProfile`, `Task`, `Objective`, `SpawnRequest`, `KernelMemory`.
- `cpu.governor.ts` — `CpuGovernor`: per-tick budget that flexes with `Game.cpu.bucket`; `canRun(priority, estCost)` gates non-critical work so the bot degrades gracefully instead of overrunning the ~20 CPU cap.
- `world.model.ts` — heap-singleton snapshot of owned rooms/creeps, refreshed incrementally and tick-gated.
- `planner.ts` → `allocator.ts` → (executors, Phase 1+) — model → objectives/tasks → creep assignments.
- `kernel.ts` — `runKernel()` ties it together as heap singletons.

**It is dormant.** `main.ts` calls `runKernel()` only when `Memory.kernel.enabled === true` (lazy `require`, so when off it never even loads). Default off → the old roles run live, unchanged. Modes: `off` / `observe` (build model + plan + report, command nothing) / `active` (Phase 1+, runs executors). Migration is concern-by-concern (logistics first), each landed dormant on `stable`, enabled behind the flag, verified in-game, then made default. **Do not wire kernel logic into `RoomService`/`enabledRoles`; keep the two systems separate until a concern is fully migrated.**

## Conventions & in-progress work

- There is an **active migration** from direct `room.find(...)` calls to `CacheService.find*`. These used to be flagged with `console.log("FIND NOT MIGRATED YET ...")` markers; those per-tick logs were removed for CPU, but the migration itself is incomplete — still-direct `room.find` on hot paths (e.g. `creep.service.ts` `taskTransfer`, `worker.service.ts` `isBuildNeeded`) are the next targets. Prefer `CacheService.find*` over `room.find` in new code.
- **CPU is the binding constraint** (~20 CPU on official MMO). Avoid per-tick `console.log` (each costs CPU), avoid `room.find` on hot paths when a cache exists, and don't store large/derived data in `Memory` (it's JSON-serialized every tick). Terrain, for example, is heap-cached via `getRoomTerrain` in `build.service.ts`, **not** stored in `Memory`. Follow that pattern for any static, regenerable data.
- Comments are mixed English/Russian; matching the surrounding style is fine either way.
- `screeps-profiler` integration is wired throughout but commented out (`// profiler.*`). Leave it unless profiling is explicitly requested.
- There is dead/commented-out code (old `taskReturnHome`, scout spawn logic, etc.) and a `webpack.config.js` that is **not** part of the active build (the pipeline is `tsc` + flatten, not webpack). Don't assume commented blocks reflect current behavior.
