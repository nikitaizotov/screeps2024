"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = __importDefault(require("lodash"));
var role_WallAndRampartBuilder_1 = __importDefault(require("./role.WallAndRampartBuilder"));
var role_scout_1 = __importDefault(require("./role.scout"));
var structure_tower_1 = __importDefault(require("./structure.tower"));
var role_builder_1 = __importDefault(require("./role.builder"));
var build_service_1 = __importDefault(require("./build.service"));
var creep_service_1 = __importDefault(require("./creep.service"));
var utils_service_1 = __importDefault(require("./utils.service"));
var role_miner_1 = __importDefault(require("./role.miner"));
var role_worker_1 = __importDefault(require("./role.worker"));
var worker_service_1 = require("./worker.service");
var workerService = new worker_service_1.WorkerService();
var roomService = {
    enabledRoles: [
        role_worker_1.default,
        role_miner_1.default,
        //roleHarvester,
        //roleUpgrader,
        //roleBuilder,
        // roleRanged,
        role_WallAndRampartBuilder_1.default,
        // roleScout,
    ],
    routines: function () {
        try {
            this.cleanMemory();
            this.creepsRoutines();
            build_service_1.default.build();
            this.structureRoutines();
            this.roomRoutines();
            workerService.manageWorkers();
        }
        catch (error) {
            console.log("Error in routines: ".concat(error.message));
        }
    },
    cleanMemory: function () {
        try {
            for (var name in Memory.creeps) {
                if (!Game.creeps[name]) {
                    delete Memory.creeps[name];
                    console.log("Clearing non-existing creep memory:", name);
                }
            }
        }
        catch (error) {
            console.log("Error in cleanMemory: ".concat(error.message));
        }
    },
    creepsRoutines: function () {
        try {
            this.spawnCreeps();
            this.moveCreeps();
        }
        catch (error) {
            console.log("Error in creepsRoutines: ".concat(error.message));
        }
    },
    spawnCreeps: function () {
        try {
            if (Game.time % 2) {
                return;
            }
            var _loop_1 = function (spawnName) {
                var spawn = Game.spawns[spawnName];
                var energyInExtensions = utils_service_1.default.getTotalEnergyInExtensions(spawn.room);
                utils_service_1.default.isSafeModeNeeded(spawn.room);
                if (spawn.spawning) {
                    return "continue";
                }
                var _loop_2 = function (role) {
                    var selectedCreeps = lodash_1.default.filter(Game.creeps, function (creep) {
                        return creep.memory.role == role.memoryKey &&
                            creep.room.name == spawn.room.name;
                    });
                    var baseBodyParts = role.baseBodyParts || [];
                    var bodyParts = role.bodyParts;
                    var baseCost = baseBodyParts.reduce(function (sum, part) { return sum + BODYPART_COST[part]; }, 0);
                    var bodyPartsCost = bodyParts.reduce(function (sum, part) { return sum + BODYPART_COST[part]; }, 0);
                    var totalCost = baseCost + bodyPartsCost;
                    var canAfford = energyInExtensions + spawn.store[RESOURCE_ENERGY] >= totalCost;
                    if (role.memoryKey === role_builder_1.default.memoryKey) {
                        var constructionSites = spawn.room.find(FIND_CONSTRUCTION_SITES);
                        if (!constructionSites.length) {
                            return "continue";
                        }
                    }
                    if (role.memoryKey === role_miner_1.default.memoryKey) {
                        var containers = spawn.room.find(FIND_STRUCTURES, {
                            filter: function (structure) {
                                return structure.structureType === STRUCTURE_CONTAINER;
                            },
                        });
                        if (containers.length <= selectedCreeps.length) {
                            return "continue";
                        }
                    }
                    if (role.memoryKey === role_WallAndRampartBuilder_1.default.memoryKey) {
                        var isReparableWallsAndRamps = spawn.room.find(FIND_STRUCTURES, {
                            filter: function (structure) {
                                return ((structure.structureType === STRUCTURE_WALL ||
                                    structure.structureType === STRUCTURE_RAMPART) &&
                                    structure.hits < structure.hitsMax);
                            },
                        });
                        if (!isReparableWallsAndRamps.length) {
                            return "continue";
                        }
                    }
                    if (role.memoryKey === role_scout_1.default.memoryKey) {
                        var scoutsInRoom = lodash_1.default.filter(Game.creeps, function (creep) {
                            return creep.memory.role == role.memoryKey &&
                                creep.memory.spawnRoom == spawn.room.name;
                        });
                        if (spawn.room.controller.level < 5 ||
                            scoutsInRoom.length >= role_scout_1.default.creepsPerRoom) {
                            return "continue";
                        }
                    }
                    var maxCreepsAllowed = role.creepsPerSourcePositions &&
                        role.creepsPerSourcePositions[Memory.roomData.sourcePositions[spawn.room.name]]
                        ? role.creepsPerSourcePositions[Memory.roomData.sourcePositions[spawn.room.name]]
                        : role.creepsPerRoom;
                    if (selectedCreeps.length < maxCreepsAllowed && canAfford) {
                        var newName = role.namePrefix + Game.time;
                        var totalEnergyInRoom = energyInExtensions + spawn.store[RESOURCE_ENERGY];
                        var bodyPartsMultiplier = role.memoryKey !== role_scout_1.default.memoryKey
                            ? Math.floor((totalEnergyInRoom - baseCost) / bodyPartsCost)
                            : 1;
                        if ((role === null || role === void 0 ? void 0 : role.maxBodyPartsMultiplier) &&
                            bodyPartsMultiplier > (role === null || role === void 0 ? void 0 : role.maxBodyPartsMultiplier)) {
                            bodyPartsMultiplier = role === null || role === void 0 ? void 0 : role.maxBodyPartsMultiplier;
                        }
                        var finalBodyParts = __spreadArray(__spreadArray([], baseBodyParts, true), utils_service_1.default.repeatArray(bodyParts, bodyPartsMultiplier), true);
                        if (spawn.spawnCreep(finalBodyParts, newName, {
                            memory: {
                                role: role.memoryKey,
                                spawnRoom: spawn.room.name,
                                pathColor: "#" +
                                    ((Math.random() * 0xffffff) << 0)
                                        .toString(16)
                                        .padStart(6, "0"),
                            },
                        }) === OK) {
                            console.log("Spawning a new creep: " + newName);
                            return { value: void 0 };
                        }
                    }
                };
                for (var _i = 0, _a = this_1.enabledRoles; _i < _a.length; _i++) {
                    var role = _a[_i];
                    var state_2 = _loop_2(role);
                    if (typeof state_2 === "object")
                        return state_2;
                }
            };
            var this_1 = this;
            for (var spawnName in Game.spawns) {
                var state_1 = _loop_1(spawnName);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        }
        catch (error) {
            console.log("Error in spawnCreeps: ".concat(error.message));
        }
    },
    moveCreeps: function () {
        try {
            var _loop_3 = function (name_1) {
                var creep = Game.creeps[name_1];
                var timeToCheck = creep.memory.role === role_miner_1.default.memoryKey ? 500 : 1;
                timeToCheck =
                    creep.memory.role === role_scout_1.default.memoryKey ? 20 : timeToCheck;
                if (Game.time % timeToCheck === 0) {
                    creep_service_1.default.findIdleCreep(creep);
                }
                var role = this_2.enabledRoles.find(function (role) { return role.memoryKey === creep.memory.role; });
                if (role) {
                    role.run(creep);
                }
                else {
                    console.log("Creep has unknown role", creep.memory.role);
                }
            };
            var this_2 = this;
            for (var name_1 in Game.creeps) {
                _loop_3(name_1);
            }
        }
        catch (error) {
            console.log("Error in moveCreeps: ".concat(error.message));
        }
    },
    // manageWorkers: function () {
    //   for (let spawnName in Game.spawns) {
    //     const spawn = Game.spawns[spawnName];
    //     const room = spawn.room;
    //     const workers = _.filter(
    //       Game.creeps,
    //       (creep) =>
    //         creep.memory.role === "worker" &&
    //         creep.room.name === spawn.room.name &&
    //         creep.memory.task === WorkerTask.Idling
    //     );
    //     if (!roleWorker.tasksPerRoom) {
    //       return;
    //     }
    //     const enabledTasks = Object.keys(roleWorker.tasksPerRoom);
    //     for (let enabledTask of enabledTasks) {
    //       const onTask = workers.filter((w) => w.memory.task === enabledTask);
    //       const workersRequired =
    //         roleWorker.tasksPerRoom[
    //           enabledTask as keyof typeof roleWorker.tasksPerRoom
    //         ];
    //       // if (workersRequired > onTask.length) {
    //       // }
    //       console.warn(">>>>", workersRequired);
    //     }
    //   }
    // },
    structureRoutines: function () {
        try {
            for (var roomName in Game.rooms) {
                var room = Game.rooms[roomName];
                var spawns = room.find(FIND_MY_SPAWNS);
                if (spawns.length > 0) {
                    var towers = room.find(FIND_MY_STRUCTURES, {
                        filter: { structureType: STRUCTURE_TOWER },
                    });
                    towers.forEach(function (tower) {
                        structure_tower_1.default.run(tower);
                    });
                }
            }
        }
        catch (error) {
            console.log("Error in structureRoutines: ".concat(error.message));
        }
    },
    roomRoutines: function () {
        utils_service_1.default.getRoomData();
    },
};
exports.default = roomService;
