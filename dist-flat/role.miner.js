"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleMiner = void 0;
const lodash_1 = __importDefault(require("lodash"));
const creep_service_1 = require("./creep.service");
const role_link_manager_1 = require("./role.link-manager");
class RoleMiner {
    constructor() {
        this.creepsPerRoom = 99;
        this.namePrefix = "Miner";
        this.memoryKey = "miner";
        this.bodyParts = [WORK];
        this.baseBodyParts = [WORK, MOVE, CARRY];
        this.maxBodyPartsMultiplier = 12;
        this.creepService = new creep_service_1.CreepService();
        this.roleLinkManager = new role_link_manager_1.RoleLinkManager();
    }
    run(creep) {
        // If the creep is still spawning, do nothing.
        if (creep.spawning) {
            return;
        }
        // Check if the creep should focus on the link.
        if (creep.memory.focusOnLink === undefined || !creep.memory.focusOnLink) {
            const isStoragesLinked = this.roleLinkManager.getStorageLinkId(creep.room);
            if (isStoragesLinked) {
                creep.memory.focusOnLink = true;
                creep.memory.working = false;
                creep.memory.targetPos = undefined;
                creep.memory.path = undefined;
            }
        }
        // If the creep is not working, find a container and source or move to the target position.
        if (!creep.memory.working) {
            if (!creep.memory.targetPos || !creep.memory.path) {
                this.findContainerAndSource(creep);
            }
            else {
                // Move to the target position using the stored path.
                creep.moveByPath(creep.memory.path);
                // If the creep reaches the target position, set it to working.
                if (creep.pos.x === creep.memory.targetPos.x &&
                    creep.pos.y === creep.memory.targetPos.y &&
                    creep.pos.roomName === creep.memory.targetPos.roomName) {
                    creep.memory.working = true;
                }
            }
        }
        else {
            // If the creep is working, either harvest from the source or transfer energy to the container.
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
     * @param creep The creep that is searching for a container and source.
     */
    findContainerAndSource(creep) {
        var _a, _b;
        const targets = creep.memory.focusOnLink
            ? creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => structure.structureType === STRUCTURE_LINK,
            })
            : creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => structure.structureType === STRUCTURE_CONTAINER,
            });
        for (let target of targets) {
            const miners = target.pos
                .findInRange(FIND_MY_CREEPS, 1)
                .filter((c) => c.memory.role === "miner" && (c === null || c === void 0 ? void 0 : c.id) !== (creep === null || creep === void 0 ? void 0 : creep.id));
            if (miners.length === 0) {
                const sources = target.pos.findInRange(FIND_SOURCES, 2);
                const pos = this.findPositionBetween(target.pos);
                const creepsHeadingTo = lodash_1.default.filter(Object.values(Game.creeps), (c) => {
                    var _a, _b, _c;
                    return ((_a = c.memory.targetPos) === null || _a === void 0 ? void 0 : _a.x) === (pos === null || pos === void 0 ? void 0 : pos.x) &&
                        ((_b = c.memory.targetPos) === null || _b === void 0 ? void 0 : _b.y) === (pos === null || pos === void 0 ? void 0 : pos.y) &&
                        ((_c = c.memory.targetPos) === null || _c === void 0 ? void 0 : _c.roomName) === (pos === null || pos === void 0 ? void 0 : pos.roomName) &&
                        c.memory.role === "miner" &&
                        c.id !== creep.id;
                });
                // Ensure no other miner is heading to the same target position before setting the current creep's target.
                if (creepsHeadingTo.length === 0 &&
                    ((_a = sources[sources.length - 1]) === null || _a === void 0 ? void 0 : _a.id) &&
                    (target === null || target === void 0 ? void 0 : target.id)) {
                    creep.memory.targetPos = pos;
                    creep.memory.targetContainerId = target === null || target === void 0 ? void 0 : target.id;
                    creep.memory.targetSourceId = (_b = sources[sources.length - 1]) === null || _b === void 0 ? void 0 : _b.id;
                    creep.memory.path = creep.pos.findPathTo(pos);
                    return;
                }
            }
        }
    }
    /**
     * Finds a position between a given position and a source.
     * @param posA The given position.
     * @returns The position between the given position and a source, or null if none found.
     */
    findPositionBetween(posA) {
        const room = Game.rooms[posA.roomName];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue;
                const pos = new RoomPosition(posA.x + dx, posA.y + dy, posA.roomName);
                const resourcesInRange = pos.findInRange(FIND_SOURCES, 1);
                if (resourcesInRange.length > 0) {
                    return pos;
                }
            }
        }
        return null;
    }
}
exports.RoleMiner = RoleMiner;
