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
                    workersRequiredPerTask !== 0 &&
                    workersOnTask.length < workersRequiredPerTask) {
                    var worker = workersIdling.shift();
                    if (worker) {
                        var creep = Game.getObjectById(worker.id);
                        if (creep) {
                            creep.memory.task = enabledTask;
                            creep.memory.path = undefined;
                            creep.memory.targetId = null;
                        }
                    }
                }
            };
            for (var _i = 0, enabledTasks_1 = enabledTasks; _i < enabledTasks_1.length; _i++) {
                var enabledTask = enabledTasks_1[_i];
                _loop_2(enabledTask);
            }
        };
        for (var spawnName in Game.spawns) {
            var state_1 = _loop_1(spawnName);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    };
    return WorkerService;
}());
exports.WorkerService = WorkerService;
