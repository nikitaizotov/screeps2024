"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleLinkManager = void 0;
const creep_service_1 = require("./creep.service");
class RoleLinkManager {
    constructor() {
        this.creepsPerRoom = 999;
        this.namePrefix = "Link_Manager";
        this.memoryKey = "linkManager";
        this.bodyParts = [CARRY];
        this.baseBodyParts = [MOVE, CARRY];
        this.maxBodyPartsMultiplier = 3;
        this.creepService = new creep_service_1.CreepService();
    }
    run(creep) {
        // Do not disturb creep while it's inside the spawn.
        if (creep.spawning) {
            return;
        }
        // If the creep is carrying any resource, transfer it to storage.
        if (creep.store.getUsedCapacity() > 0) {
            const storage = this.getStorage(creep);
            if (storage) {
                for (const resourceType in creep.store) {
                    creep.transfer(storage, resourceType);
                }
            }
            return;
        }
        // If the creep is not working, find target positions and paths.
        if (!creep.memory.working) {
            if (!creep.memory.targetPos || !creep.memory.path) {
                // If no targets are set, find storage and link structures.
                if (!creep.memory.targetStructureId &&
                    !creep.memory.targetStorageId &&
                    !creep.memory.targetPos) {
                    const storage = this.getStorage(creep);
                    const linkId = this.getStorageLinkId(creep.room);
                    const link = Game.getObjectById(linkId);
                    if (link && storage) {
                        const position = this.findPositionBetween(storage.pos);
                        creep.memory.targetStructureId = linkId;
                        creep.memory.targetStorageId = storage.id;
                        creep.memory.targetPos = position;
                    }
                }
                // Find a path to the target position.
                creep.memory.path = creep.pos.findPathTo(creep.memory.targetPos);
            }
            else {
                // Move to the target position using the stored path.
                creep.moveByPath(creep.memory.path);
                if (creep.pos.x === creep.memory.targetPos.x &&
                    creep.pos.y === creep.memory.targetPos.y &&
                    creep.pos.roomName === creep.memory.targetPos.roomName) {
                    creep.memory.working = true;
                }
            }
        }
        else {
            // If the creep is working, either withdraw energy from the link or transfer it to storage.
            if (creep.store.getFreeCapacity() > 0) {
                const target = Game.getObjectById(creep.memory.targetStructureId);
                if (target) {
                    creep.withdraw(target, RESOURCE_ENERGY);
                }
                else {
                    console.log(`No link with id ${creep.memory.targetStructureId} found in room ${creep.room.name}`);
                }
            }
            else {
                const target = Game.getObjectById(creep.memory.targetStorageId);
                creep.transfer(target, RESOURCE_ENERGY);
            }
        }
    }
    /**
     * Get the ID of the storage link in the room.
     * @param room The room to search in.
     * @returns The ID of the storage link, or null if not found.
     */
    getStorageLinkId(room) {
        if (!Memory.roomData.links[room.name]) {
            return null;
        }
        const cache = Memory.roomData.links[room.name];
        const linkIds = Object.keys(cache);
        for (let linkId of linkIds) {
            if (cache[linkId].storageLink === true) {
                return linkId;
            }
        }
        return null;
    }
    /**
     * Get the storage structure in the room.
     * @param creep The creep to search with.
     * @returns The storage structure, or null if not found.
     */
    getStorage(creep) {
        const storages = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === STRUCTURE_STORAGE,
        });
        if (storages.length) {
            return storages[0];
        }
        return null;
    }
    /**
     * Find a position between a given position and a link.
     * @param posA The given position.
     * @returns The position between the given position and a link, or null if none found.
     */
    findPositionBetween(posA) {
        const room = Game.rooms[posA.roomName];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue;
                const pos = new RoomPosition(posA.x + dx, posA.y + dy, posA.roomName);
                // Check if there are any structures on the position
                const structuresAtPos = pos
                    .lookFor(LOOK_STRUCTURES)
                    .filter((structure) => structure.structureType !== STRUCTURE_ROAD);
                if (structuresAtPos.length > 0)
                    continue;
                const structure = pos.findInRange(FIND_STRUCTURES, 1);
                const links = structure.filter((structure) => structure.structureType === STRUCTURE_LINK);
                if (links.length > 0) {
                    return pos;
                }
            }
        }
        return null;
    }
}
exports.RoleLinkManager = RoleLinkManager;
