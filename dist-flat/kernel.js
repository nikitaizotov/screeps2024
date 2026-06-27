"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKernel = runKernel;
const allocator_1 = require("./allocator");
const cpu_governor_1 = require("./cpu.governor");
const planner_1 = require("./planner");
const world_model_1 = require("./world.model");
// Heap singletons — persist across ticks within a global, zero serialization.
const governor = new cpu_governor_1.CpuGovernor();
const model = new world_model_1.WorldModel();
const planner = new planner_1.Planner();
const allocator = new allocator_1.Allocator();
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
function runKernel() {
    const mem = Memory.kernel || {};
    const mode = mem.mode || "observe";
    if (mode === "off")
        return;
    governor.begin();
    model.refresh(governor);
    const shouldPlan = !mem.lastPlanTick || Game.time - mem.lastPlanTick >= PLAN_EVERY;
    if (shouldPlan && governor.canRun(2 /* Priority.Normal */)) {
        const objectives = planner.plan(model, governor);
        const allocation = allocator.allocate(objectives, model, governor, mode);
        mem.lastPlanTick = Game.time;
        Memory.kernel = mem;
        if (Game.time % 50 === 0) {
            const tasks = objectives.reduce((n, o) => n + o.tasks.length, 0);
            console.log(`[kernel/${mode}] rooms=${model.ownedRoomNames().length} ` +
                `obj=${objectives.length} tasks=${tasks} ` +
                `unassigned=${allocation.unassignedTasks} ` +
                `cpu=${governor.used().toFixed(2)} bucket=${Game.cpu.bucket}`);
        }
    }
    // mode === "active": Phase 1+ runs task executors for assigned creeps here.
}
