import _ from "lodash";
import { WorkerTask } from "../constants/role.worker.const";
import roleWorker from "./role.worker";
const profiler = require("./../../screeps-profiler");

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

        if (
          enabledTask === WorkerTask.Transferring &&
          !this.isTransferNeeded(spawn)
        ) {
          continue;
        }

        if (enabledTask === WorkerTask.Building && !this.isBuildNeeded(spawn)) {
          continue;
        }

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
          workersOnTask.length < workersRequiredPerTask
        ) {
          const worker = workersIdling.shift();
          if (worker) {
            const creep = Game.getObjectById(worker.id);
            if (creep) {
              creep.memory.path = undefined;
              creep.memory.targetId = null;
              creep.memory.task = enabledTask;
            }
          }
        }
      }

      if (workersIdling.length > 0) {
        for (let creep of workersIdling) {
          creep.memory.path = undefined;
          creep.memory.targetId = null;
          creep.memory.task = WorkerTask.Upgrading;
        }
      }
    }
  }

  isTransferNeeded(spawn: StructureSpawn): boolean {
    const targets = spawn.room.find(FIND_STRUCTURES, {
      filter: (structure: AnyStructure) => {
        return (
          (structure.structureType === STRUCTURE_SPAWN ||
            structure.structureType === STRUCTURE_TOWER ||
            structure.structureType === STRUCTURE_EXTENSION) &&
          structure.store &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
      },
    });
    return targets.length !== 0;
  }

  isBuildNeeded(spawn: StructureSpawn): boolean {
    const targets: AnyStructure[] = spawn.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (
          structure.hits < structure.hitsMax &&
          structure.structureType !== STRUCTURE_WALL &&
          structure.structureType !== STRUCTURE_RAMPART
        );
      },
    });

    if (targets.length > 0) {
      return true;
    } else {
      const constructionSites = spawn.room.find(FIND_CONSTRUCTION_SITES);
      if (constructionSites.length > 0) {
        return true;
      }
    }

    return false;
  }
}

// profiler.registerClass(WorkerService, "WorkerService");
