"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var creep_service_1 = __importDefault(require("./creep.service"));
var role_worker_const_1 = require("./role.worker.const");
var roleWorker = {
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
    run: function (creep) {
        // Do not disturb creep while its inside the spawn!
        if (creep.spawning) {
            return;
        }
        creep.say(creep.memory.task);
        // If creep has its path, let's show it!
        creep_service_1.default.drawPath(creep);
        console.log("creep.memory.taskcreep.memory.taskcreep.memory.task", creep.memory.task);
        switch (creep.memory.task) {
            case role_worker_const_1.WorkerTask.Harvesting:
                creep_service_1.default.taskHarvest(creep);
                break;
            case role_worker_const_1.WorkerTask.Transferring:
                console.log("TransferringTransferringTransferringTransferring");
                creep_service_1.default.taskTransfer(creep);
                break;
            case role_worker_const_1.WorkerTask.Idling:
                console.log("Creep ".concat(creep.name, " is idling."));
                break;
            default:
                creep.memory.task = role_worker_const_1.WorkerTask.Harvesting;
        }
        // if (!creep.memory.task) {
        //   creep.memory.task = WorkerTask.Harvesting;
        // } else {
        //   switch
        // }
    },
};
exports.default = roleWorker;
