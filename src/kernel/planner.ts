import { CpuGovernor } from "./cpu.governor";
import { WorldModel } from "./world.model";
import { CapabilityProfile, Objective, Priority, Task } from "./kernel.types";

/**
 * Derives empire objectives from the world model and decomposes them into
 * concrete, creep-assignable tasks (the "task tree"). Re-planning is
 * tick-gated and governed; the per-tick hot path elsewhere just executes the
 * already-built plan.
 *
 * Phase 0 produces objectives and tasks as DATA only — to validate the
 * pipeline and measure cost. Nothing here acts on the game.
 */
export class Planner {
  plan(model: WorldModel, gov: CpuGovernor): Objective[] {
    const objectives: Objective[] = [];

    for (const name of model.ownedRoomNames()) {
      if (!gov.canRun(Priority.Normal)) break;
      const room = model.rooms[name];

      // One economy objective per owned room. The illustrative leaf tasks
      // (one harvest task per source) are placeholders until the executor
      // layer lands in Phase 1+.
      const tasks: Task[] = room.sources.map((src): Task => {
        const needs: CapabilityProfile = { work: 1, carry: 1, move: 1 };
        return {
          id: `${name}:harvest:${src.id}`,
          kind: "harvest",
          priority: Priority.High,
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
        priority: Priority.High,
        tasks,
      });
    }

    // Highest value first — the allocator and governor consume in this order.
    objectives.sort((a, b) => b.value - a.value);
    return objectives;
  }
}
