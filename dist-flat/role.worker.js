"use strict";
// const profiler = require("./screeps-profiler");
Object.defineProperty(exports, "__esModule", { value: true });
const creep_service_1 = require("./creep.service");
const worker_const_1 = require("./worker.const");
const worker_const_2 = require("./worker.const");
const creepService = new creep_service_1.CreepService();
const roleWorker = {
    creepsPerRoom: 4,
    namePrefix: "Worker",
    memoryKey: worker_const_2.WORKER_MEMORY_KEY,
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
    run: function (creep) {
        // Do not disturb creep while its inside the spawn!
        if (creep.spawning) {
            return;
        }
        // Bad solution.
        if (creep.pos.x === 0 ||
            creep.pos.x === 49 ||
            creep.pos.y === 0 ||
            creep.pos.y === 49) {
            creepService.taskReturnHome(creep);
            return;
        }
        // If creep has its path, let's show it!
        // creepService.drawPath(creep);
        switch (creep.memory.task) {
            case worker_const_1.WorkerTask.Harvesting:
                creepService.taskHarvest(creep);
                break;
            case worker_const_1.WorkerTask.Transferring:
                creepService.taskTransfer(creep);
                break;
            case worker_const_1.WorkerTask.Idling:
                if (creep.room.name !== creep.memory.spawnRoom) {
                    creepService.setTask(creep, worker_const_1.WorkerTask.ReturnHome);
                }
                break;
            case worker_const_1.WorkerTask.Upgrading:
                creepService.taskUpgrade(creep);
                break;
            case worker_const_1.WorkerTask.Building:
                creepService.taskBuild(creep);
                break;
            case worker_const_1.WorkerTask.FixingRampartsAndWalls:
                creepService.taskFixingWallsAndRamparts(creep);
                break;
            case worker_const_1.WorkerTask.ReturnHome:
                creepService.taskReturnHome(creep);
                break;
            default:
                creep.memory.task = worker_const_1.WorkerTask.Harvesting;
        }
    },
};
// profiler.registerObject(roleWorker, "roleWorker");
exports.default = roleWorker;
