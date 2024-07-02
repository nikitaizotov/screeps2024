import _ from "lodash";
import { WorkerTask } from "../roles/constants/role.worker.const";
import roleWorker from "../roles/role.worker";

export class WorkerService {
  manageWorkers(): void {
    for (let spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      const room = spawn.room;

      const workersIdling = _.filter(
        Game.creeps,
        (creep) =>
          creep.memory.role === "worker" &&
          creep.room.name === spawn.room.name &&
          creep.memory.task === WorkerTask.Idling
      );

      if (!roleWorker.tasksPerRoom) {
        return;
      }

      const enabledTasks = Object.keys(roleWorker.tasksPerRoom);

      for (let enabledTask of enabledTasks) {
        const workersPlanned =
          roleWorker.tasksPerRoom[
            enabledTask as keyof typeof roleWorker.tasksPerRoom
          ];

        const workersPrrPosition = Object.keys(workersPlanned);

        const workersRequiredPerTask = workersPlanned[
          Memory.roomData.sourcePositions[room.name]
        ]
          ? workersPlanned[Memory.roomData.sourcePositions[room.name]]
          : workersPlanned[workersPrrPosition.length - 1];

        const workersOnTask = _.filter(
          Game.creeps,
          (creep) =>
            creep.memory.role === "worker" &&
            creep.room.name === spawn.room.name &&
            creep.memory.task === enabledTask
        );

        if (
          workersIdling.length !== 0 &&
          workersRequiredPerTask !== 0 &&
          workersOnTask.length < workersRequiredPerTask
        ) {
          const worker = workersIdling.shift();
          if (worker) {
            const creep = Game.getObjectById(worker.id);
            if (creep) {
              creep.memory.task = enabledTask;
              creep.memory.path = undefined;
              creep.memory.targetId = null;
            }
          }
        }
      }
    }
  }
}
