// const profiler = require("./../../screeps-profiler");

import { CreepService } from "../../../services/creep.service";
import { WorkerTask } from "./worker.const";
import { CreepRole } from "../../role.interface";
import { WORKER_MEMORY_KEY } from "./worker.const";

const creepService = new CreepService();

const roleWorker: CreepRole = {
  creepsPerRoom: 4,
  namePrefix: "Worker",
  memoryKey: WORKER_MEMORY_KEY,
  bodyParts: [WORK, CARRY, MOVE],
  maxBodyPartsMultiplier: 10,
  creepsPerSourcePositions: {
    "1": 4,
    "2": 4,
    "3": 4,
    "4": 4,
    "5": 4,
    "6": 4,
    "7": 4,
    "8": 4,
    "9": 4,
  },
  tasksPerRoom: {
    Transferring: {
      "1": 1,
      "2": 1,
      "3": 1,
      "4": 1,
      "5": 1,
      "6": 1,
      "7": 1,
      "8": 1,
      "9": 1,
    },
    Building: {
      "1": 1,
      "2": 1,
      "3": 1,
      "4": 1,
      "5": 1,
      "6": 1,
      "7": 1,
      "8": 1,
      "9": 1,
    },
    Upgrading: {
      "1": 1,
      "2": 1,
      "3": 1,
      "4": 1,
      "5": 1,
      "6": 1,
      "7": 1,
      "8": 1,
      "9": 1,
    },
    FixingRampartsAndWalls: {
      "1": 1,
      "2": 1,
      "3": 1,
      "4": 1,
      "5": 1,
      "6": 1,
      "7": 1,
      "8": 1,
      "9": 1,
    },
  },

  run: function (creep: Creep) {
    // Do not disturb creep while its inside the spawn!
    if (creep.spawning) {
      return;
    }

    // if (creep.name === "Worker60015595")
    //   console.log(
    //     creep.room.name,
    //     creep.memory.spawnRoom,
    //     creep.memory.task,
    //     "#",
    //     creep.room.name !== creep.memory.spawnRoom,
    //     creep.memory.task === WorkerTask.idling
    //   );

    // if (
    //   creep.room.name !== creep.memory.spawnRoom &&
    //   creep.memory.task === WorkerTask.idling
    // ) {
    //   creepService.setTask(creep, WorkerTask.ReturnHome);
    //   creep.say("HOME");
    // }

    // if (creep.name === "Worker60015595")
    //   console.log(
    //     creep.room.name,
    //     creep.memory.spawnRoom,
    //     creep.memory.task,
    //     "@",
    //     creep.room.name !== creep.memory.spawnRoom,
    //     creep.memory.task === WorkerTask.idling
    //   );

    //creep.say(creep.memory.task);

    // If creep has its path, let's show it!
    // creepService.drawPath(creep);
    switch (creep.memory.task) {
      case WorkerTask.Harvesting:
        creepService.taskHarvest(creep);
        break;
      case WorkerTask.Transferring:
        creepService.taskTransfer(creep);
        break;
      case WorkerTask.Idling:
        if (creep.room.name !== creep.memory.spawnRoom) {
          creepService.setTask(creep, WorkerTask.ReturnHome);
        }

        console.log(`Creep ${creep.name} is idling.`);
        break;
      case WorkerTask.Upgrading:
        creepService.taskUpgrade(creep);
        break;
      case WorkerTask.Building:
        creepService.taskBuild(creep);
        break;
      case WorkerTask.FixingRampartsAndWalls:
        creepService.taskFixingWallsAndRamparts(creep);
        break;
      case WorkerTask.ReturnHome:
        creepService.taskReturnHome(creep);
        break;
      default:
        creep.memory.task = WorkerTask.Harvesting;
    }
  },
};

// profiler.registerObject(roleWorker, "roleWorker");

export default roleWorker;
