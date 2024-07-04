"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const lodash_1 = __importDefault(require("lodash"));
const role_WallAndRampartBuilder_1 = __importDefault(require("./role.WallAndRampartBuilder"));
const role_scout_1 = __importDefault(require("./role.scout"));
const structure_tower_1 = __importDefault(require("./structure.tower"));
const build_service_1 = __importDefault(require("./build.service"));
const utils_service_1 = __importDefault(require("./utils.service"));
const role_worker_1 = __importDefault(require("./role.worker"));
const worker_service_1 = require("./worker.service");
const role_miner_1 = require("./role.miner");
const creep_service_1 = require("./creep.service");
// const profiler = require("./screeps-profiler");
class RoomService {
    constructor() {
        this.roleMiner = new role_miner_1.RoleMiner();
        this.workerService = new worker_service_1.WorkerService();
        this.enabledRoles = [];
        this.creepService = new creep_service_1.CreepService();
        this.enabledRoles = [
            role_worker_1.default,
            this.roleMiner,
            // roleRanged,
            role_WallAndRampartBuilder_1.default,
            // roleScout,
        ];
    }
    creepRoutines() {
        try {
            this.spawnCreeps();
            this.moveCreeps();
            this.workerService.manageWorkers();
        }
        catch (error) {
            console.log(`Error in creepRoutines: ${error.message}`);
        }
    }
    cacheRoutines() {
        try {
            this.cleanMemory();
            this.roomRoutines();
            this.creepService.clearCreepPathCache();
        }
        catch (error) {
            console.log(`Error in cacheRoutines: ${error.message}`);
        }
    }
    structureRoutines() {
        try {
            build_service_1.default.build();
            this.manageStructures();
        }
        catch (error) {
            console.log(`Error in structureRoutines: ${error.message}`);
        }
    }
    cleanMemory() {
        try {
            for (var name in Memory.creeps) {
                if (!Game.creeps[name]) {
                    delete Memory.creeps[name];
                }
            }
        }
        catch (error) {
            console.log(`Error in cleanMemory: ${error.message}`);
        }
    }
    spawnCreeps() {
        try {
            if (Game.time % 3) {
                return;
            }
            for (let spawnName in Game.spawns) {
                const spawn = Game.spawns[spawnName];
                const energyInExtensions = utils_service_1.default.getTotalEnergyInExtensions(spawn.room);
                utils_service_1.default.isSafeModeNeeded(spawn.room);
                if (spawn.spawning) {
                    continue;
                }
                for (let role of this.enabledRoles) {
                    const selectedCreeps = lodash_1.default.filter(Game.creeps, (creep) => creep.memory.role == role.memoryKey &&
                        creep.room.name == spawn.room.name);
                    const baseBodyParts = role.baseBodyParts || [];
                    const bodyParts = role.bodyParts;
                    const baseCost = baseBodyParts.reduce((sum, part) => sum + BODYPART_COST[part], 0);
                    const bodyPartsCost = bodyParts.reduce((sum, part) => sum + BODYPART_COST[part], 0);
                    const totalCost = baseCost + bodyPartsCost;
                    const canAfford = energyInExtensions + spawn.store[RESOURCE_ENERGY] >= totalCost;
                    if (role.memoryKey === this.roleMiner.memoryKey) {
                        const containers = spawn.room.find(FIND_STRUCTURES, {
                            filter: (structure) => structure.structureType === STRUCTURE_CONTAINER,
                        });
                        if (containers.length <= selectedCreeps.length) {
                            continue;
                        }
                    }
                    if (role.memoryKey === role_WallAndRampartBuilder_1.default.memoryKey) {
                        const isReparableWallsAndRamps = spawn.room.find(FIND_STRUCTURES, {
                            filter: (structure) => {
                                return ((structure.structureType === STRUCTURE_WALL ||
                                    structure.structureType === STRUCTURE_RAMPART) &&
                                    structure.hits < structure.hitsMax);
                            },
                        });
                        if (!isReparableWallsAndRamps.length) {
                            continue;
                        }
                    }
                    if (role.memoryKey === role_scout_1.default.memoryKey) {
                        const scoutsInRoom = lodash_1.default.filter(Game.creeps, (creep) => creep.memory.role == role.memoryKey &&
                            creep.memory.spawnRoom == spawn.room.name);
                        if (spawn.room.controller.level < 5 ||
                            scoutsInRoom.length >= role_scout_1.default.creepsPerRoom) {
                            continue;
                        }
                    }
                    const maxCreepsAllowed = role.creepsPerSourcePositions &&
                        role.creepsPerSourcePositions[Memory.roomData.sourcePositions[spawn.room.name]]
                        ? role.creepsPerSourcePositions[Memory.roomData.sourcePositions[spawn.room.name]]
                        : role.creepsPerRoom;
                    if (selectedCreeps.length < maxCreepsAllowed && canAfford) {
                        const newName = role.namePrefix + Game.time;
                        const totalEnergyInRoom = energyInExtensions + spawn.store[RESOURCE_ENERGY];
                        let bodyPartsMultiplier = role.memoryKey !== role_scout_1.default.memoryKey
                            ? Math.floor((totalEnergyInRoom - baseCost) / bodyPartsCost)
                            : 1;
                        if ((role === null || role === void 0 ? void 0 : role.maxBodyPartsMultiplier) &&
                            bodyPartsMultiplier > (role === null || role === void 0 ? void 0 : role.maxBodyPartsMultiplier)) {
                            bodyPartsMultiplier = role === null || role === void 0 ? void 0 : role.maxBodyPartsMultiplier;
                        }
                        const finalBodyParts = [
                            ...baseBodyParts,
                            ...utils_service_1.default.repeatArray(bodyParts, bodyPartsMultiplier),
                        ];
                        if (spawn.spawnCreep(finalBodyParts, newName, {
                            memory: {
                                role: role.memoryKey,
                                spawnRoom: spawn.room.name,
                                pathColor: "#" +
                                    ((Math.random() * 0xffffff) << 0)
                                        .toString(16)
                                        .padStart(6, "0"),
                                idleTicks: 0,
                            },
                        }) === OK) {
                            return;
                        }
                    }
                }
            }
        }
        catch (error) {
            console.log(`Error in spawnCreeps: ${error.message}`);
        }
    }
    moveCreeps() {
        try {
            for (const name in Game.creeps) {
                const creep = Game.creeps[name];
                let timeToCheck = creep.memory.role === this.roleMiner.memoryKey ? 500 : 1;
                timeToCheck =
                    creep.memory.role === role_scout_1.default.memoryKey ? 20 : timeToCheck;
                if (Game.time % timeToCheck === 2) {
                    this.creepService.findIdleCreep(creep);
                }
                const role = this.enabledRoles.find((role) => role.memoryKey === creep.memory.role);
                if (role) {
                    role.run(creep);
                }
                else {
                    console.log("Creep has unknown role", creep.memory.role);
                }
            }
        }
        catch (error) {
            console.log(`Error in moveCreeps: ${error.message}`);
        }
    }
    manageStructures() {
        try {
            for (let roomName in Game.rooms) {
                const room = Game.rooms[roomName];
                const spawns = room.find(FIND_MY_SPAWNS);
                if (spawns.length > 0) {
                    const towers = room.find(FIND_MY_STRUCTURES, {
                        filter: { structureType: STRUCTURE_TOWER },
                    });
                    towers.forEach((tower) => {
                        structure_tower_1.default.run(tower);
                    });
                }
            }
        }
        catch (error) {
            console.log(`Error in manageStructures: ${error.message}`);
        }
    }
    roomRoutines() {
        if (Game.time % 5 === 0) {
            utils_service_1.default.getRoomData();
        }
    }
}
exports.RoomService = RoomService;
// profiler.registerClass(RoomService, "RoomService");
