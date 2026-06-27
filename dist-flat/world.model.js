"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldModel = void 0;
/**
 * Empire-wide world model — the single source of truth the planner reads.
 *
 * Lives in heap (a kernel singleton) and is refreshed incrementally and
 * tick-gated so it stays cheap as room count grows: volatile fields (energy,
 * threats) update often; structural fields (sources, spawns) update rarely
 * and only when the governor allows. Phase 0 gathers a light read-only
 * snapshot and issues no commands.
 */
class WorldModel {
    constructor() {
        this.rooms = {};
        this.myCreeps = {};
        this.updated = 0;
    }
    refresh(gov) {
        this.myCreeps = Game.creeps;
        for (const name in Game.rooms) {
            const room = Game.rooms[name];
            if (!room.controller || !room.controller.my)
                continue;
            const existing = this.rooms[name];
            const needsStructural = !existing || Game.time % WorldModel.STRUCTURAL_EVERY === 0;
            const view = existing || {
                name,
                rcl: 0,
                my: true,
                energyAvailable: 0,
                energyCapacity: 0,
                storedEnergy: 0,
                sources: [],
                spawnIds: [],
                hostiles: 0,
                updated: 0,
            };
            // Volatile, cheap — every refresh.
            view.rcl = room.controller.level;
            view.energyAvailable = room.energyAvailable;
            view.energyCapacity = room.energyCapacityAvailable;
            view.storedEnergy = room.storage
                ? room.storage.store[RESOURCE_ENERGY]
                : 0;
            // Structural, rare — and only if the governor has budget for the finds.
            if (needsStructural && gov.canRun(3 /* Priority.Low */, 0.5)) {
                view.sources = room.find(FIND_SOURCES).map((s) => ({
                    id: s.id,
                    pos: { x: s.pos.x, y: s.pos.y, roomName: name },
                }));
                view.spawnIds = room.find(FIND_MY_SPAWNS).map((s) => s.id);
            }
            // Threat read — gated; at scale this can be throttled further.
            if (gov.canRun(2 /* Priority.Normal */)) {
                view.hostiles = room.find(FIND_HOSTILE_CREEPS).length;
            }
            view.updated = Game.time;
            this.rooms[name] = view;
        }
        this.updated = Game.time;
    }
    ownedRoomNames() {
        return Object.keys(this.rooms);
    }
}
exports.WorldModel = WorldModel;
/** How often structural (rarely-changing) data is re-scanned. */
WorldModel.STRUCTURAL_EVERY = 100;
