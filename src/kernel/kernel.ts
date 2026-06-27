import { Allocator } from "./allocator";
import { CpuGovernor } from "./cpu.governor";
import { KernelMemory, KernelMode, Priority } from "./kernel.types";
import { Planner } from "./planner";
import { WorldModel } from "./world.model";

// Heap singletons — persist across ticks within a global, zero serialization.
const governor = new CpuGovernor();
const model = new WorldModel();
const planner = new Planner();
const allocator = new Allocator();

/** How often the objective/task plan is rebuilt. */
const PLAN_EVERY = 10;

/**
 * Kernel entry point. Wired into main.ts but invoked only when
 * Memory.kernel.enabled is true, so live behavior is untouched until we
 * deliberately turn it on.
 *
 * In "observe" mode (default) it builds the world model and the
 * task/allocation plan and reports periodically, without commanding any creep
 * — letting us measure the kernel's CPU overhead safely on the live colony.
 * "active" mode (Phase 1+) will run executors for assigned creeps.
 */
export function runKernel(): void {
  const mem: KernelMemory = Memory.kernel || {};
  const mode: KernelMode = mem.mode || "observe";
  if (mode === "off") return;

  governor.begin();
  model.refresh(governor);

  const shouldPlan =
    !mem.lastPlanTick || Game.time - mem.lastPlanTick >= PLAN_EVERY;

  if (shouldPlan && governor.canRun(Priority.Normal)) {
    const objectives = planner.plan(model, governor);
    const allocation = allocator.allocate(objectives, model, governor, mode);
    mem.lastPlanTick = Game.time;
    Memory.kernel = mem;

    if (Game.time % 50 === 0) {
      const tasks = objectives.reduce((n, o) => n + o.tasks.length, 0);
      console.log(
        `[kernel/${mode}] rooms=${model.ownedRoomNames().length} ` +
          `obj=${objectives.length} tasks=${tasks} ` +
          `unassigned=${allocation.unassignedTasks} ` +
          `cpu=${governor.used().toFixed(2)} bucket=${Game.cpu.bucket}`
      );
    }
  }

  // mode === "active": Phase 1+ runs task executors for assigned creeps here.
}
