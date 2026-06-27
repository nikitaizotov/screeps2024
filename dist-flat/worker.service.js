"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerService = void 0;
const lodash_1 = __importDefault(require("lodash"));
const role_worker_1 = __importDefault(require("./role.worker"));
const worker_const_1 = require("./worker.const");
const worker_const_2 = require("./worker.const");
const cache_service_1 = require("./cache.service");
// const profiler = require("./screeps-profiler");
class WorkerService {
    constructor() {
        this.cacheService = new cache_service_1.CacheService();
        // isFixingRampartsAndWallsNeeded(room: Room): boolean {
        //   const targets: AnyStructure[] = room.find(FIND_STRUCTURES, {
        //     filter: (structure) => {
        //       return (
        //         10000 < structure.hitsMax &&
        //         structure.structureType !== STRUCTURE_WALL &&
        //         structure.structureType !== STRUCTURE_RAMPART
        //       );
        //     },
        //   });
        //   return false;
        // }
    }
    manageWorkers() {
        for (let spawnName in Game.spawns) {
            const spawn = Game.spawns[spawnName];
            const room = spawn.room;
            const workersIdling = lodash_1.default.filter(Game.creeps, (creep) => creep.memory.role === worker_const_2.WORKER_MEMORY_KEY &&
                creep.room.name === spawn.room.name &&
                creep.memory.task === worker_const_1.WorkerTask.Idling);
            if (!role_worker_1.default.tasksPerRoom) {
                return;
            }
            const enabledTasks = Object.keys(role_worker_1.default.tasksPerRoom);
            for (let enabledTask of enabledTasks) {
                const workersPlanned = role_worker_1.default.tasksPerRoom[enabledTask];
                if (enabledTask === worker_const_1.WorkerTask.Transferring &&
                    (this.kernelOwnsLogistics(room) || !this.isTransferNeeded(spawn))) {
                    continue;
                }
                if (enabledTask === worker_const_1.WorkerTask.Building && !this.isBuildNeeded(spawn)) {
                    continue;
                }
                if (enabledTask === worker_const_1.WorkerTask.FixingRampartsAndWalls &&
                    (!this.ifWallsAndRampartFixingNeeded(spawn) ||
                        !Memory.roomData.fixingWallsRampartsEnabled[room.name])) {
                    continue;
                }
                const workersPrrPosition = Object.keys(workersPlanned);
                const workersRequiredPerTask = workersPlanned[Memory.roomData.sourcePositions[room.name]]
                    ? workersPlanned[Memory.roomData.sourcePositions[room.name]]
                    : workersPlanned[workersPrrPosition.length - 1];
                const workersOnTask = lodash_1.default.filter(Game.creeps, (creep) => creep.memory.role === role_worker_1.default.memoryKey &&
                    creep.room.name === spawn.room.name &&
                    creep.memory.task === enabledTask);
                // Debug
                // if (enabledTask === WorkerTask.Building) {
                //   console.log(
                //     `BUILDERS: ${workersOnTask.length} IDLING: ${workersIdling.length}`
                //   );
                // }
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
                    creep.memory.task = worker_const_1.WorkerTask.Upgrading;
                }
            }
        }
    }
    /**
     * True when the kernel has taken over logistics for this room AND a kernel
     * hauler actually exists — only then do workers stand down from Transferring.
     * The live-hauler check is a self-healing fallback: if haulers die off,
     * workers resume delivery, so the colony cannot death-spiral.
     */
    kernelOwnsLogistics(room) {
        const km = Memory.kernel;
        if (!km ||
            !km.takeover ||
            !km.takeover[room.name] ||
            !km.takeover[room.name].logistics) {
            return false;
        }
        return lodash_1.default.some(Game.creeps, (c) => c.memory.kernelTask &&
            c.memory.kernelTask.role === "hauler" &&
            c.room.name === room.name);
    }
    isTransferNeeded(spawn) {
        try {
            const spawns = this.cacheService.findSpawns(spawn.room);
            const towers = this.cacheService.findTowers(spawn.room);
            const extensions = this.cacheService.findExtensions(spawn.room);
            const targets = [...spawns, ...towers, ...extensions].filter((structure) => (structure instanceof StructureSpawn ||
                structure instanceof StructureTower ||
                structure instanceof StructureExtension) &&
                structure.store &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
            return targets.length !== 0;
        }
        catch (error) {
            console.log(`Error in isTransferNeeded: ${error.message}`);
            return false;
        }
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
    ifWallsAndRampartFixingNeeded(spawn) {
        try {
            const walls = this.cacheService.findWalls(spawn.room);
            const ramparts = this.cacheService.findRamparts(spawn.room);
            const targets = [...walls, ...ramparts].filter((structure) => (structure instanceof StructureWall ||
                structure instanceof StructureRampart) &&
                structure.hits < structure.hitsMax);
            if (targets.length > 0) {
                return true;
            }
            return false;
        }
        catch (error) {
            console.log(`Error in ifWallsAndRampartFixingNeeded: ${error.message}`);
            return false;
        }
    }
}
exports.WorkerService = WorkerService;
// profiler.registerClass(WorkerService, "WorkerService");
