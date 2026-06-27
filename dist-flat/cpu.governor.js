"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CpuGovernor = void 0;
/**
 * Per-tick CPU budget governor — the mechanism behind the "20 CPU ceiling".
 *
 * Critical work always runs; everything else runs only while budget remains,
 * so the bot degrades gracefully (does the most valuable work it can afford)
 * as the number of rooms grows, and never blows the limit. The budget flexes
 * with the bucket: spend the surplus when the bucket is healthy, protect it
 * when it is low. Lives in heap as a kernel singleton (no serialization).
 */
class CpuGovernor {
    constructor() {
        this.budget = 0;
        this.startUsed = 0;
    }
    /** Call once at the start of the kernel tick. */
    begin() {
        this.startUsed = Game.cpu.getUsed();
        const rawLimit = Game.cpu.limit;
        const limit = rawLimit && isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;
        const bucket = Game.cpu.bucket;
        let factor = 0.85;
        if (bucket > 9000)
            factor = 1.6; // burn surplus
        else if (bucket < 2000)
            factor = 0.5; // protect the bucket
        this.budget = limit * factor;
    }
    /** CPU spent since begin() this tick. */
    used() {
        return Game.cpu.getUsed() - this.startUsed;
    }
    remaining() {
        return this.budget - this.used();
    }
    /** May a job of this priority run now? Critical bypasses the budget. */
    canRun(priority, estCost = 0) {
        if (priority <= 0 /* Priority.Critical */)
            return true;
        return this.remaining() - estCost > 0;
    }
}
exports.CpuGovernor = CpuGovernor;
