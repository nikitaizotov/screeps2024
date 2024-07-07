// const profiler = require("./../../screeps-profiler");

import { CreepService } from "../../../services/creep.service";
import { WorkerTask } from "./worker.const";
import { CreepRole } from "../../role.interface";
import { WORKER_MEMORY_KEY } from "./worker.const";

const creepService = new CreepService();

const roleWorker: CreepRole = {
  // creepsPerRoom: 3,
  creepsPerRoom: 3,
  namePrefix: "Worker",
  memoryKey: WORKER_MEMORY_KEY,
  bodyParts: [WORK, CARRY, MOVE],
  maxBodyPartsMultiplier: 10,
  creepsPerSourcePositions: {
    "1": 3,
    "2": 3,
    "3": 3,
    "4": 3,
    "5": 3,
    "6": 3,
    "7": 3,
    "8": 3,
    "9": 3,
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
      default:
        creep.memory.task = WorkerTask.Harvesting;
    }
  },
};

// profiler.registerObject(roleWorker, "roleWorker");

export default roleWorker;
