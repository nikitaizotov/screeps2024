"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = __importDefault(require("lodash"));
var creep_service_1 = __importDefault(require("./creep.service"));
var roleMiner = {
    creepsPerRoom: 99,
    namePrefix: "Miner",
    memoryKey: "miner",
    bodyParts: [WORK, WORK, WORK, WORK],
    baseBodyParts: [WORK, MOVE, CARRY],
    maxBodyPartsMultiplier: 3,
    run: function (creep) {
        if (creep.spawning) {
            return;
        }
        if (!creep.memory.working) {
            if (!creep.memory.targetPos || !creep.memory.path) {
                this.findContainerAndSource(creep);
            }
            else {
                creep_service_1.default.drawPath(creep);
                creep.moveByPath(creep.memory.path);
                if (creep.pos.x === creep.memory.targetPos.x &&
                    creep.pos.y === creep.memory.targetPos.y &&
                    creep.pos.roomName === creep.memory.targetPos.roomName) {
                    creep.memory.working = true;
                }
            }
        }
        else {
            if (creep.store.getFreeCapacity() > 0) {
                var targetSource = Game.getObjectById(creep.memory.targetSourceId);
                creep.harvest(targetSource);
            }
            else {
                var targetContainer = Game.getObjectById(creep.memory.targetContainerId);
                creep.transfer(targetContainer, RESOURCE_ENERGY);
            }
        }
    },
    /**
     * Searches for a container with a miner near it, if the container has a free space, adds the path and id to the creep's memory.
     * @param creep
     */
    findContainerAndSource: function (creep) {
        var containers = creep.room.find(FIND_STRUCTURES, {
            filter: function (structure) { return structure.structureType === STRUCTURE_CONTAINER; },
        });
        var _loop_1 = function (container) {
            var miners = container.pos
                .findInRange(FIND_MY_CREEPS, 1)
                .filter(function (c) { return c.memory.role === "miner"; });
            if (miners.length === 0) {
                var sources = container.pos.findInRange(FIND_SOURCES, 2);
                var pos_1 = this_1.findPositionBetween(container.pos, sources[0].pos);
                var creepsHeadingTo = lodash_1.default.filter(Object.values(Game.creeps), function (c) { return c.memory.targetPos === pos_1 && c.memory.role === "miner"; });
                if (creepsHeadingTo.length === 0) {
                    creep.memory.targetPos = pos_1;
                    creep.memory.targetContainerId = container.id;
                    creep.memory.targetSourceId = sources[sources.length - 1].id;
                    creep.memory.path = creep.pos.findPathTo(pos_1);
                    return { value: void 0 };
                }
            }
        };
        var this_1 = this;
        for (var _i = 0, containers_1 = containers; _i < containers_1.length; _i++) {
            var container = containers_1[_i];
            var state_1 = _loop_1(container);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    },
    findPositionBetween: function (containerPos, sourcePos) {
        var terrain = Game.map.getRoomTerrain(containerPos.roomName);
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue;
                var x = containerPos.x + dx;
                var y = containerPos.y + dy;
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    var pos = new RoomPosition(x, y, containerPos.roomName);
                    if (pos.getRangeTo(sourcePos) <= 1) {
                        return pos;
                    }
                }
            }
        }
        return null;
    },
};
exports.default = roleMiner;
