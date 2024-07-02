"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerService = void 0;
var lodash_1 = __importDefault(require("lodash"));
var role_worker_const_1 = require("./role.worker.const");
var role_worker_1 = __importDefault(require("./role.worker"));
var WorkerService = /** @class */ (function () {
    function WorkerService() {
    }
    WorkerService.prototype.manageWorkers = function () {
        var _loop_1 = function (spawnName) {
            var spawn = Game.spawns[spawnName];
            var room = spawn.room;
            var workersIdling = lodash_1.default.filter(Game.creeps, function (creep) {
                return creep.memory.role === "worker" &&
                    creep.room.name === spawn.room.name &&
                    creep.memory.task === role_worker_const_1.WorkerTask.Idling;
            });
            if (!role_worker_1.default.tasksPerRoom) {
                return { value: void 0 };
            }
            var enabledTasks = Object.keys(role_worker_1.default.tasksPerRoom);
            var _loop_2 = function (enabledTask) {
                var workersPlanned = role_worker_1.default.tasksPerRoom[enabledTask];
                if (enabledTask === role_worker_const_1.WorkerTask.Transferring &&
                    !this_1.isTransferNeeded(spawn)) {
                    return "continue";
                }
                if (enabledTask === role_worker_const_1.WorkerTask.Building && !this_1.isBuildNeeded(spawn)) {
                    return "continue";
                }
                var workersPrrPosition = Object.keys(workersPlanned);
                var workersRequiredPerTask = workersPlanned[Memory.roomData.sourcePositions[room.name]]
                    ? workersPlanned[Memory.roomData.sourcePositions[room.name]]
                    : workersPlanned[workersPrrPosition.length - 1];
                var workersOnTask = lodash_1.default.filter(Game.creeps, function (creep) {
                    return creep.memory.role === "worker" &&
                        creep.room.name === spawn.room.name &&
                        creep.memory.task === enabledTask;
                });
                if (workersIdling.length !== 0 &&
                    workersOnTask.length < workersRequiredPerTask) {
                    var worker = workersIdling.shift();
                    if (worker) {
                        var creep = Game.getObjectById(worker.id);
                        if (creep) {
                            creep.memory.path = undefined;
                            creep.memory.targetId = null;
                            creep.memory.task = enabledTask;
                        }
                    }
                }
            };
            for (var _i = 0, enabledTasks_1 = enabledTasks; _i < enabledTasks_1.length; _i++) {
                var enabledTask = enabledTasks_1[_i];
                _loop_2(enabledTask);
            }
            if (workersIdling.length > 0) {
                for (var _a = 0, workersIdling_1 = workersIdling; _a < workersIdling_1.length; _a++) {
                    var creep = workersIdling_1[_a];
                    creep.memory.path = undefined;
                    creep.memory.targetId = null;
                    creep.memory.task = role_worker_const_1.WorkerTask.Upgrading;
                }
            }
        };
        var this_1 = this;
        for (var spawnName in Game.spawns) {
            var state_1 = _loop_1(spawnName);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    };
    WorkerService.prototype.isTransferNeeded = function (spawn) {
        var targets = spawn.room.find(FIND_STRUCTURES, {
            filter: function (structure) {
                return ((structure.structureType === STRUCTURE_SPAWN ||
                    structure.structureType === STRUCTURE_TOWER ||
                    structure.structureType === STRUCTURE_EXTENSION) &&
                    structure.store &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
            },
        });
        return targets.length !== 0;
    };
    WorkerService.prototype.isBuildNeeded = function (spawn) {
        var targets = spawn.room.find(FIND_STRUCTURES, {
            filter: function (structure) {
                return (structure.hits < structure.hitsMax &&
                    structure.structureType !== STRUCTURE_WALL &&
                    structure.structureType !== STRUCTURE_RAMPART);
            },
        });
        if (targets.length > 0) {
            return true;
        }
        else {
            var constructionSites = spawn.room.find(FIND_CONSTRUCTION_SITES);
            if (constructionSites.length > 0) {
                return true;
            }
        }
        return false;
    };
    return WorkerService;
}());
exports.WorkerService = WorkerService;
