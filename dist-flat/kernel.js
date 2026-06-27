"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKernel = runKernel;
const allocator_1 = require("./allocator");
const cpu_governor_1 = require("./cpu.governor");
const executor_1 = require("./executor");
const planner_1 = require("./planner");
const spawner_1 = require("./spawner");
const world_model_1 = require("./world.model");
// Heap singletons — persist across ticks within a global, zero serialization.
const governor = new cpu_governor_1.CpuGovernor();
const model = new world_model_1.WorldModel();
const planner = new planner_1.Planner();
const allocator = new allocator_1.Allocator();
const spawner = new spawner_1.KernelSpawner();
/** How often the objective/task plan is rebuilt; the plan is cached between. */
const PLAN_EVERY = 10;
let plan = [];
/**
 * Kernel entry point. Wired into main.ts but invoked only when
 * Memory.kernel.enabled is true, so live behavior is untouched until we turn
 * it on.
 *
 * - "observe": build model + plan and report; command nothing.
 * - "active":  maintain crews (spawn to demand) and run executors for
 *   kernel-owned creeps. Only creeps tagged with memory.kernelTask are touched.
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
        plan = planner.plan(model, governor);
        // Allocator runs for reporting / future discrete-task assignment.
        allocator.allocate(plan, model, governor, mode);
        mem.lastPlanTick = Game.time;
        Memory.kernel = mem;
    }
    if (mode === "active") {
        runActive(plan, governor);
    }
    if (Game.time % 50 === 0) {
        report(mode);
    }
}
function runActive(objectives, gov) {
    // 1. Keep standing crews topped up (demand-driven spawning).
    for (const obj of objectives) {
        if (obj.crew && gov.canRun(2 /* Priority.Normal */)) {
            spawner.maintainCrew(obj.crew);
        }
    }
    // 2. Drive every kernel-owned creep. Stop if we run out of budget so the
    //    bot degrades gracefully instead of overrunning the CPU limit.
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        if (!creep.memory.kernelTask)
            continue;
        if (!gov.canRun(1 /* Priority.High */, 0.3))
            break;
        (0, executor_1.runTask)(creep);
    }
}
function report(mode) {
    let kernelCreeps = 0;
    for (const name in Game.creeps) {
        if (Game.creeps[name].memory.kernelTask)
            kernelCreeps++;
    }
    const desired = plan.reduce((n, o) => n + (o.crew ? o.crew.count : 0), 0);
    console.log(`[kernel/${mode}] rooms=${model.ownedRoomNames().length} ` +
        `obj=${plan.length} crew=${kernelCreeps}/${desired} ` +
        `cpu=${governor.used().toFixed(2)} bucket=${Game.cpu.bucket}`);
}
