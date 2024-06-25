"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = __importDefault(require("lodash"));
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
    getPathToSource: function (creep) {
        var sources = creep.room.find(FIND_SOURCES);
        var bestPath = null;
        var bestSource = null;
        var minCost = Infinity;
        var bestTargetPosition = null;
        var _loop_1 = function (source) {
            var openPositions = this_1.getOpenPositions(source.pos);
            var creepsAtSource = source.pos
                .findInRange(FIND_CREEPS, 1)
                .filter(function (c) { return c.id !== creep.id; });
            var creepsHeadingToSource = lodash_1.default.filter(Object.values(Game.creeps), function (c) { return c.memory.targetId === source.id && c.id !== creep.id; });
            var creepsAtArrival = creepsAtSource.length;
            creepsHeadingToSource.forEach(function (c) {
                var pathToSource = PathFinder.search(c.pos, {
                    pos: source.pos,
                    range: 1,
                });
                var pathToSourceCurrentCreep = PathFinder.search(creep.pos, {
                    pos: source.pos,
                    range: 1,
                });
                if (pathToSource.path.length <= pathToSourceCurrentCreep.path.length) {
                    creepsAtArrival++;
                }
            });
            if (creepsAtArrival >= openPositions.length) {
                return "continue";
            }
            openPositions.forEach(function (pos) {
                var occupied = lodash_1.default.some(Object.values(Game.creeps), function (c) {
                    return (c.memory.targetPos &&
                        c.memory.targetPos.x === pos.x &&
                        c.memory.targetPos.y === pos.y &&
                        c.id !== creep.id);
                });
                if (occupied) {
                    return;
                }
                var path = PathFinder.search(creep.pos, { pos: pos, range: 0 }, {
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
                                struct.structureType !== STRUCTURE_RAMPART) {
                                costs.set(struct.pos.x, struct.pos.y, 0xff);
                            }
                        });
                        room.find(FIND_CREEPS).forEach(function (c) {
                            costs.set(c.pos.x, c.pos.y, 0xff);
                        });
                        return costs;
                    },
                });
                if (!path.incomplete && path.cost < minCost) {
                    minCost = path.cost;
                    bestPath = path;
                    bestSource = source;
                    bestTargetPosition = pos;
                }
            });
        };
        var this_1 = this;
        for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
            var source = sources_1[_i];
            _loop_1(source);
        }
        if (bestSource && bestTargetPosition) {
            creep.memory.path = creep.pos.findPathTo(bestTargetPosition);
            creep.memory.targetId = bestSource.id;
            creep.memory.targetPos = bestTargetPosition;
        }
        else {
            var closestSource = creep.pos.findClosestByPath(sources);
            if (closestSource) {
                var closestOpenPosition = this.getOpenPositions(closestSource.pos).sort(function (a, b) { return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b); })[0];
                if (closestOpenPosition) {
                    creep.memory.path = creep.pos.findPathTo(closestOpenPosition);
                    creep.memory.targetId = closestSource.id;
                    creep.memory.targetPos = closestOpenPosition;
                }
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
    findIdleCreep: function (creep) {
        if (this.isCreepIsStuck(creep)) {
            creep.memory.targetId = null;
            creep.memory.path = undefined;
        }
    },
};
exports.default = creepService;
