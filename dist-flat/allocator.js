"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Allocator = void 0;
/**
 * Matches open tasks to the best-fit available creep; when none fits it would
 * emit a spawn request for a creep with the needed capability profile. In
 * "observe" mode it computes the plan but issues no commands or spawns.
 *
 * Phase 0: a creep is only considered "available" once it carries an explicit
 * `kernelTask` marker, so the kernel never touches creeps the old roles own.
 * Spawn-request emission and assignment application arrive in Phase 1+.
 */
class Allocator {
    allocate(objectives, model, gov, mode) {
        var _a, _b;
        const plan = {
            assignments: [],
            spawnRequests: [],
            unassignedTasks: 0,
        };
        const available = this.availableCreeps(model);
        for (const obj of objectives) {
            for (const task of obj.tasks) {
                if (!gov.canRun(task.priority, (_a = task.estCpu) !== null && _a !== void 0 ? _a : 0)) {
                    plan.unassignedTasks++;
                    continue;
                }
                const creep = this.bestFit(available, task.needs, (_b = task.pos) === null || _b === void 0 ? void 0 : _b.roomName);
                if (creep) {
                    plan.assignments.push({ creep: creep.name, task: task.id });
                    delete available[creep.name];
                }
                else {
                    plan.unassignedTasks++;
                    // Phase 1+: push a SpawnRequest onto plan.spawnRequests here.
                }
            }
        }
        // mode === "active" would apply assignments and submit spawns; in observe
        // mode we return the plan untouched for reporting only.
        return plan;
    }
    availableCreeps(model) {
        const available = {};
        for (const name in model.myCreeps) {
            const creep = model.myCreeps[name];
            // Only kernel-owned creeps are in play during the dormant phase.
            if (creep.memory.kernelTask) {
                available[name] = creep;
            }
        }
        return available;
    }
    bestFit(available, needs, roomName) {
        for (const name in available) {
            const creep = available[name];
            if (roomName && creep.room.name !== roomName)
                continue;
            if (this.satisfies(creep, needs))
                return creep;
        }
        return null;
    }
    satisfies(creep, needs) {
        const has = (part) => creep.getActiveBodyparts(part);
        if (needs.work && has(WORK) < needs.work)
            return false;
        if (needs.carry && has(CARRY) < needs.carry)
            return false;
        if (needs.move && has(MOVE) < needs.move)
            return false;
        if (needs.attack && has(ATTACK) < needs.attack)
            return false;
        if (needs.ranged && has(RANGED_ATTACK) < needs.ranged)
            return false;
        if (needs.heal && has(HEAL) < needs.heal)
            return false;
        if (needs.claim && has(CLAIM) < needs.claim)
            return false;
        if (needs.tough && has(TOUGH) < needs.tough)
            return false;
        return true;
    }
}
exports.Allocator = Allocator;
