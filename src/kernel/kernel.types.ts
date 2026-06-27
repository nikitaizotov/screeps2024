// Core type definitions for the kernel — the empire-wide task scheduler.
// Phase 0: types + seams only. Nothing in the kernel commands creeps yet;
// the old roles still fully own live behavior.

/** Lower number = more important. Critical work bypasses the CPU governor. */
export const enum Priority {
  Critical = 0,
  High = 1,
  Normal = 2,
  Low = 3,
  Idle = 4,
}

export type KernelMode = "off" | "observe" | "active";

/**
 * Minimum body capability a task needs from a creep. The allocator matches
 * these against a creep's active body parts; the spawner uses them to build
 * a fitting body when no existing creep qualifies.
 */
export interface CapabilityProfile {
  work?: number;
  carry?: number;
  move?: number;
  attack?: number;
  ranged?: number;
  heal?: number;
  claim?: number;
  tough?: number;
}

export type TaskKind =
  | "harvest"
  | "haul"
  | "build"
  | "upgrade"
  | "repair"
  | "claim"
  | "reserve"
  | "attack"
  | "heal"
  | "scout"
  | "idle";

/** A concrete, creep-assignable unit of work — a leaf of the task tree. */
export interface Task {
  id: string;
  kind: TaskKind;
  priority: Priority;
  roomName: string;
  /** Primary subject (source, site, structure, controller, creep). */
  targetId?: string;
  pos?: { x: number; y: number; roomName: string };
  needs: CapabilityProfile;
  /** Estimated CPU for one tick of execution (governor hint). */
  estCpu?: number;
  assignedCreep?: string;
}

export type ObjectiveKind =
  | "economy"
  | "upgrade"
  | "build"
  | "defend"
  | "expand"
  | "remoteMine"
  | "raid";

/** A high-level empire goal that decomposes into tasks. */
export interface Objective {
  id: string;
  kind: ObjectiveKind;
  /** Room this objective is anchored to (home or target). */
  roomName: string;
  /** Higher = more worth doing; drives ordering and priority. */
  value: number;
  priority: Priority;
  tasks: Task[];
}

/** A demand-driven request to spawn a creep matching a capability profile. */
export interface SpawnRequest {
  id: string;
  roomName: string;
  needs: CapabilityProfile;
  priority: Priority;
  /** Memory seed for the spawned creep. */
  memory: Record<string, unknown>;
}

/** What the allocator decided this tick. In observe mode it is only reported. */
export interface AllocationPlan {
  assignments: Array<{ creep: string; task: string }>;
  spawnRequests: SpawnRequest[];
  unassignedTasks: number;
}

/** Persisted kernel control state (Memory.kernel). */
export interface KernelMemory {
  enabled?: boolean;
  mode?: KernelMode;
  lastPlanTick?: number;
}
