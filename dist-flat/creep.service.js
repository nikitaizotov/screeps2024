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
var role_worker_const_1 = require("./role.worker.const");
var creepService = {
    drawPath: function (creep) {
        if (!creep.memory.path) {
            return;
        }
        var visual = new RoomVisual(creep.room.name);
        var currentPos = new RoomPosition(creep.pos.x, creep.pos.y, creep.room.name);
        var pathToDraw = creep.memory.path;
        var inPathPosIndex = creep.memory.path.findIndex(function (elm) { return elm.x === creep.pos.x && elm.y === creep.pos.y; });
        if (inPathPosIndex > -1) {
            pathToDraw = creep.memory.path.slice(inPathPosIndex);
        }
        else {
            pathToDraw = creep.memory.path;
        }
        pathToDraw.forEach(function (step, index) {
            var nextPos = new RoomPosition(step.x, step.y, creep.room.name);
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
        var sources = creep.room.find(FIND_SOURCES, {
            filter: function (source) { return source.energy > 0; },
        });
        var closest = creep.pos.findClosestByPath(sources);
        if (closest) {
            var path = creep.pos.findPathTo(closest);
            creep.memory.path = path;
            creep.memory.targetId = closest.id;
        }
        // const sources = creep.room.find(FIND_SOURCES);
        // let bestPath: PathFinderPath | null = null;
        // let bestSource: Source | null | any = null;
        // let minCost = Infinity;
        // let bestTargetPosition: RoomPosition | null = null;
        // for (const source of sources) {
        //   //const openPositions = this.getOpenPositions(source.pos);
        //   if (source.energy === 0) {
        //     continue;
        //   }
        //   // let creepsAtSource = source.pos
        //   //   .findInRange(FIND_CREEPS, 1)
        //   //   .filter((c: Creep) => c.id !== creep.id);
        //   // let creepsHeadingToSource = _.filter(
        //   //   Object.values(Game.creeps),
        //   //   (c: Creep) => c.memory.targetId === source.id && c.id !== creep.id
        //   // );
        //   // let creepsAtArrival = creepsAtSource.length;
        //   // creepsHeadingToSource.forEach((c: Creep) => {
        //   //   let pathToSource = PathFinder.search(c.pos, {
        //   //     pos: source.pos,
        //   //     range: 1,
        //   //   });
        //   //   let pathToSourceCurrentCreep = PathFinder.search(creep.pos, {
        //   //     pos: source.pos,
        //   //     range: 1,
        //   //   });
        //   //   if (pathToSource.path.length <= pathToSourceCurrentCreep.path.length) {
        //   //     creepsAtArrival++;
        //   //   }
        //   // });
        //   // if (creepsAtArrival >= openPositions.length) {
        //   //   continue;
        //   // }
        //   // openPositions.forEach((pos: RoomPosition) => {
        //   //   let occupied = _.some(Object.values(Game.creeps), (c: Creep) => {
        //   //     return (
        //   //       c.memory.targetPos &&
        //   //       c.memory.targetPos.x === pos.x &&
        //   //       c.memory.targetPos.y === pos.y &&
        //   //       c.id !== creep.id
        //   //     );
        //   //   });
        //   //   if (occupied) {
        //   //     return;
        //   //   }
        //   //   let path = PathFinder.search(
        //   //     creep.pos,
        //   //     { pos: pos, range: 0 },
        //   //     {
        //   //       plainCost: 2,
        //   //       swampCost: 10,
        //   //       roomCallback: (roomName: string) => {
        //   //         let room = Game.rooms[roomName];
        //   //         if (!room) return new PathFinder.CostMatrix();
        //   //         let costs = new PathFinder.CostMatrix();
        //   //         room.find(FIND_STRUCTURES).forEach((struct) => {
        //   //           if (struct.structureType === STRUCTURE_ROAD) {
        //   //             costs.set(struct.pos.x, struct.pos.y, 1);
        //   //           } else if (
        //   //             struct.structureType !== STRUCTURE_CONTAINER &&
        //   //             struct.structureType !== STRUCTURE_RAMPART
        //   //           ) {
        //   //             costs.set(struct.pos.x, struct.pos.y, 0xff);
        //   //           }
        //   //         });
        //   //         room.find(FIND_CREEPS).forEach((c) => {
        //   //           costs.set(c.pos.x, c.pos.y, 0xff);
        //   //         });
        //   //         return costs;
        //   //       },
        //   //     }
        //   //   );
        //   //   if (!path.incomplete && path.cost < minCost) {
        //   //     minCost = path.cost;
        //   //     bestPath = path;
        //   //     bestSource = source;
        //   //     bestTargetPosition = pos;
        //   //   }
        //   // });
        // }
        // if (bestSource && bestTargetPosition) {
        //   creep.memory.path = creep.pos.findPathTo(bestTargetPosition);
        //   creep.memory.targetId = bestSource.id;
        //   creep.memory.targetPos = bestTargetPosition;
        // } else {
        //   let closestSource = creep.pos.findClosestByPath(sources);
        //   if (closestSource) {
        //     let closestOpenPosition = this.getOpenPositions(closestSource.pos).sort(
        //       (a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b)
        //     )[0];
        //     if (closestOpenPosition) {
        //       creep.memory.path = creep.pos.findPathTo(closestOpenPosition);
        //       creep.memory.targetId = closestSource.id;
        //       creep.memory.targetPos = closestOpenPosition;
        //     }
        //   }
        // }
    },
    findConstructionSite: function (creep) {
        var constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
        // if (constructionTargets.length > 0) {
        //   creep.memory.targetId = constructionTargets[0].id as Id<
        //     ConstructionSite<BuildableStructureConstant>
        //   >;
        //   creep.memory.path = creep.pos.findPathTo(constructionTargets[0].pos);
        // }
        // const constructionSites: AnyStructure[] = creep.room.find(FIND_STRUCTURES, {
        //   filter: (structure) => {
        //     return (
        //       structure.hits < structure.hitsMax &&
        //       structure.structureType !== STRUCTURE_WALL &&
        //       structure.structureType !== STRUCTURE_RAMPART
        //     );
        //   },
        // });
        if (constructionSites.length > 0) {
            var closestSite = creep.pos.findClosestByPath(constructionSites);
            if (closestSite) {
                creep.memory.path = creep.pos.findPathTo(closestSite);
                creep.memory.targetId = closestSite.id;
            }
        }
        else {
            var controller = creep.room.controller;
            if (controller) {
                creep.memory.targetId = controller.id;
                creep.memory.path = creep.pos.findPathTo(controller);
            }
        }
    },
    getDamagedStructures: function (creep) {
        var targets = creep.room.find(FIND_STRUCTURES, {
            filter: function (structure) {
                return (structure.hits < structure.hitsMax &&
                    structure.structureType !== STRUCTURE_WALL &&
                    structure.structureType !== STRUCTURE_RAMPART);
            },
        });
        if (targets.length > 0) {
            var closestSite = creep.pos.findClosestByPath(targets);
            if (closestSite) {
                creep.memory.path = creep.pos.findPathTo(closestSite);
                creep.memory.targetId = closestSite.id;
            }
        }
        else {
            var controller = creep.room.controller;
            if (controller) {
                creep.memory.targetId = controller.id;
                creep.memory.path = creep.pos.findPathTo(controller);
            }
        }
    },
    getOpenPositions: function (roomPosition) {
        var terrain = Game.map.getRoomTerrain(roomPosition.roomName);
        var openPositions = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue;
                var x = roomPosition.x + dx;
                var y = roomPosition.y + dy;
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    var pos = new RoomPosition(x, y, roomPosition.roomName);
                    var isOccupied = pos.lookFor(LOOK_CREEPS).length > 0;
                    var isBlocked = pos
                        .lookFor(LOOK_STRUCTURES)
                        .some(function (struct) {
                        return struct.structureType !== STRUCTURE_ROAD &&
                            struct.structureType !== STRUCTURE_CONTAINER &&
                            struct.structureType !== STRUCTURE_RAMPART &&
                            struct.structureType !== STRUCTURE_STORAGE;
                    });
                    if (!isOccupied && !isBlocked) {
                        openPositions.push(pos);
                    }
                }
            }
        }
        return openPositions;
    },
    getPathTotargets: function (creep, targets) {
        var bestPath = null;
        var bestTarget = null;
        var minCost = Infinity;
        for (var _i = 0, targets_1 = targets; _i < targets_1.length; _i++) {
            var target = targets_1[_i];
            var openPositions = this.getOpenPositions(target.pos);
            var creepsAtTarget = target.pos.findInRange(FIND_CREEPS, 1).length;
            if (creepsAtTarget >= openPositions.length) {
                continue;
            }
            var path = PathFinder.search(creep.pos, { pos: target.pos, range: 1 }, {
                plainCost: 2,
                swampCost: 10,
                roomCallback: function (roomName) {
                    var room = Game.rooms[roomName];
                    if (!room)
                        return new PathFinder.CostMatrix();
                    var costs = new PathFinder.CostMatrix();
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
            creep.memory.path = creep.pos.findPathTo(bestTarget.pos);
            creep.memory.targetId = bestTarget.id;
        }
        else {
            creep.say("No path found!");
        }
    },
    moveAndHarvest: function (creep) {
        var objectToCheck = Game.getObjectById(creep.memory.targetId);
        if (objectToCheck && objectToCheck.structureType === STRUCTURE_CONTAINER) {
            this.moveAndCollectFromContainer(creep, objectToCheck);
        }
        else {
            var source = Game.getObjectById(creep.memory.targetId);
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
                    var moveResult = creep.moveByPath(creep.memory.path);
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
        if (creep.memory.idleTicks >= 5) {
            creep.memory.idleTicks = 0;
            return true;
        }
        return false;
    },
    // findIdleCreep: function (creep: Creep): void {
    //   if (this.isCreepIsStuck(creep)) {
    //     creep.memory.targetId = null;
    //     creep.memory.path = undefined;
    //   }
    // },
    moveAndCollectFromContainer: function (creep, container) {
        var action = creep.withdraw(container, RESOURCE_ENERGY);
        if (action === ERR_NOT_IN_RANGE) {
            creepService.drawPath(creep);
            var moveResult = creep.moveByPath(creep.memory.path);
            if (moveResult === ERR_NOT_FOUND || moveResult === ERR_INVALID_ARGS) {
                this.findContainer(creep);
            }
        }
    },
    /**
     * Searches for a container with miner near it, if container having a free space, adds path and id to creep memory.
     * @param creep
     */
    findContainer: function (creep) {
        creep.memory.targetId = null;
        creep.memory.path = undefined;
        var containers = creep.room.find(FIND_STRUCTURES, {
            filter: function (structure) { return structure.structureType === STRUCTURE_CONTAINER; },
        });
        containers = lodash_1.default.sortBy(containers, function (container) {
            return creep.pos.getRangeTo(container);
        });
        var closestContainer = null;
        var minDistance = Infinity;
        for (var _i = 0, containers_1 = containers; _i < containers_1.length; _i++) {
            var container = containers_1[_i];
            var miners = container.pos
                .findInRange(FIND_MY_CREEPS, 1)
                .filter(function (c) { return c.memory.role === "miner"; });
            if (container.store.energy === 0) {
                continue;
            }
            if (miners.length > 0 || container.store.energy > 0) {
                // const area = creep.room.lookAtArea(
                //   container.pos.y - 1,
                //   container.pos.x - 1,
                //   container.pos.y + 1,
                //   container.pos.x + 1,
                //   true
                // );
                // let hasFreeSpot = false;
                // for (const pos of area) {
                //   if (
                //     (pos.type === "terrain" && pos.terrain !== "wall") ||
                //     pos.type === "creep" ||
                //     pos.type === "structure"
                //   ) {
                //     const posCreeps = creep.room.lookForAt(LOOK_CREEPS, pos.x, pos.y);
                //     const posStructures = creep.room.lookForAt(
                //       LOOK_STRUCTURES,
                //       pos.x,
                //       pos.y
                //     );
                //     const posConstructionSites = creep.room.lookForAt(
                //       LOOK_CONSTRUCTION_SITES,
                //       pos.x,
                //       pos.y
                //     );
                //     if (
                //       posCreeps.length === 0 &&
                //       posStructures.length === 0 &&
                //       posConstructionSites.length === 0
                //     ) {
                //       const creepsHeadingToPos = _.filter(
                //         Object.values(Game.creeps),
                //         (c: Creep) =>
                //           c.memory.targetPos &&
                //           c.memory.targetPos.x === pos.x &&
                //           c.memory.targetPos.y === pos.y
                //       );
                //       if (creepsHeadingToPos.length === 0) {
                //         hasFreeSpot = true;
                //         break;
                //       }
                //     }
                //   }
                // }
                // if (hasFreeSpot) {
                var distance = creep.pos.getRangeTo(container.pos);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestContainer = container;
                }
                // }
            }
        }
        if (closestContainer) {
            creep.memory.targetId = closestContainer.id;
            creep.memory.path = creep.pos.findPathTo(closestContainer);
        }
    },
    isTargetedByOtherCreeps: function (target) {
        return lodash_1.default.some(Object.values(Game.creeps), function (c) {
            return c.memory.targetId === target.id && c.memory.transferring;
        });
    },
    taskHarvest: function (creep) {
        if (creep.store.getFreeCapacity() == 0) {
            creep.memory.task = role_worker_const_1.WorkerTask.Idling;
        }
        if (!creep.memory.path || !creep.memory.targetId) {
            this.getPathToSource(creep);
        }
        else {
            this.moveAndHarvest(creep);
        }
    },
    taskTransfer: function (creep) {
        var _this = this;
        if (creep.store[RESOURCE_ENERGY] == 0) {
            console.log("UNSET!!!!!!!!!");
            creep.memory.path = undefined;
            creep.memory.targetId = null;
            creep.memory.task = role_worker_const_1.WorkerTask.Harvesting;
            return;
        }
        if (!creep.memory.path || !creep.memory.targetId) {
            var room = creep.room;
            var targets = room.find(FIND_STRUCTURES, {
                filter: function (structure) {
                    return ((structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_TOWER ||
                        structure.structureType === STRUCTURE_EXTENSION) &&
                        structure.store &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
                },
            });
            var spawns = targets.filter(function (t) { return t.structureType === STRUCTURE_SPAWN; });
            var extensions = targets.filter(function (t) { return t.structureType === STRUCTURE_EXTENSION; });
            var towers = targets.filter(function (t) { return t.structureType === STRUCTURE_TOWER; });
            var sortedExtensions = extensions
                .filter(function (ext) { return !_this.isTargetedByOtherCreeps(ext); })
                .sort(function (a, b) { return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b); });
            var sortedSpawns = spawns
                .filter(function (spawn) { return !_this.isTargetedByOtherCreeps(spawn); })
                .sort(function (a, b) { return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b); });
            var sortedTowers = towers.sort(function (a, b) { return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b); });
            var priorityTargets = __spreadArray(__spreadArray(__spreadArray([], sortedSpawns, true), sortedExtensions, true), sortedTowers, true);
            if (priorityTargets.length) {
                var newTarget = targets[0];
                creep.memory.targetId = newTarget.id;
                creep.memory.path = creep.pos.findPathTo(newTarget);
            }
            else {
                creep.memory.task = role_worker_const_1.WorkerTask.Idling;
            }
        }
        else {
            var target = Game.getObjectById(creep.memory.targetId);
            console.log("HERE");
            // Reset target if it's invalid or full.
            if (!target ||
                ("store" in target &&
                    target.store.getFreeCapacity(RESOURCE_ENERGY) === 0)) {
                creep.memory.path = undefined;
                creep.memory.targetId = null;
                creep.memory.task = role_worker_const_1.WorkerTask.Idling;
            }
            else {
                console.log("TADDAAA");
                var action = creep.transfer(target, RESOURCE_ENERGY);
                if (action === ERR_FULL) {
                    creep.memory.task = role_worker_const_1.WorkerTask.Idling;
                }
                if (action === ERR_NOT_IN_RANGE) {
                    var moveResult = creep.moveByPath(creep.memory.path);
                    if (moveResult !== OK && moveResult !== ERR_TIRED) {
                        console.log("Move by path failed, error: ".concat(moveResult));
                        creep.memory.path = undefined;
                        creep.memory.targetId = null;
                        creep.memory.task = role_worker_const_1.WorkerTask.Idling;
                    }
                }
            }
        }
    },
};
exports.default = creepService;
