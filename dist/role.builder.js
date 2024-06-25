"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var creep_service_1 = __importDefault(require("./creep.service"));
var roleBuilder = {
    creepsPerRoom: 1,
    namePrefix: "Builder",
    memoryKey: "builder",
    bodyParts: [WORK, CARRY, MOVE],
    run: function (creep) {
        if (creep.spawning) {
            return;
        }
        if ((creep.memory.building || creep.memory.building === undefined) &&
            creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
            creep.memory.path = undefined;
            creep.memory.targetId = null;
            creep.say("🔄 harvest");
        }
        if (!creep.memory.building && creep.store.getFreeCapacity() == 0) {
            creep.memory.building = true;
            creep.memory.path = undefined;
            creep.memory.targetId = null;
            creep.say("🚧 build");
        }
        if (creep.memory.building) {
            this.transferEnergy(creep);
        }
        else {
            this.harvestEnergy(creep);
        }
    },
    harvestEnergy: function (creep) {
        if (!creep.memory.path) {
            creep_service_1.default.getPathToSource(creep);
        }
        else {
            creep_service_1.default.moveAndHarvest(creep);
        }
    },
    transferEnergy: function (creep) {
        if (!creep.memory.path) {
            var targets = creep.room.find(FIND_STRUCTURES, {
                filter: function (structure) {
                    return (structure.hits < structure.hitsMax &&
                        structure.structureType !== STRUCTURE_WALL &&
                        structure.structureType !== STRUCTURE_RAMPART);
                },
            });
            if (targets.length === 0) {
                var constructionTargets = creep.room.find(FIND_CONSTRUCTION_SITES);
                if (constructionTargets.length > 0) {
                    creep.memory.targetId = constructionTargets[0].id;
                    creep.memory.path = creep.pos.findPathTo(constructionTargets[0].pos, {
                        ignoreCreeps: true,
                    });
                }
            }
            else {
                creep_service_1.default.getPathTotargets(creep, targets);
            }
        }
        else {
            this.moveAndTransfer(creep);
        }
    },
    moveAndTransfer: function (creep) {
        creep_service_1.default.drawPath(creep);
        var target = Game.getObjectById(creep.memory.targetId);
        if (!target) {
            creep.memory.path = undefined;
            creep.memory.targetId = null;
            return;
        }
        var action;
        if ("progress" in target) {
            action = creep.build(target);
        }
        else {
            if (target.hitsMax > target.hits) {
                action = creep.repair(target);
            }
            else {
                creep.memory.path = undefined;
                creep.memory.targetId = null;
            }
        }
        if (action === ERR_NOT_IN_RANGE) {
            var moveResult = creep.moveByPath(creep.memory.path);
            if (moveResult !== OK && moveResult !== ERR_TIRED) {
                console.log("Move by path failed, error:", moveResult);
                creep.memory.path = undefined;
                creep.memory.targetId = null;
            }
        }
        else if (action === ERR_INVALID_TARGET || action === ERR_NO_BODYPART) {
            creep.memory.path = undefined;
            creep.memory.targetId = null;
        }
    },
};
exports.default = roleBuilder;
