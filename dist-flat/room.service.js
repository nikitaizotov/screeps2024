"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const lodash_1 = __importDefault(require("lodash"));
const role_miner_1 = require("./role.miner");
const creep_service_1 = require("./creep.service");
const structure_link_1 = require("./structure.link");
const utils_service_1 = require("./utils.service");
const structure_tower_1 = require("./structure.tower");
const role_link_manager_1 = require("./role.link-manager");
const role_worker_1 = __importDefault(require("./role.worker"));
const worker_service_1 = require("./worker.service");
const role_scout_1 = require("./role.scout");
const build_service_1 = require("./build.service");
const cache_service_1 = require("./cache.service");
// const profiler = require("./screeps-profiler");
class RoomService {
    constructor() {
        // Roles.
        this.roleMiner = new role_miner_1.RoleMiner();
        this.enabledRoles = [];
        this.roleLinkManager = new role_link_manager_1.RoleLinkManager();
        this.roleScout = new role_scout_1.RoleScout();
        // Structures.
        this.linkManager = new structure_link_1.LinkManager();
        this.towerManager = new structure_tower_1.TowerManager();
        // Services.
        this.workerService = new worker_service_1.WorkerService();
        this.utilsService = new utils_service_1.UtilsService();
        this.creepService = new creep_service_1.CreepService();
        this.buildService = new build_service_1.BuildService();
        this.cacheService = new cache_service_1.CacheService();
        this.enabledRoles = [
            role_worker_1.default,
            this.roleMiner,
            this.roleLinkManager,
            // roleRanged,
            // this.roleScout,
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
            this.cacheService.clearCreepPathCache();
            this.cacheStructures(1000);
            this.cacheFast(10);
            this.shortCache(25);
            if (Game.time % 500 === 0) {
                this.isFixingWallsNeeded();
            }
        }
        catch (error) {
            console.log(`Error in cacheRoutines: ${error.message}`);
        }
    }
    structureRoutines() {
        try {
            this.buildService.build();
            this.manageStructures();
        }
        catch (error) {
            console.log(`Error in structureRoutines: ${error.message}`);
        }
    }
    cacheStructures(checkEveryNTicks = 1000) {
        if (Game.time % checkEveryNTicks !== 0) {
            return;
        }
        for (let roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            this.cacheService.cacheSources(room);
            this.cacheService.cacheStorages(room);
            this.cacheService.cacheContainers(room);
            this.cacheService.cacheSpawns(room);
            this.cacheService.cacheTowers(room);
            this.cacheService.cacheExtensions(room);
            this.cacheService.cacheTerminals(room);
            this.cacheService.cacheLinks(room);
        }
    }
    cacheFast(checkEveryNTicks = 10) {
        if (Game.time % checkEveryNTicks !== 0) {
            return;
        }
        for (let roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            this.cacheService.cacheConstructionSites(room);
        }
    }
    shortCache(checkEveryNTicks = 100) {
        if (Game.time % checkEveryNTicks !== 0) {
            return;
        }
        for (let roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            this.cacheService.cacheWalls(room);
            this.cacheService.cacheRamparts(room);
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
        var _a, _b, _c;
        try {
            // Run the following code only every 3 ticks.
            if (Game.time % 5 !== 0) {
                return;
            }
            // Iterate through all spawns in the game.
            for (let spawnName in Game.spawns) {
                const spawn = Game.spawns[spawnName];
                // Get the total energy available in extensions in the spawn's room.
                const energyInExtensions = this.utilsService.getTotalEnergyInExtensions(spawn.room);
                // Check if safe mode is needed for the spawn's room.
                this.utilsService.isSafeModeNeeded(spawn.room);
                // Skip this spawn if it is already spawning a creep.
                if (spawn.spawning) {
                    continue;
                }
                // Iterate through all enabled roles.
                for (let role of this.enabledRoles) {
                    // Filter creeps by role and room.
                    const selectedCreeps = lodash_1.default.filter(Game.creeps, (creep) => creep.memory.role == role.memoryKey &&
                        creep.room.name == spawn.room.name);
                    const baseBodyParts = role.baseBodyParts || [];
                    const bodyParts = role.bodyParts;
                    // Calculate the base cost of body parts.
                    const baseCost = baseBodyParts.reduce((sum, part) => sum + BODYPART_COST[part], 0);
                    // Calculate the cost of additional body parts.
                    const bodyPartsCost = bodyParts.reduce((sum, part) => sum + BODYPART_COST[part], 0);
                    // Calculate the total cost of the creep.
                    const totalCost = baseCost + bodyPartsCost;
                    // Check if the spawn can afford the creep.
                    const canAfford = energyInExtensions + spawn.store[RESOURCE_ENERGY] >= totalCost;
                    // Get the storage link ID for the room.
                    const linkId = this.roleLinkManager.getStorageLinkId(spawn.room);
                    // Special conditions for miners.
                    if (role.memoryKey === this.roleMiner.memoryKey) {
                        const linkedStorage = this.roleLinkManager.getStorageLinkId(spawn.room);
                        // Find all containers in the room.
                        const containers = spawn.room.find(FIND_STRUCTURES, {
                            filter: (structure) => structure.structureType === STRUCTURE_CONTAINER,
                        });
                        // Calculate the needed count of miners.
                        let neededCount = linkedStorage
                            ? Object.keys((_a = Memory === null || Memory === void 0 ? void 0 : Memory.roomData) === null || _a === void 0 ? void 0 : _a.links[spawn.room.name]).length - 1
                            : containers.length;
                        const roomSources = this.cacheService.findSources(spawn.room);
                        if (neededCount > roomSources.length) {
                            neededCount = roomSources.length;
                        }
                        // Skip if the current count of miners is sufficient.
                        if (neededCount <= selectedCreeps.length) {
                            continue;
                        }
                    }
                    // Special conditions for link managers.
                    if (role.memoryKey === this.roleLinkManager.memoryKey) {
                        // Skip if no link ID or if there are already link managers.
                        if (!linkId || selectedCreeps.length > 0) {
                            continue;
                        }
                    }
                    // Special conditions for scouts.
                    // if (role.memoryKey === this.roleScout.memoryKey) {
                    //   // Find all scouts in the room.
                    //   const scoutsInRoom = _.filter(
                    //     Game.creeps,
                    //     (creep) =>
                    //       creep.memory.role == role.memoryKey &&
                    //       creep.memory.spawnRoom == spawn.room.name
                    //   );
                    //   // Check neighboring rooms
                    //   const exits = Game.map.describeExits(spawn.room.name);
                    //   let needScout = false;
                    //   let allNeighboringRoomsUnsafe = true;
                    //   if (exits) {
                    //     for (let exit in exits) {
                    //       const roomName = exits[exit as keyof ExitsInformation];
                    //       if (roomName) {
                    //         const neighboringRoomMemory = Memory.scoutRooms[roomName];
                    //         if (
                    //           !neighboringRoomMemory ||
                    //           !neighboringRoomMemory.attacked
                    //         ) {
                    //           allNeighboringRoomsUnsafe = false;
                    //         }
                    //         if (
                    //           !neighboringRoomMemory ||
                    //           neighboringRoomMemory.attacked !== true
                    //         ) {
                    //           const neighboringRoom = Game.rooms[roomName];
                    //           if (!neighboringRoom || !neighboringRoom.controller?.my) {
                    //             needScout = true;
                    //             break;
                    //           }
                    //         }
                    //       }
                    //     }
                    //   }
                    //   // Skip if no scout is needed or if all neighboring rooms are unsafe.
                    //   if (!needScout || allNeighboringRoomsUnsafe) {
                    //     continue;
                    //   }
                    //   // Skip if the controller level is less than 5 или if the number of scouts is sufficient.
                    //   if (
                    //     spawn.room.controller!.level < 5 ||
                    //     scoutsInRoom.length >= this.roleScout.creepsPerRoom
                    //   ) {
                    //     continue;
                    //   }
                    // }
                    ///////////////////////////////////
                    // Determine the maximum allowed creeps for this role.
                    let maxCreepsAllowed = role.creepsPerSourcePositions &&
                        role.creepsPerSourcePositions[(_b = Memory === null || Memory === void 0 ? void 0 : Memory.roomData) === null || _b === void 0 ? void 0 : _b.sourcePositions[spawn.room.name]]
                        ? role.creepsPerSourcePositions[(_c = Memory === null || Memory === void 0 ? void 0 : Memory.roomData) === null || _c === void 0 ? void 0 : _c.sourcePositions[spawn.room.name]]
                        : role.creepsPerRoom;
                    if (role.memoryKey === role_worker_1.default.memoryKey) {
                        if (Memory.roomData.fixingWallsRampartsEnabled &&
                            Memory.roomData.fixingWallsRampartsEnabled[spawn.room.name] ===
                                false) {
                            maxCreepsAllowed--;
                        }
                        if (!this.buildService.isThereSomethingToBuild(spawn.room)) {
                            maxCreepsAllowed--;
                        }
                    }
                    // If the number of creeps is less than the allowed maximum and the spawn can afford it, create a new creep.
                    if (selectedCreeps.length < maxCreepsAllowed && canAfford) {
                        const newName = role.namePrefix + Game.time;
                        const totalEnergyInRoom = energyInExtensions + spawn.store[RESOURCE_ENERGY];
                        let bodyPartsMultiplier = role.memoryKey !== this.roleScout.memoryKey
                            ? Math.floor((totalEnergyInRoom - baseCost) / bodyPartsCost)
                            : 1;
                        // Ensure the body parts multiplier does not exceed the maximum allowed.
                        if ((role === null || role === void 0 ? void 0 : role.maxBodyPartsMultiplier) &&
                            bodyPartsMultiplier > (role === null || role === void 0 ? void 0 : role.maxBodyPartsMultiplier)) {
                            bodyPartsMultiplier = role === null || role === void 0 ? void 0 : role.maxBodyPartsMultiplier;
                        }
                        // Combine base body parts with additional body parts.
                        const finalBodyParts = [
                            ...baseBodyParts,
                            ...this.utilsService.repeatArray(bodyParts, bodyPartsMultiplier),
                        ];
                        const spawnAttempt = spawn.spawnCreep(finalBodyParts, newName, {
                            memory: {
                                role: role.memoryKey,
                                spawnRoom: spawn.room.name,
                                pathColor: "#" +
                                    ((Math.random() * 0xffffff) << 0)
                                        .toString(16)
                                        .padStart(6, "0"),
                                idleTicks: 0,
                                pathName: "",
                            },
                        });
                        // Spawn the new creep and set its memory.
                        if (spawnAttempt === OK) {
                            return;
                        }
                    }
                }
            }
        }
        catch (error) {
            // Log any errors encountered during the function execution.
            console.log(`Error in spawnCreeps: ${error.message}`);
        }
    }
    moveCreeps() {
        try {
            for (const name in Game.creeps) {
                const creep = Game.creeps[name];
                // Kernel-owned creeps are driven by the kernel, not the old roles.
                if (creep.memory.kernelTask)
                    continue;
                this.creepService.drawPath(creep);
                let timeToCheck = creep.memory.role === this.roleMiner.memoryKey ||
                    creep.memory.role === this.roleLinkManager.memoryKey
                    ? 500
                    : 1;
                timeToCheck =
                    creep.memory.role === this.roleScout.memoryKey ? 99999 : timeToCheck;
                if (Game.time % timeToCheck === 0) {
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
        var _a;
        try {
            // Iterate through all rooms in the game.
            for (let roomName in Game.rooms) {
                const room = Game.rooms[roomName];
                if ((room === null || room === void 0 ? void 0 : room.controller) && ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.my)) {
                    const links = this.cacheService.findLinks(room);
                    const towers = this.cacheService.findTowers(room);
                    towers.forEach((tower) => {
                        this.towerManager.work(tower);
                    });
                    links.forEach((link) => {
                        this.linkManager.work(link);
                    });
                }
            }
        }
        catch (error) {
            // Log any errors encountered during the function execution.
            console.log(`Error in manageStructures: ${error.message}`);
        }
    }
    roomRoutines() {
        if (Game.time % 5 === 0) {
            this.utilsService.getRoomData();
        }
    }
    isFixingWallsNeeded() {
        var _a;
        try {
            for (const roomName in Game.rooms) {
                const room = Game.rooms[roomName];
                if (!((_a = room.controller) === null || _a === void 0 ? void 0 : _a.my)) {
                    continue;
                }
                if (!Memory.roomData.fixingWallsRampartsEnabled) {
                    Memory.roomData.fixingWallsRampartsEnabled = {};
                }
                if (Memory.roomData.fixingWallsRampartsEnabled[room.name] === undefined) {
                    Memory.roomData.fixingWallsRampartsEnabled[room.name] = true;
                }
                const repairThreshold = 700000;
                const repairNeededThreshold = 650000;
                const fixingNeeded = Memory.roomData.fixingWallsRampartsEnabled[room.name];
                const targets = room.find(FIND_STRUCTURES, {
                    filter: (structure) => (fixingNeeded
                        ? structure.hits > repairThreshold
                        : structure.hits < repairNeededThreshold) &&
                        (structure.structureType === STRUCTURE_WALL ||
                            structure.structureType === STRUCTURE_RAMPART),
                });
                Memory.roomData.fixingWallsRampartsEnabled[room.name] = fixingNeeded
                    ? targets.length === 0
                    : targets.length > 0;
            }
        }
        catch (error) {
            console.log(`Error in isFixingWallsNeeded: ${error.message}`);
        }
    }
}
exports.RoomService = RoomService;
// profiler.registerClass(RoomService, "RoomService");
