import creepService from "../services/creep.service";
import { CreepRole } from "./role.interface";
import { WorkerTask } from "./constants/role.worker.const";

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
    "4": 4,
    "5": 4,
    "6": 4,
  },
  tasksPerRoom: {
    Transferring: { "1": 1, "2": 1, "3": 1, "4": 2, "5": 2 },
  },

  run: function (creep: Creep) {
    // Do not disturb creep while its inside the spawn!
    if (creep.spawning) {
      return;
    }

    creep.say(creep.memory.task);

    // If creep has its path, let's show it!
    creepService.drawPath(creep);
    console.log(
      "creep.memory.taskcreep.memory.taskcreep.memory.task",
      creep.memory.task
    );
    switch (creep.memory.task) {
      case WorkerTask.Harvesting:
        creepService.taskHarvest(creep);
        break;
      case WorkerTask.Transferring:
        console.log("TransferringTransferringTransferringTransferring");
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
