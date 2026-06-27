import { CpuGovernor } from "./cpu.governor";
import { WorldModel } from "./world.model";
import {
  AllocationPlan,
  CapabilityProfile,
  KernelMode,
  Objective,
} from "./kernel.types";

/**
 * Matches open tasks to the best-fit available creep; when none fits it would
 * emit a spawn request for a creep with the needed capability profile. In
 * "observe" mode it computes the plan but issues no commands or spawns.
 *
 * Phase 0: a creep is only considered "available" once it carries an explicit
 * `kernelTask` marker, so the kernel never touches creeps the old roles own.
 * Spawn-request emission and assignment application arrive in Phase 1+.
 */
export class Allocator {
  allocate(
    objectives: Objective[],
    model: WorldModel,
    gov: CpuGovernor,
    mode: KernelMode
  ): AllocationPlan {
    const plan: AllocationPlan = {
      assignments: [],
      spawnRequests: [],
      unassignedTasks: 0,
    };

    const available = this.availableCreeps(model);

    for (const obj of objectives) {
      for (const task of obj.tasks) {
        if (!gov.canRun(task.priority, task.estCpu ?? 0)) {
          plan.unassignedTasks++;
          continue;
        }

        const creep = this.bestFit(available, task.needs, task.pos?.roomName);
        if (creep) {
          plan.assignments.push({ creep: creep.name, task: task.id });
          delete available[creep.name];
        } else {
          plan.unassignedTasks++;
          // Phase 1+: push a SpawnRequest onto plan.spawnRequests here.
        }
      }
    }

    // mode === "active" would apply assignments and submit spawns; in observe
    // mode we return the plan untouched for reporting only.
    return plan;
  }

  private availableCreeps(model: WorldModel): { [name: string]: Creep } {
    const available: { [name: string]: Creep } = {};
    for (const name in model.myCreeps) {
      const creep = model.myCreeps[name];
      // Only kernel-owned creeps are in play during the dormant phase.
      if ((creep.memory as { kernelTask?: unknown }).kernelTask) {
        available[name] = creep;
      }
    }
    return available;
  }

  private bestFit(
    available: { [name: string]: Creep },
    needs: CapabilityProfile,
    roomName?: string
  ): Creep | null {
    for (const name in available) {
      const creep = available[name];
      if (roomName && creep.room.name !== roomName) continue;
      if (this.satisfies(creep, needs)) return creep;
    }
    return null;
  }

  private satisfies(creep: Creep, needs: CapabilityProfile): boolean {
    const has = (part: BodyPartConstant) => creep.getActiveBodyparts(part);
    if (needs.work && has(WORK) < needs.work) return false;
    if (needs.carry && has(CARRY) < needs.carry) return false;
    if (needs.move && has(MOVE) < needs.move) return false;
    if (needs.attack && has(ATTACK) < needs.attack) return false;
    if (needs.ranged && has(RANGED_ATTACK) < needs.ranged) return false;
    if (needs.heal && has(HEAL) < needs.heal) return false;
    if (needs.claim && has(CLAIM) < needs.claim) return false;
    if (needs.tough && has(TOUGH) < needs.tough) return false;
    return true;
  }
}
