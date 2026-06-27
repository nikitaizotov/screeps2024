"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
/** Desired haulers per owned room (Phase 2 — flat; demand-scaled in Phase 3). */
const HAULERS_PER_ROOM = 2;
/**
 * Derives empire objectives from the world model and decomposes them into
 * tasks / standing crews (the "task tree"). Re-planning is tick-gated and
 * governed; the per-tick hot path just executes the cached plan.
 *
 * Phase 2: a logistics objective per owned room. Its hauler crew is requested
 * ONLY for rooms the kernel has been handed (Memory.kernel.takeover[room].
 * logistics) — so kernel haulers never collide with workers in rooms it doesn't
 * own. Mining/upgrade/build objectives decompose here in later phases.
 */
class Planner {
    plan(model, gov) {
        const objectives = [];
        const takeover = Memory.kernel && Memory.kernel.takeover;
        for (const name of model.ownedRoomNames()) {
            if (!gov.canRun(2 /* Priority.Normal */))
                break;
            const room = model.rooms[name];
            const obj = {
                id: `${name}:logistics`,
                kind: "logistics",
                roomName: name,
                value: 200 + room.rcl * 10,
                priority: 1 /* Priority.High */,
                tasks: [],
            };
            // Only run kernel haulers where logistics has been handed to the kernel.
            if (takeover && takeover[name] && takeover[name].logistics) {
                obj.crew = {
                    role: "hauler",
                    roomName: name,
                    count: HAULERS_PER_ROOM,
                    needs: { carry: 1, move: 1 },
                    unitBody: [CARRY, MOVE],
                    taskKind: "haul",
                    priority: 1 /* Priority.High */,
                };
            }
            objectives.push(obj);
        }
        objectives.sort((a, b) => b.value - a.value);
        return objectives;
    }
}
exports.Planner = Planner;
