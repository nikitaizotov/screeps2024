"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreepService = void 0;
const lodash_1 = __importDefault(require("lodash"));
const worker_const_1 = require("./worker.const");
const cache_service_1 = require("./cache.service");
// const profiler = require("./screeps-profiler");
class CreepService {
    constructor() {
        this.cacheService = new cache_service_1.CacheService();
    }
    drawPath(creep, forceDraw = true) {
        if (!creep.memory.path || !forceDraw) {
            return;
        }
        const visual = new RoomVisual(creep.room.name);
        let currentPos = new RoomPosition(creep.pos.x, creep.pos.y, creep.room.name);
        let pathToDraw = creep.memory.path;
        let inPathPosIndex = creep.memory.path.findIndex((elm) => elm.x === creep.pos.x && elm.y === creep.pos.y);
        if (inPathPosIndex > -1) {
            pathToDraw = creep.memory.path.slice(inPathPosIndex);
        }
        else {
            pathToDraw = creep.memory.path;
        }
        pathToDraw.forEach((step, index) => {
            const nextPos = new RoomPosition(step.x, step.y, creep.room.name);
            if (index === 0) {
                visual.line(currentPos, nextPos, { color: "red", lineStyle: "solid" });
            }
            else {
                visual.line(currentPos, nextPos, {
                    color: creep.memory.pathColor || "yellow",
                    lineStyle: "dashed",
                });
            }
            currentPos = nextPos;
        });
    }
    /**
     * Gets path to a container, or source.
     * @param creep
     */
    getPathToSource(creep) {
        this.findContainer(creep);
        if (creep.memory.targetId) {
            return;
        }
        const sources = this.cacheService.findSources(creep.room);
        const closest = creep.pos.findClosestByPath(sources);
        if (closest) {
            const path = this.getPath(creep, closest.pos);
            creep.memory.path = path;
            creep.memory.targetId = closest.id;
        }
    }
    findConstructionSite(creep) {
        const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
        if (constructionSites.length > 0) {
            let closestSite = creep.pos.findClosestByPath(constructionSites);
            if (closestSite) {
                creep.memory.path = this.getPath(creep, closestSite.pos);
                creep.memory.targetId = closestSite.id;
            }
        }
    }
    getDamagedStructures(creep) {
        const targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.hits < structure.hitsMax &&
                    structure.structureType !== STRUCTURE_WALL &&
                    structure.structureType !== STRUCTURE_RAMPART);
            },
        });
        if (targets.length > 0) {
            let closestSite = creep.pos.findClosestByPath(targets);
            if (closestSite) {
                creep.memory.path = this.getPath(creep, closestSite.pos);
                creep.memory.targetId = closestSite.id;
            }
        }
    }
    getOpenPositions(roomPosition) {
        const terrain = Game.map.getRoomTerrain(roomPosition.roomName);
        const openPositions = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue;
                const x = roomPosition.x + dx;
                const y = roomPosition.y + dy;
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    const pos = new RoomPosition(x, y, roomPosition.roomName);
                    const isOccupied = pos.lookFor(LOOK_CREEPS).length > 0;
                    const isBlocked = pos
                        .lookFor(LOOK_STRUCTURES)
                        .some((struct) => struct.structureType !== STRUCTURE_ROAD &&
                        struct.structureType !== STRUCTURE_CONTAINER &&
                        struct.structureType !== STRUCTURE_RAMPART &&
                        struct.structureType !== STRUCTURE_STORAGE);
                    if (!isOccupied && !isBlocked) {
                        openPositions.push(pos);
                    }
                }
            }
        }
        return openPositions;
    }
    getPathTotargets(creep, targets) {
        let bestPath = null;
        let bestTarget = null;
        let minCost = Infinity;
        for (let target of targets) {
            let openPositions = this.getOpenPositions(target.pos);
            let creepsAtTarget = target.pos.findInRange(FIND_CREEPS, 1).length;
            if (creepsAtTarget >= openPositions.length) {
                continue;
            }
            let path = PathFinder.search(creep.pos, { pos: target.pos, range: 1 }, {
                plainCost: 2,
                swampCost: 10,
                roomCallback: function (roomName) {
                    let room = Game.rooms[roomName];
                    if (!room)
                        return new PathFinder.CostMatrix();
                    let costs = new PathFinder.CostMatrix();
                    room.find(FIND_STRUCTURES).forEach(function (struct) {
                        if (struct.structureType === STRUCTURE_ROAD) {
                            costs.set(struct.pos.x, struct.pos.y, 1);
                        }
                        else if (struct.structureType !== STRUCTURE_CONTAINER &&
                            struct.structureType !== STRUCTURE_RAMPART &&
                            struct.structureType !== STRUCTURE_STORAGE) {
                            costs.set(struct.pos.x, struct.pos.y, 0xff);
                        }
                        else if ("my" in struct && !struct.my) {
                            costs.set(struct.pos.x, struct.pos.y, 0xff);
                        }
                    });
                    room.find(FIND_CREEPS).forEach(function (creep) {
                        costs.set(creep.pos.x, creep.pos.y, 0xff);
                    });
                    return costs;
                },
            });
            if (!path.incomplete && path.cost < minCost) {
                minCost = path.cost;
                bestPath = path;
                bestTarget = target;
            }
        }
        if (bestTarget) {
            creep.memory.path = this.getPath(creep, bestTarget.pos);
            creep.memory.targetId = bestTarget.id;
        }
    }
    moveAndHarvest(creep) {
        const objectToCheck = Game.getObjectById(creep.memory.targetId);
        if (objectToCheck) {
            // Check if the target is a container or storage structure
            if (objectToCheck.structureType === STRUCTURE_CONTAINER ||
                objectToCheck.structureType === STRUCTURE_STORAGE) {
                this.moveAndCollectFromContainerOrStorage(creep, objectToCheck);
            }
            // Check if the target is a dropped resource
            else if (objectToCheck instanceof Resource) {
                // Attempt to pick up the resource
                if (creep.pickup(objectToCheck) === ERR_NOT_IN_RANGE) {
                    // If the creep is stuck, get a new path
                    if (this.isCreepIsStuck(creep)) {
                        this.getPathToSource(creep);
                    }
                    // Otherwise, move by the existing path
                    else {
                        let moveResult = this.moveByPath(creep);
                        // If the move result is invalid, get a new path
                        if (moveResult === ERR_NOT_FOUND ||
                            moveResult === ERR_INVALID_ARGS) {
                            this.getPathToSource(creep);
                        }
                    }
                }
            }
            // Check if the target is a source
            else {
                let source = Game.getObjectById(creep.memory.targetId);
                // If the source is not found, reset the target and path
                if (!source) {
                    creep.memory.targetId = null;
                    creep.memory.path = undefined;
                    this.getPathToSource(creep);
                    return;
                }
                // Attempt to harvest from the source
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    // If the creep is stuck, get a new path
                    if (this.isCreepIsStuck(creep)) {
                        this.getPathToSource(creep);
                    }
                    // Otherwise, move by the existing path
                    else {
                        let moveResult = this.moveByPath(creep);
                        // If the move result is invalid, get a new path
                        if (moveResult === ERR_NOT_FOUND ||
                            moveResult === ERR_INVALID_ARGS) {
                            this.getPathToSource(creep);
                        }
                    }
                }
            }
        }
        // If the target is not found, reset the target and path
        else {
            creep.memory.targetId = null;
            creep.memory.path = undefined;
            this.getPathToSource(creep);
        }
    }
    isCreepIsStuck(creep) {
        if (!creep.memory.lastPos) {
            creep.memory.lastPos = {
                x: creep.pos.x,
                y: creep.pos.y,
                energy: creep.store.getUsedCapacity(RESOURCE_ENERGY),
            };
            creep.memory.idleTicks = 0;
        }
        if (creep.pos.x === creep.memory.lastPos.x &&
            creep.pos.y === creep.memory.lastPos.y &&
            creep.store.getUsedCapacity(RESOURCE_ENERGY) ===
                creep.memory.lastPos.energy) {
            creep.memory.idleTicks += 1;
        }
        else {
            creep.memory.lastPos = {
                x: creep.pos.x,
                y: creep.pos.y,
                energy: creep.store.getUsedCapacity(RESOURCE_ENERGY),
            };
            creep.memory.idleTicks = 0;
        }
        if (creep.memory.idleTicks >= 5) {
            creep.memory.idleTicks = 0;
            return true;
        }
        return false;
    }
    findIdleCreep(creep) {
        if (this.isCreepIsStuck(creep)) {
            creep.memory.targetId = null;
            creep.memory.path = undefined;
        }
    }
    moveAndCollectFromContainerOrStorage(creep, structure) {
        if (!creep.memory.path || !creep.memory.path.length) {
            creep.memory.path = creep.pos.findPathTo(structure.pos);
        }
        if (structure.structureType === STRUCTURE_STORAGE &&
            structure.store.getCapacity(RESOURCE_ENERGY) <
                creep.store.getFreeCapacity()) {
            creep.memory.focusOnLink = false;
            creep.memory.path = undefined;
            creep.memory.targetId = null;
        }
        const action = creep.withdraw(structure, RESOURCE_ENERGY);
        if (action === ERR_NOT_IN_RANGE) {
            const moveResult = this.moveByPath(creep);
            if (moveResult === ERR_NOT_FOUND || moveResult === ERR_INVALID_ARGS) {
                creep.memory.path = creep.pos.findPathTo(structure.pos);
            }
        }
        else if (action === ERR_INVALID_TARGET ||
            action === ERR_NOT_ENOUGH_RESOURCES) {
            this.findContainer(creep);
        }
    }
    findContainer(creep) {
        creep.memory.targetId = null;
        creep.memory.path = undefined;
        const containers = this.cacheService.findContainers(creep);
        if (containers.length === 0)
            return;
        const closestContainer = creep.pos.findClosestByPath(containers);
        if (closestContainer) {
            creep.memory.targetId = closestContainer.id;
            creep.memory.path = this.getPath(creep, closestContainer.pos);
        }
    }
    isTargetedByOtherCreeps(target) {
        return lodash_1.default.some(Object.values(Game.creeps), (c) => {
            return c.memory.targetId === target.id && c.memory.transferring;
        });
    }
    taskHarvest(creep) {
        // If the creep's store is full, set its task to Idling and return.
        if (creep.store.getFreeCapacity() === 0) {
            this.setTask(creep, worker_const_1.WorkerTask.Idling);
            return;
        }
        // If the creep is not focused on the link, try to get the storage link ID.
        if (!creep.memory.focusOnLink) {
            const linkId = this.getStorageLinkId(creep.room);
            if (linkId) {
                creep.memory.focusOnLink = true;
            }
        }
        // Step 1: Prioritize picking up resources from the ground.
        if (!creep.memory.path || !creep.memory.targetId) {
            const droppedResources = this.cacheService.findDroppedResources(creep);
            if (droppedResources.length > 0) {
                const freeCapacity = creep.store.getFreeCapacity();
                // Find the nearest resource that is not already targeted by other creeps.
                let closestResource = null;
                let closestDistance = Infinity;
                // Tally, once, how many of our creeps already head to each target.
                // Was a room.find(FIND_MY_CREEPS) per dropped resource — O(resources * creeps).
                const headingCounts = {};
                for (const c of creep.room.find(FIND_MY_CREEPS)) {
                    const targetId = c.memory.targetId;
                    if (targetId) {
                        headingCounts[targetId] = (headingCounts[targetId] || 0) + 1;
                    }
                }
                for (const resource of droppedResources) {
                    const creepsHeading = headingCounts[resource.id] || 0;
                    // Check if it makes sense to pick up this resource and if it is not already occupied by another creep.
                    if (resource.amount > creepsHeading * freeCapacity) {
                        const distance = creep.pos.getRangeTo(resource.pos);
                        const creepOnResource = creep.room.lookForAt(LOOK_CREEPS, resource.pos);
                        if (distance < closestDistance && creepOnResource.length === 0) {
                            closestResource = resource;
                            closestDistance = distance;
                        }
                    }
                }
                if (closestResource) {
                    // Try to find a path to the resource.
                    const path = this.getPath(creep, closestResource.pos);
                    if (path.length > 0) {
                        creep.memory.path = path;
                        creep.memory.targetId = closestResource.id;
                        //  creep.memory.focusOnLink = false;
                    }
                }
            }
        }
        // If focused on the link and no target/path is set, find storage structures.
        if (creep.memory.focusOnLink &&
            (!creep.memory.path || !creep.memory.targetId)) {
            const storage = this.cacheService.findStorages(creep);
            if (storage.length > 0) {
                const targetStorage = storage[0];
                creep.memory.path = this.getPath(creep, targetStorage.pos);
                creep.memory.targetId = targetStorage.id;
            }
            else {
                creep.memory.focusOnLink = false;
            }
        }
        // If not focused on the link and no target/path is set, get a path to a source.
        if (!creep.memory.focusOnLink &&
            (!creep.memory.path || !creep.memory.targetId)) {
            this.getPathToSource(creep);
        }
        // Move and harvest resources based on the set path and target.
        this.moveAndHarvest(creep);
    }
    taskTransfer(creep) {
        if (creep.store[RESOURCE_ENERGY] === 0) {
            this.setTask(creep, worker_const_1.WorkerTask.Harvesting);
            return;
        }
        if (!creep.memory.path || !creep.memory.targetId) {
            const room = creep.room;
            let target = null;
            const targets = room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return ((structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_EXTENSION) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                        !lodash_1.default.some(Game.creeps, (c) => c.memory.targetId === structure.id));
                },
            });
            if (targets.length > 0) {
                target = creep.pos.findClosestByPath(targets);
            }
            if (!target) {
                const towers = room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType === STRUCTURE_TOWER &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                    },
                });
                if (towers.length > 0) {
                    target = creep.pos.findClosestByPath(towers);
                }
            }
            if (target) {
                creep.memory.targetId = target.id;
                creep.memory.path = this.getPath(creep, target.pos);
            }
            else {
                this.setTask(creep, worker_const_1.WorkerTask.Idling);
            }
        }
        else {
            const target = Game.getObjectById(creep.memory.targetId);
            // Сброс цели, если она недействительна или заполнена
            if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                this.setTask(creep, worker_const_1.WorkerTask.Idling);
            }
            else {
                const action = creep.transfer(target, RESOURCE_ENERGY);
                if (action === ERR_FULL || action === ERR_NOT_IN_RANGE) {
                    const moveResult = this.moveByPath(creep);
                    if (moveResult !== OK && moveResult !== ERR_TIRED) {
                        this.setTask(creep, worker_const_1.WorkerTask.Idling);
                    }
                }
                else if (action !== OK) {
                    this.setTask(creep, worker_const_1.WorkerTask.Idling);
                }
            }
        }
    }
    taskUpgrade(creep) {
        if (creep.store[RESOURCE_ENERGY] == 0) {
            this.setTask(creep, worker_const_1.WorkerTask.Harvesting);
            return;
        }
        if (!creep.memory.path) {
            this.getPathToController(creep);
        }
        else {
            const action = creep.upgradeController(creep.room.controller);
            if (action === ERR_NOT_IN_RANGE) {
                const moveResult = this.moveByPath(creep);
                // this.drawPath(creep);
                if (moveResult !== OK && moveResult !== ERR_TIRED) {
                    this.getPathToController(creep);
                }
            }
        }
    }
    taskBuild(creep) {
        if (creep.store[RESOURCE_ENERGY] == 0) {
            this.setTask(creep, worker_const_1.WorkerTask.Harvesting);
            return;
        }
        if (!creep.memory.path) {
            this.getDamagedStructures(creep);
            if (!creep.memory.path) {
                this.findConstructionSite(creep);
                if (!creep.memory.path) {
                    this.setTask(creep, worker_const_1.WorkerTask.Idling, "taskBuild");
                }
            }
        }
        else {
            const target = Game.getObjectById(creep.memory.targetId);
            if (!target) {
                this.setTask(creep, worker_const_1.WorkerTask.Idling);
                return;
            }
            let action = creep.repair(target);
            if ("progress" in target) {
                action = creep.build(target);
            }
            if (action === ERR_NOT_IN_RANGE) {
                const moveResult = this.moveByPath(creep);
                if (!("progress" in target) && target.hits === target.hitsMax) {
                    this.setTask(creep, worker_const_1.WorkerTask.Harvesting);
                }
                if (moveResult !== OK && moveResult !== ERR_TIRED) {
                    this.setTask(creep, worker_const_1.WorkerTask.Harvesting);
                }
            }
            else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
                this.setTask(creep, worker_const_1.WorkerTask.Harvesting);
            }
            else if (action === OK &&
                !("progress" in target) &&
                target.hits === target.hitsMax) {
                this.setTask(creep, worker_const_1.WorkerTask.Idling);
            }
        }
    }
    // taskReturnHome(creep: Creep): void {
    //   if (!creep.memory.spawnRoom) {
    //     return;
    //   }
    //   if (!creep.memory.path) {
    //     const room = Game.rooms[creep.memory.spawnRoom];
    //     const controller = room.controller;
    //     if (controller) {
    //       creep.memory.path = this.getPath(creep, controller.pos);
    //       creep.memory.targetId = controller.id;
    //     }
    //   } else {
    //     const moveResult = creep.moveByPath(creep.memory.path as PathStep[]);
    //     if (moveResult !== OK && moveResult !== ERR_TIRED) {
    //       creep.memory.path = undefined;
    //       creep.memory.targetId = null;
    //     }
    //     if (
    //       creep.room.name === creep.memory.spawnRoom &&
    //       creep.pos.x > 2 &&
    //       creep.pos.x < 48 &&
    //       creep.pos.y > 2 &&
    //       creep.pos.y < 48
    //     ) {
    //       this.setTask(creep, WorkerTask.Idling);
    //     }
    //   }
    // }
    // TODO: not working properly
    taskReturnHome(creep) {
        if (!creep.memory.spawnRoom) {
            return;
        }
        if (!creep.memory.targetId) {
            const room = Game.rooms[creep.memory.spawnRoom];
            const controller = room.controller;
            if (controller) {
                creep.memory.targetId = controller.id;
            }
        }
        else {
            const target = Game.getObjectById(creep.memory.targetId);
            if (target) {
                const moveResult = creep.moveTo(target, {
                    reusePath: 5, // Переиспользование пути в течение 5 тиков
                    ignoreCreeps: false, // Крип будет учитывать других крипов
                    visualizePathStyle: { stroke: "#ffffff" }, // Визуализация пути
                });
                if (moveResult !== OK && moveResult !== ERR_TIRED) {
                    creep.memory.targetId = null;
                }
                if (creep.room.name === creep.memory.spawnRoom &&
                    creep.pos.x > 2 &&
                    creep.pos.x < 48 &&
                    creep.pos.y > 2 &&
                    creep.pos.y < 48) {
                    this.setTask(creep, worker_const_1.WorkerTask.Idling);
                }
            }
            else {
                // Если target не найден, сбросим targetId
                creep.memory.targetId = null;
            }
        }
    }
    taskFixingWallsAndRamparts(creep) {
        if (creep.store[RESOURCE_ENERGY] == 0) {
            this.setTask(creep, worker_const_1.WorkerTask.Harvesting);
            return;
        }
        if (!creep.memory.path) {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return ((structure.structureType === STRUCTURE_WALL ||
                        structure.structureType === STRUCTURE_RAMPART) &&
                        structure.hits < structure.hitsMax);
                },
            });
            if (targets.length > 0) {
                targets.sort((a, b) => a.hits - b.hits || creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));
                this.getPathTotargets(creep, [targets[0]]);
            }
            else {
                this.setTask(creep, worker_const_1.WorkerTask.Idling);
            }
        }
        else {
            const target = Game.getObjectById(creep.memory.targetId);
            if (!target) {
                creep.memory.path = undefined;
                creep.memory.targetId = null;
                return;
            }
            if (target.hitsMax > target.hits) {
                const action = creep.repair(target);
                if (action === ERR_NOT_IN_RANGE) {
                    const moveResult = creep.moveByPath(creep.memory.path);
                    if (moveResult !== OK && moveResult !== ERR_TIRED) {
                        creep.memory.path = undefined;
                        creep.memory.targetId = null;
                    }
                }
                else if (action === ERR_INVALID_TARGET ||
                    action === ERR_NO_BODYPART) {
                    creep.memory.path = undefined;
                    creep.memory.targetId = null;
                }
            }
            else {
                creep.memory.path = undefined;
                creep.memory.targetId = null;
            }
        }
    }
    setTask(creep, task, setFunction = "NA") {
        creep.memory.path = undefined;
        creep.memory.targetId = null;
        creep.memory.task = task;
    }
    getPathToController(creep) {
        const controller = creep.room.controller;
        creep.memory.path = this.getPath(creep, controller.pos);
    }
    /**
     * Will search for a cached path in Cache. If there is one, will return it and update lastTimeAccessed. If nothing will be found in cache, will create a new entry and return the path.
     * @param startPos
     * @param endPos
     */
    getPath(creep, endPos) {
        if ((endPos.x === undefined, endPos.y === undefined)) {
            console.log(`${creep.memory.role} has undefined shit as destination`);
        }
        const startPos = creep.pos;
        const roomName = startPos.roomName;
        const cacheKey = `${startPos.x},${startPos.y}:${endPos.roomName},${endPos.x},${endPos.y}`;
        const currentTick = Game.time;
        if (!Memory.cacheCreepPaths) {
            Memory.cacheCreepPaths = {};
        }
        if (!Memory.cacheCreepPaths[roomName]) {
            Memory.cacheCreepPaths[roomName] = {};
        }
        const cachedPath = Memory.cacheCreepPaths[roomName][cacheKey];
        if (cachedPath) {
            cachedPath.lastAccessed = currentTick;
            cachedPath.usedTimes = cachedPath.usedTimes + 1;
            creep.memory.pathName = cacheKey;
            return cachedPath.path;
        }
        const path = startPos.findPathTo(endPos);
        Memory.cacheCreepPaths[roomName][cacheKey] = {
            usedTimes: 1,
            path: path,
            lastAccessed: currentTick,
        };
        creep.memory.pathName = cacheKey;
        return path;
    }
    moveByPath(creep) {
        var _a;
        const path = creep.memory.path;
        if (!path || path.length === 0) {
            return ERR_NOT_FOUND;
        }
        const moveResult = creep.moveByPath(path);
        const roomName = creep.room.name;
        if (moveResult === ERR_INVALID_ARGS || moveResult === ERR_NOT_FOUND) {
            if (Memory.cacheCreepPaths && Memory.cacheCreepPaths[roomName]) {
                delete Memory.cacheCreepPaths[roomName][creep.memory.pathName];
            }
            delete creep.memory.path;
        }
        else if (moveResult === ERR_BUSY || moveResult === OK) {
            if (creep.memory.idleTicks > 2) {
                if (Memory.cacheCreepPaths && Memory.cacheCreepPaths[roomName]) {
                    delete Memory.cacheCreepPaths[roomName][creep.memory.pathName];
                }
                const target = Game.getObjectById((_a = creep.memory) === null || _a === void 0 ? void 0 : _a.targetId);
                creep.memory.idleTicks = 0;
                if (target) {
                    creep.memory.path = this.getPath(creep, target.pos);
                }
            }
        }
        return moveResult;
    }
    /**
     * Will clear the cache of paths.
     */
    clearCreepPathCache(expirationTime = 1000) {
        const currentTick = Game.time;
        if (currentTick % 100 === 0) {
            for (const roomName in Memory.cacheCreepPaths) {
                const roomCache = Memory.cacheCreepPaths[roomName];
                const keysToRemove = [];
                for (const key in roomCache) {
                    const cachedPath = roomCache[key];
                    if (currentTick - cachedPath.lastAccessed > expirationTime ||
                        cachedPath.usedTimes <= 3) {
                        keysToRemove.push(key);
                    }
                }
                for (const key of keysToRemove) {
                    delete roomCache[key];
                }
                const sortedCache = Object.entries(roomCache)
                    .sort(([, a], [, b]) => b.usedTimes - a.usedTimes)
                    .reduce((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }, {});
                Memory.cacheCreepPaths[roomName] = sortedCache;
            }
        }
    }
    getStorageLinkId(room) {
        var _a, _b;
        if (!((_a = Memory.roomData) === null || _a === void 0 ? void 0 : _a.links)) {
            return null;
        }
        const cache = (_b = Memory.roomData) === null || _b === void 0 ? void 0 : _b.links[room.name];
        if (!cache) {
            return null;
        }
        const linkIds = Object.keys(cache);
        for (let linkId of linkIds) {
            if (cache[linkId].storageLink === true) {
                return linkId;
            }
        }
        return null;
    }
}
exports.CreepService = CreepService;
// profiler.registerClass(CreepService, "CreepService");
