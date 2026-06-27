"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTask = runTask;
const haul_executor_1 = require("./haul.executor");
/**
 * Dispatches a kernel-owned creep to the executor for its assigned task kind.
 * New task kinds (build/upgrade/repair/claim/attack/...) plug in here as later
 * phases migrate more concerns onto the kernel.
 */
function runTask(creep) {
    const kt = creep.memory.kernelTask;
    if (!kt)
        return;
    switch (kt.kind) {
        case "haul":
            (0, haul_executor_1.runHaul)(creep, kt);
            break;
        default:
            // Unknown/not-yet-migrated kind: leave the creep idle.
            break;
    }
}
