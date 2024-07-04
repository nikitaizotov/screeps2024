"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleMiner = void 0;
const lodash_1 = __importDefault(require("lodash"));
const creep_service_1 = require("./creep.service");
class RoleMiner {
    constructor() {
        this.creepsPerRoom = 99;
        this.namePrefix = "Miner";
        this.memoryKey = "miner";
        this.bodyParts = [WORK, WORK, WORK, WORK];
        this.baseBodyParts = [WORK, MOVE, CARRY];
        this.maxBodyPartsMultiplier = 3;
        this.creepService = new creep_service_1.CreepService();
    }
    run(creep) {
        if (creep.spawning) {
            return;
        }
        if (!creep.memory.working) {
            if (!creep.memory.targetPos || !creep.memory.path) {
                this.findContainerAndSource(creep);
            }
            else {
                this.creepService.drawPath(creep);
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
                const targetSource = Game.getObjectById(creep.memory.targetSourceId);
                creep.harvest(targetSource);
            }
            else {
                const targetContainer = Game.getObjectById(creep.memory.targetContainerId);
                creep.transfer(targetContainer, RESOURCE_ENERGY);
            }
        }
    }
    /**
     * Searches for a container with a miner near it, if the container has a free space, adds the path and id to the creep's memory.
     * @param creep
     */
    findContainerAndSource(creep) {
        const containers = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_CONTAINER,
        });
        for (const container of containers) {
            const miners = container.pos
                .findInRange(FIND_MY_CREEPS, 1)
                .filter((c) => c.memory.role === "miner");
            if (miners.length === 0) {
                const sources = container.pos.findInRange(FIND_SOURCES, 2);
                const pos = this.findPositionBetween(container.pos, sources[0].pos);
                const creepsHeadingTo = lodash_1.default.filter(Object.values(Game.creeps), (c) => c.memory.targetPos === pos && c.memory.role === "miner");
                if (creepsHeadingTo.length === 0) {
                    creep.memory.targetPos = pos;
                    creep.memory.targetContainerId = container.id;
                    creep.memory.targetSourceId = sources[sources.length - 1].id;
                    creep.memory.path = creep.pos.findPathTo(pos);
                    return;
                }
            }
        }
    }
    findPositionBetween(containerPos, sourcePos) {
        const terrain = Game.map.getRoomTerrain(containerPos.roomName);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue;
                const x = containerPos.x + dx;
                const y = containerPos.y + dy;
                if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                    const pos = new RoomPosition(x, y, containerPos.roomName);
                    if (pos.getRangeTo(sourcePos) <= 1) {
                        return pos;
                    }
                }
            }
        }
        return null;
    }
}
exports.RoleMiner = RoleMiner;
