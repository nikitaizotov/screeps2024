import { CreepRole } from "../role.interface";
import { WorkerTask } from "../constants/role.worker.const";
import { CreepService } from "../../services/creep.service";
// const profiler = require("./../../screeps-profiler");

const creepService = new CreepService();

const roleWorker: CreepRole = {
  creepsPerRoom: 4,
  namePrefix: "Worker",
  memoryKey: "worker",
  bodyParts: [WORK, CARRY, MOVE],
  maxBodyPartsMultiplier: 10,
  creepsPerSourcePositions: {
    "1": 3,
    "2": 3,
    "3": 3,
    "4": 3,
    "5": 3,
    "6": 3,
  },
  tasksPerRoom: {
    Transferring: { "1": 2, "2": 2, "3": 2, "4": 2, "5": 2 },
    Upgrading: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    Building: { "1": 1, "2": 1, "3": 1, "4": 1, "5": 1 },
  },

  run: function (creep: Creep) {
    // Do not disturb creep while its inside the spawn!
    if (creep.spawning) {
      return;
    }

    //creep.say(creep.memory.task);

    // If creep has its path, let's show it!
    creepService.drawPath(creep);
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
      default:
        creep.memory.task = WorkerTask.Harvesting;
    }
  },
};

// profiler.registerObject(roleWorker, "roleWorker");

export default roleWorker;
