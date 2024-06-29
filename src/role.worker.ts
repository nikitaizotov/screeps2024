import creepService from "./creep.service";
import { CreepRole } from "./role.interface";
import { WorkerTask } from "./role.worker.const";

const roleWorker: CreepRole = {
  creepsPerRoom: 16,
  namePrefix: "Worker",
  memoryKey: "worker",
  bodyParts: [WORK, CARRY, MOVE],
  maxBodyPartsMultiplier: 5,
  creepsPerSourcePositions: {
    "1": 3,
    "2": 3,
    "3": 6,
    "4": 9,
    "5": 12,
    "6": 15,
  },
  tasksPerRoom: {
    Transferring: { "1": 1, "2": 2, "3": 3, "4": 4, "5": 4 },
  },

  run: function (creep: Creep) {
    // Do not disturb creep while its inside the spawn!
    if (creep.spawning) {
      return;
    }

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
      default:
        creep.memory.task = WorkerTask.Harvesting;
    }

    // if (!creep.memory.task) {
    //   creep.memory.task = WorkerTask.Harvesting;
    // } else {
    //   switch
    // }
  },
};

export default roleWorker;
