"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const creep_service_1 = __importDefault(require("./creep.service"));
const roleWallAndRampBuilder = {
    creepsPerRoom: 1,
    namePrefix: "WallRampBuilder",
    memoryKey: "wallRampBuilder",
    bodyParts: [WORK, CARRY, MOVE],
    maxBodyPartsMultiplier: 5,
    run(creep) {
        if (creep.spawning) {
            return;
        }
        if ((creep.memory.repairing || creep.memory.repairing === undefined) &&
            creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.repairing = false;
            creep.memory.path = undefined;
            creep.memory.targetId = null;
        }
        if (!creep.memory.repairing && creep.store.getFreeCapacity() === 0) {
            creep.memory.repairing = true;
            creep.memory.path = undefined;
            creep.memory.targetId = null;
        }
        if (creep.memory.repairing) {
            this.repairWallsAndRamparts(creep);
        }
        else {
            this.harvestEnergy(creep);
        }
    },
    harvestEnergy(creep) {
        if (!creep.memory.path) {
            creep_service_1.default.getPathToSource(creep);
        }
        else {
            creep_service_1.default.moveAndHarvest(creep);
        }
    },
    repairWallsAndRamparts(creep) {
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
                creep_service_1.default.getPathTotargets(creep, [targets[0]]);
            }
            else {
                console.log("No targets for repair found");
            }
        }
        else {
            this.moveAndRepair(creep);
        }
    },
    moveAndRepair(creep) {
        creep_service_1.default.drawPath(creep);
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
            else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
                creep.memory.path = undefined;
                creep.memory.targetId = null;
            }
        }
        else {
            creep.memory.path = undefined;
            creep.memory.targetId = null;
        }
    },
};
exports.default = roleWallAndRampBuilder;
