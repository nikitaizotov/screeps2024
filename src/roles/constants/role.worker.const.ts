export type WorkerTaskType =
  | "Harvesting"
  | "Transferring"
  | "Upgrading"
  | "Building"
  | "Fixing"
  | "Idling";

export const WorkerTask: any = {
  Harvesting: "Harvesting" as WorkerTaskType,
  Transferring: "Transferring" as WorkerTaskType,
  Upgrading: "Upgrading" as WorkerTaskType,
  Building: "Building" as WorkerTaskType,
  Fixing: "Fixing" as WorkerTaskType,
  Idling: "Idling" as WorkerTaskType,
};
