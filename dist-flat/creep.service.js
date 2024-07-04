"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const role_worker_const_1 = require("./role.worker.const");
const profiler = require("./screeps-profiler");
const creepService = {
    drawPath: function (creep) {
        if (!creep.memory.path) {
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
    },
    /**
     * Gets path to a container, or source.
     * @param creep
     */
    getPathToSource: function (creep) {
        this.findContainer(creep);
        if (creep.memory.targetId) {
            return;
        }
        const sources = creep.room.find(FIND_SOURCES, {
            filter: (source) => source.energy > 0,
        });
        const closest = creep.pos.findClosestByPath(sources);
        if (closest) {
            const path = this.getPath(creep.pos, closest.pos);
            creep.memory.path = path;
            creep.memory.targetId = closest.id;
        }
    },
    findConstructionSite: function (creep) {
        const constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
        if (constructionSites.length > 0) {
            let closestSite = creep.pos.findClosestByPath(constructionSites);
            if (closestSite) {
                creep.memory.path = this.getPath(creep.pos, closestSite.pos);
                creep.memory.targetId = closestSite.id;
            }
        }
    },
    getDamagedStructures: function (creep) {
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
                creep.memory.path = this.getPath(creep.pos, closestSite.pos);
                creep.memory.targetId = closestSite.id;
            }
        }
    },
    getOpenPositions: function (roomPosition) {
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
    },
    getPathTotargets: function (creep, targets) {
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
            creep.memory.path = this.getPath(creep.pos, bestTarget.pos);
            creep.memory.targetId = bestTarget.id;
        }
    },
    moveAndHarvest: function (creep) {
        const objectToCheck = Game.getObjectById(creep.memory.targetId);
        if (objectToCheck && objectToCheck.structureType === STRUCTURE_CONTAINER) {
            this.moveAndCollectFromContainer(creep, objectToCheck);
        }
        else {
            let source = Game.getObjectById(creep.memory.targetId);
            if (!source) {
                creep.memory.targetId = null;
                creep.memory.path = undefined;
                this.getPathToSource(creep);
                return;
            }
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                this.drawPath(creep);
                if (this.isCreepIsStuck(creep)) {
                    this.getPathToSource(creep);
                }
                else {
                    let moveResult = creep.moveByPath(creep.memory.path);
                    if (moveResult === ERR_NOT_FOUND || moveResult === ERR_INVALID_ARGS) {
                        this.getPathToSource(creep);
                    }
                }
            }
        }
    },
    isCreepIsStuck: function (creep) {
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
            creep.memory.idleTicks++;
        }
        else {
            creep.memory.lastPos = {
                x: creep.pos.x,
                y: creep.pos.y,
                energy: creep.store.getUsedCapacity(RESOURCE_ENERGY),
            };
            creep.memory.idleTicks = 0;
        }
        if (creep.memory.idleTicks >= 4) {
            creep.memory.idleTicks = 0;
            return true;
        }
        return false;
    },
    findIdleCreep: function (creep) {
        if (this.isCreepIsStuck(creep)) {
            creep.memory.targetId = null;
            creep.memory.path = undefined;
        }
    },
    moveAndCollectFromContainer: function (creep, container) {
        if (!creep.memory.path || !creep.memory.path.length) {
            creep.memory.path = creep.pos.findPathTo(container.pos);
        }
        const action = creep.withdraw(container, RESOURCE_ENERGY);
        if (action === ERR_NOT_IN_RANGE) {
            const moveResult = creep.moveByPath(creep.memory.path);
            if (moveResult === ERR_NOT_FOUND || moveResult === ERR_INVALID_ARGS) {
                creep.memory.path = creep.pos.findPathTo(container.pos);
            }
        }
        else if (action === ERR_INVALID_TARGET ||
            action === ERR_NOT_ENOUGH_RESOURCES) {
            this.findContainer(creep);
        }
    },
    findContainer: function (creep) {
        creep.memory.targetId = null;
        creep.memory.path = undefined;
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_CONTAINER,
        });
        let closestContainer = null;
        let minDistance = Infinity;
        for (const container of containers) {
            if (container.store[RESOURCE_ENERGY] === 0)
                continue;
            const miners = container.pos.findInRange(FIND_MY_CREEPS, 1, {
                filter: (c) => c.memory.role === "miner",
            });
            if (miners.length > 0 || container.store[RESOURCE_ENERGY] > 0) {
                const distance = creep.pos.getRangeTo(container.pos);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestContainer = container;
                }
            }
        }
        if (closestContainer) {
            creep.memory.targetId = closestContainer.id;
            creep.memory.path = this.getPath(creep.pos, closestContainer.pos);
        }
    },
    isTargetedByOtherCreeps(target) {
        return lodash_1.default.some(Object.values(Game.creeps), (c) => {
            return c.memory.targetId === target.id && c.memory.transferring;
        });
    },
    taskHarvest: function (creep) {
        if (creep.store.getFreeCapacity() == 0) {
            this.setTask(creep, role_worker_const_1.WorkerTask.Idling);
        }
        if (!creep.memory.path || !creep.memory.targetId) {
            this.getPathToSource(creep);
        }
        else {
            this.moveAndHarvest(creep);
        }
    },
    taskTransfer: function (creep) {
        if (creep.store[RESOURCE_ENERGY] === 0) {
            this.setTask(creep, role_worker_const_1.WorkerTask.Harvesting);
            return;
        }
        if (!creep.memory.path || !creep.memory.targetId) {
            const room = creep.room;
            let target = null;
            // Поиск ближайшей цели среди спаунов и экстеншенов
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
            // Если нет подходящих спаунов и экстеншенов, ищем ближайшую башню
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
                creep.memory.path = this.getPath(creep.pos, target.pos);
            }
            else {
                this.setTask(creep, role_worker_const_1.WorkerTask.Idling);
            }
        }
        else {
            const target = Game.getObjectById(creep.memory.targetId);
            // Сброс цели, если она недействительна или заполнена
            if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                this.setTask(creep, role_worker_const_1.WorkerTask.Idling);
            }
            else {
                const action = creep.transfer(target, RESOURCE_ENERGY);
                if (action === ERR_FULL || action === ERR_NOT_IN_RANGE) {
                    const moveResult = creep.moveByPath(creep.memory.path);
                    if (moveResult !== OK && moveResult !== ERR_TIRED) {
                        this.setTask(creep, role_worker_const_1.WorkerTask.Idling);
                    }
                }
                else if (action !== OK) {
                    this.setTask(creep, role_worker_const_1.WorkerTask.Idling);
                }
            }
        }
    },
    taskUpgrade(creep) {
        if (creep.store[RESOURCE_ENERGY] == 0) {
            this.setTask(creep, role_worker_const_1.WorkerTask.Harvesting);
            return;
        }
        if (!creep.memory.path) {
            this.getPathToController(creep);
        }
        else {
            const action = creep.upgradeController(creep.room.controller);
            if (action === ERR_NOT_IN_RANGE) {
                const moveResult = creep.moveByPath(creep.memory.path);
                creepService.drawPath(creep);
                if (moveResult !== OK && moveResult !== ERR_TIRED) {
                    this.getPathToController(creep);
                }
            }
        }
    },
    taskBuild(creep) {
        if (creep.store[RESOURCE_ENERGY] == 0) {
            this.setTask(creep, role_worker_const_1.WorkerTask.Harvesting);
            return;
        }
        if (!creep.memory.path) {
            this.getDamagedStructures(creep);
            if (!creep.memory.path) {
                this.findConstructionSite(creep);
                if (!creep.memory.path) {
                    this.setTask(creep, role_worker_const_1.WorkerTask.Idling, "taskBuild");
                }
            }
        }
        else {
            const target = Game.getObjectById(creep.memory.targetId);
            if (!target) {
                this.setTask(creep, role_worker_const_1.WorkerTask.Idling);
                return;
            }
            let action = creep.repair(target);
            if ("progress" in target) {
                action = creep.build(target);
            }
            if (action === ERR_NOT_IN_RANGE) {
                const moveResult = creep.moveByPath(creep.memory.path);
                if (!("progress" in target) && target.hits === target.hitsMax) {
                    this.setTask(creep, role_worker_const_1.WorkerTask.Harvesting);
                }
                if (moveResult !== OK && moveResult !== ERR_TIRED) {
                    this.setTask(creep, role_worker_const_1.WorkerTask.Harvesting);
                }
            }
            else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
                this.setTask(creep, role_worker_const_1.WorkerTask.Harvesting);
            }
            else if (action === OK &&
                !("progress" in target) &&
                target.hits === target.hitsMax) {
                this.setTask(creep, role_worker_const_1.WorkerTask.Idling);
            }
        }
    },
    setTask(creep, task, setFunction = "NA") {
        creep.memory.path = undefined;
        creep.memory.targetId = null;
        creep.memory.task = task;
    },
    getPathToController(creep) {
        const controller = creep.room.controller;
        creep.memory.path = this.getPath(creep.pos, controller.pos);
    },
    /**
     * Will search for a cached path in Cache. If there is one, will return it and update lastTimeAccessed. If nothing will be found in cache, will create a new entry and return the path.
     * @param startPos
     * @param endPos
     */
    getPath(startPos, endPos) {
        // if (!Memory.cacheCreepPaths) {
        //   Memory.cacheCreepPaths = {};
        // }
        // if (!Memory.cacheCreepPaths[startPos.roomName]) {
        //   Memory.cacheCreepPaths[startPos.roomName] = {};
        // }
        // const pathName: string = `${startPos.roomName}_${startPos.x}_${startPos.y}_${endPos.roomName}_${endPos.x}_${endPos.y}`;
        // const cachedPath = Memory.cacheCreepPaths[startPos.roomName][pathName];
        // if (cachedPath) {
        //   cachedPath.lastTimeAccessed = Game.time;
        //   cachedPath.usedTimes = cachedPath.usedTimes + 1;
        //   return cachedPath.path;
        // }
        // const path = startPos.findPathTo(endPos);
        // const newCacheEntry: CachedCreepPath = {
        //   lastTimeAccessed: Game.time,
        //   path: path,
        //   usedTimes: 1,
        // };
        // Memory.cacheCreepPaths[startPos.roomName][pathName] = newCacheEntry;
        const path = startPos.findPathTo(endPos);
        return path;
    },
    /**
     * Will clear the cache of paths.
     */
    clearCreepPathCache(expirationTime = 1000) {
        // if (Game.time % 1000 === 0) {
        //   if (!Memory.cacheCreepPaths) return;
        //   for (const roomName in Memory.cacheCreepPaths) {
        //     for (const pathName in Memory.cacheCreepPaths[roomName]) {
        //       const cachedPath = Memory.cacheCreepPaths[roomName][pathName];
        //       if (Game.time - cachedPath.lastTimeAccessed > expirationTime) {
        //         delete Memory.cacheCreepPaths[roomName][pathName];
        //       }
        //     }
        //     if (Object.keys(Memory.cacheCreepPaths[roomName]).length === 0) {
        //       delete Memory.cacheCreepPaths[roomName];
        //     }
        //   }
        // }
    },
    createStructureCache() {
        Memory.creepRoomCache = {};
        const rooms = Game.rooms;
        for (let roomName in rooms) {
            const room = Game.rooms[roomName];
            const structures = room.find(FIND_STRUCTURES);
            if (structures) {
                Memory.creepRoomCache[roomName] = structures;
            }
        }
    },
};
//profiler.registerObject(creepService, "creepService");
exports.default = creepService;
