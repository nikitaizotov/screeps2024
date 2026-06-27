import { runHaul } from "./haul.executor";
import { KernelTaskMemory } from "./kernel.types";

/**
 * Dispatches a kernel-owned creep to the executor for its assigned task kind.
 * New task kinds (build/upgrade/repair/claim/attack/...) plug in here as later
 * phases migrate more concerns onto the kernel.
 */
export function runTask(creep: Creep): void {
  const kt = creep.memory.kernelTask as KernelTaskMemory | undefined;
  if (!kt) return;

  switch (kt.kind) {
    case "haul":
      runHaul(creep, kt);
      break;
    default:
      // Unknown/not-yet-migrated kind: leave the creep idle.
      break;
  }
}
