export const WORKER_MEMORY_KEY = "worker";

export type WorkerTaskType =
  | "Harvesting"
  | "Transferring"
  | "Upgrading"
  | "Building"
  | "Fixing"
  | "FixingRampartsAndWalls"
  | "Idling"
  | "ReturnHome";

export const WorkerTask: any = {
  Harvesting: "Harvesting" as WorkerTaskType,
  Transferring: "Transferring" as WorkerTaskType,
  Upgrading: "Upgrading" as WorkerTaskType,
  Building: "Building" as WorkerTaskType,
  Fixing: "Fixing" as WorkerTaskType,
  Idling: "Idling" as WorkerTaskType,
  FixingRampartsAndWalls: "FixingRampartsAndWalls" as WorkerTaskType,
  ReturnHome: "ReturnHome" as WorkerTaskType,
};
