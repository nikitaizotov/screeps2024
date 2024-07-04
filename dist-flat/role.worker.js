"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const creep_service_1 = __importDefault(require("./creep.service"));
const role_worker_const_1 = require("./role.worker.const");
// const profiler = require("./screeps-profiler");
const roleWorker = {
    creepsPerRoom: 4,
    namePrefix: "Worker",
    memoryKey: "worker",
    bodyParts: [WORK, CARRY, MOVE],
    maxBodyPartsMultiplier: 10,
    creepsPerSourcePositions: {
        "1": 3,
        "2": 4,
        "3": 4,
        "4": 4,
        "5": 4,
        "6": 4,
    },
    tasksPerRoom: {
        Transferring: { "1": 2, "2": 2, "3": 2, "4": 2, "5": 2 },
        Upgrading: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        Building: { "1": 1, "2": 1, "3": 1, "4": 1, "5": 1 },
    },
    run: function (creep) {
        // Do not disturb creep while its inside the spawn!
        if (creep.spawning) {
            return;
        }
        //creep.say(creep.memory.task);
        // If creep has its path, let's show it!
        creep_service_1.default.drawPath(creep);
        switch (creep.memory.task) {
            case role_worker_const_1.WorkerTask.Harvesting:
                creep_service_1.default.taskHarvest(creep);
                break;
            case role_worker_const_1.WorkerTask.Transferring:
                creep_service_1.default.taskTransfer(creep);
                break;
            case role_worker_const_1.WorkerTask.Idling:
                console.log(`Creep ${creep.name} is idling.`);
                break;
            case role_worker_const_1.WorkerTask.Upgrading:
                creep_service_1.default.taskUpgrade(creep);
                break;
            case role_worker_const_1.WorkerTask.Building:
                creep_service_1.default.taskBuild(creep);
                break;
            default:
                creep.memory.task = role_worker_const_1.WorkerTask.Harvesting;
        }
    },
};
// profiler.registerObject(roleWorker, "roleWorker");
exports.default = roleWorker;
