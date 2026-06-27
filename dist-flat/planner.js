"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
/**
 * Derives empire objectives from the world model and decomposes them into
 * concrete, creep-assignable tasks (the "task tree"). Re-planning is
 * tick-gated and governed; the per-tick hot path elsewhere just executes the
 * already-built plan.
 *
 * Phase 0 produces objectives and tasks as DATA only — to validate the
 * pipeline and measure cost. Nothing here acts on the game.
 */
class Planner {
    plan(model, gov) {
        const objectives = [];
        for (const name of model.ownedRoomNames()) {
            if (!gov.canRun(2 /* Priority.Normal */))
                break;
            const room = model.rooms[name];
            // One economy objective per owned room. The illustrative leaf tasks
            // (one harvest task per source) are placeholders until the executor
            // layer lands in Phase 1+.
            const tasks = room.sources.map((src) => {
                const needs = { work: 1, carry: 1, move: 1 };
                return {
                    id: `${name}:harvest:${src.id}`,
                    kind: "harvest",
                    priority: 1 /* Priority.High */,
                    roomName: name,
                    targetId: src.id,
                    pos: src.pos,
                    needs,
                    estCpu: 0.2,
                };
            });
            objectives.push({
                id: `${name}:economy`,
                kind: "economy",
                roomName: name,
                value: 100 + room.rcl * 10,
                priority: 1 /* Priority.High */,
                tasks,
            });
        }
        // Highest value first — the allocator and governor consume in this order.
        objectives.sort((a, b) => b.value - a.value);
        return objectives;
    }
}
exports.Planner = Planner;
