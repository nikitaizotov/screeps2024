"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerService = void 0;
const lodash_1 = __importDefault(require("lodash"));
const role_worker_const_1 = require("./role.worker.const");
const role_worker_1 = __importDefault(require("./role.worker"));
// const profiler = require("./screeps-profiler");
class WorkerService {
    manageWorkers() {
        for (let spawnName in Game.spawns) {
            const spawn = Game.spawns[spawnName];
            const room = spawn.room;
            const workersIdling = lodash_1.default.filter(Game.creeps, (creep) => creep.memory.role === "worker" &&
                creep.room.name === spawn.room.name &&
                creep.memory.task === role_worker_const_1.WorkerTask.Idling);
            if (!role_worker_1.default.tasksPerRoom) {
                return;
            }
            const enabledTasks = Object.keys(role_worker_1.default.tasksPerRoom);
            for (let enabledTask of enabledTasks) {
                const workersPlanned = role_worker_1.default.tasksPerRoom[enabledTask];
                if (enabledTask === role_worker_const_1.WorkerTask.Transferring &&
                    !this.isTransferNeeded(spawn)) {
                    continue;
                }
                if (enabledTask === role_worker_const_1.WorkerTask.Building && !this.isBuildNeeded(spawn)) {
                    continue;
                }
                const workersPrrPosition = Object.keys(workersPlanned);
                const workersRequiredPerTask = workersPlanned[Memory.roomData.sourcePositions[room.name]]
                    ? workersPlanned[Memory.roomData.sourcePositions[room.name]]
                    : workersPlanned[workersPrrPosition.length - 1];
                const workersOnTask = lodash_1.default.filter(Game.creeps, (creep) => creep.memory.role === "worker" &&
                    creep.room.name === spawn.room.name &&
                    creep.memory.task === enabledTask);
                if (workersIdling.length !== 0 &&
                    workersOnTask.length < workersRequiredPerTask) {
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
                    creep.memory.task = role_worker_const_1.WorkerTask.Upgrading;
                }
            }
        }
    }
    isTransferNeeded(spawn) {
        const targets = spawn.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return ((structure.structureType === STRUCTURE_SPAWN ||
                    structure.structureType === STRUCTURE_TOWER ||
                    structure.structureType === STRUCTURE_EXTENSION) &&
                    structure.store &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
            },
        });
        return targets.length !== 0;
    }
    isBuildNeeded(spawn) {
        const targets = spawn.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.hits < structure.hitsMax &&
                    structure.structureType !== STRUCTURE_WALL &&
                    structure.structureType !== STRUCTURE_RAMPART);
            },
        });
        if (targets.length > 0) {
            return true;
        }
        else {
            const constructionSites = spawn.room.find(FIND_CONSTRUCTION_SITES);
            if (constructionSites.length > 0) {
                return true;
            }
        }
        return false;
    }
}
exports.WorkerService = WorkerService;
// profiler.registerClass(WorkerService, "WorkerService");
