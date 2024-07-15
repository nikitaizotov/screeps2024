import _ from "lodash";
import roleWorker from "./role.worker";
import { WorkerTask } from "./worker.const";
import { WORKER_MEMORY_KEY } from "./worker.const";
import { CacheService } from "../../../services/cache.service";
// const profiler = require("./../../screeps-profiler");

export class WorkerService {
  private cacheService = new CacheService();

  manageWorkers(): void {
    for (let spawnName in Game.spawns) {
      const spawn = Game.spawns[spawnName];
      const room = spawn.room;

      const workersIdling = _.filter(
        Game.creeps,
        (creep) =>
          creep.memory.role === WORKER_MEMORY_KEY &&
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

        if (
          enabledTask === WorkerTask.FixingRampartsAndWalls &&
          (!this.ifWallsAndRampartFixingNeeded(spawn) ||
            !Memory.roomData.fixingWallsRampartsEnabled[room.name])
        ) {
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
            creep.memory.role === roleWorker.memoryKey &&
            creep.room.name === spawn.room.name &&
            creep.memory.task === enabledTask
        );

        // Debug
        // if (enabledTask === WorkerTask.Building) {
        //   console.log(
        //     `BUILDERS: ${workersOnTask.length} IDLING: ${workersIdling.length}`
        //   );
        // }

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
    try {
      const spawns = this.cacheService.findSpawns(spawn.room);
      const towers = this.cacheService.findTowers(spawn.room);
      const extensions = this.cacheService.findExtensions(spawn.room);

      const targets = [...spawns, ...towers, ...extensions].filter(
        (
          structure
        ): structure is StructureSpawn | StructureTower | StructureExtension =>
          (structure instanceof StructureSpawn ||
            structure instanceof StructureTower ||
            structure instanceof StructureExtension) &&
          structure.store &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      );

      return targets.length !== 0;
    } catch (error: any) {
      console.log(`Error in isTransferNeeded: ${error.message}`);
      return false;
    }
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

  ifWallsAndRampartFixingNeeded(spawn: StructureSpawn): boolean {
    try {
      const walls = this.cacheService.findWalls(spawn.room);
      const ramparts = this.cacheService.findRamparts(spawn.room);

      const targets = [...walls, ...ramparts].filter(
        (structure): structure is StructureWall | StructureRampart =>
          (structure instanceof StructureWall ||
            structure instanceof StructureRampart) &&
          structure.hits < structure.hitsMax
      );

      if (targets.length > 0) {
        return true;
      }

      return false;
    } catch (error: any) {
      console.log(`Error in ifWallsAndRampartFixingNeeded: ${error.message}`);
      return false;
    }
  }

  // isFixingRampartsAndWallsNeeded(room: Room): boolean {
  //   const targets: AnyStructure[] = room.find(FIND_STRUCTURES, {
  //     filter: (structure) => {
  //       return (
  //         10000 < structure.hitsMax &&
  //         structure.structureType !== STRUCTURE_WALL &&
  //         structure.structureType !== STRUCTURE_RAMPART
  //       );
  //     },
  //   });
  //   return false;
  // }
}

// profiler.registerClass(WorkerService, "WorkerService");
