"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
/** Desired haulers per owned room (Phase 1 — flat; tuned in later phases). */
const HAULERS_PER_ROOM = 2;
/**
 * Derives empire objectives from the world model and decomposes them into
 * tasks / standing crews (the "task tree"). Re-planning is tick-gated and
 * governed; the per-tick hot path just executes the cached plan.
 *
 * Phase 1: emits a logistics objective per owned room that asks the kernel to
 * maintain a hauler crew. More objectives (mining, upgrade, build, defend,
 * expand, raid) decompose here in later phases.
 */
class Planner {
    plan(model, gov) {
        const objectives = [];
        for (const name of model.ownedRoomNames()) {
            if (!gov.canRun(2 /* Priority.Normal */))
                break;
            const room = model.rooms[name];
            const crew = {
                role: "hauler",
                roomName: name,
                count: HAULERS_PER_ROOM,
                needs: { carry: 1, move: 1 },
                unitBody: [CARRY, MOVE],
                taskKind: "haul",
                priority: 1 /* Priority.High */,
            };
            objectives.push({
                id: `${name}:logistics`,
                kind: "logistics",
                roomName: name,
                value: 200 + room.rcl * 10,
                priority: 1 /* Priority.High */,
                tasks: [],
                crew,
            });
        }
        objectives.sort((a, b) => b.value - a.value);
        return objectives;
    }
}
exports.Planner = Planner;
