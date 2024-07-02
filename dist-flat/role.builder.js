"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var creep_service_1 = __importDefault(require("./creep.service"));
var roleBuilder = {
    creepsPerRoom: 2,
    namePrefix: "Builder",
    memoryKey: "builder",
    bodyParts: [WORK, CARRY, MOVE],
    maxBodyPartsMultiplier: 5,
    creepsPerSourcePositions: {
        "1": 1,
        "2": 1,
        "3": 1,
        "4": 1,
        "5": 1,
    },
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
            creep_service_1.default.getDamagedStructures(creep);
            if (!creep.memory.path) {
                creep_service_1.default.findConstructionSite(creep);
            }
        }
        else {
            this.moveAndTransfer(creep);
        }
    },
    moveAndTransfer: function (creep) {
        var target = Game.getObjectById(creep.memory.targetId);
        if (!target) {
            return;
        }
        creep_service_1.default.drawPath(creep);
        var action = creep.repair(target);
        if ("progress" in target) {
            action = creep.build(target);
        }
        if (action === ERR_NOT_IN_RANGE) {
            var moveResult = creep.moveByPath(creep.memory.path);
            if (!("progress" in target) && target.hits === target.hitsMax) {
                creep.memory.path = undefined;
                creep.memory.targetId = null;
            }
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
