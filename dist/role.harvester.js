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
var creep_service_1 = __importDefault(require("./creep.service"));
var roleHarvester = {
    creepsPerRoom: 5,
    namePrefix: "Harvester",
    memoryKey: "harvester",
    bodyParts: [WORK, CARRY, MOVE],
    // Main function to run the harvester role.
    run: function (creep) {
        if (creep.spawning) {
            return;
        }
        // Check if the creep should start harvesting.
        if ((creep.memory.transferring || creep.memory.transferring === undefined) &&
            creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.transferring = false;
            creep.memory.path = undefined;
            creep.memory.targetId = null;
            creep.say("🔄 harvest");
        }
        // Check if the creep should start transferring energy.
        if (!creep.memory.transferring && creep.store.getFreeCapacity() == 0) {
            creep.memory.transferring = true;
            creep.memory.path = undefined;
            creep.memory.targetId = null;
            creep.say("⚡ transfer");
        }
        // Execute the appropriate action based on the creep's state.
        if (creep.memory.transferring) {
            this.transferEnergy(creep);
        }
        else {
            this.harvestEnergy(creep);
        }
    },
    // Function to transfer energy to the appropriate structure.
    transferEnergy: function (creep) {
        var target = Game.getObjectById(creep.memory.targetId);
        // Reset target if it's invalid or full.
        if (!target ||
            ("store" in target &&
                target.store.getFreeCapacity(RESOURCE_ENERGY) ===
                    0)) {
            creep.memory.path = undefined;
            creep.memory.targetId = null;
        }
        // Find new target if needed.
        if (!creep.memory.path || !creep.memory.targetId) {
            var targets = this.getPriorityTargets(creep.room, creep);
            if (targets.length) {
                var newTarget = targets[0];
                creep.memory.targetId = newTarget.id;
                creep.memory.path = creep.pos.findPathTo(newTarget);
            }
            else {
                // Switch to the next task if no energy consumers found.
                this.switchToNextTask(creep);
            }
        }
        else {
            creep_service_1.default.drawPath(creep);
            this.moveAndTransfer(creep);
        }
    },
    // Function to get priority targets for energy transfer.
    getPriorityTargets: function (room, creep) {
        var _this = this;
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
        return __spreadArray(__spreadArray(__spreadArray([], sortedSpawns, true), sortedExtensions, true), sortedTowers, true);
    },
    // Function to check if a target is already targeted by other creeps.
    isTargetedByOtherCreeps: function (target) {
        return lodash_1.default.some(Object.values(Game.creeps), function (c) {
            return c.memory.targetId === target.id && c.memory.transferring;
        });
    },
    // Function to check if a spawn is satisfied.
    isSpawnSatisfied: function (spawn, room) {
        var incomingEnergy = lodash_1.default.sumBy(room.find(FIND_MY_CREEPS, {
            filter: function (c) { return c.memory.targetId === spawn.id && c.memory.transferring; },
        }), function (c) { return c.store[RESOURCE_ENERGY]; });
        return spawn.store.getFreeCapacity(RESOURCE_ENERGY) - incomingEnergy <= 0;
    },
    // Function to check if an extension is satisfied.
    isExtensionSatisfied: function (extension, room) {
        var incomingEnergy = lodash_1.default.sumBy(room.find(FIND_MY_CREEPS, {
            filter: function (c) {
                return c.memory.targetId === extension.id && c.memory.transferring;
            },
        }), function (c) { return c.store[RESOURCE_ENERGY]; });
        return (extension.store.getFreeCapacity(RESOURCE_ENERGY) - incomingEnergy <= 0);
    },
    // Function to check if a tower is satisfied.
    isTowerSatisfied: function (tower, room) {
        var incomingEnergy = lodash_1.default.sumBy(room.find(FIND_MY_CREEPS, {
            filter: function (c) { return c.memory.targetId === tower.id && c.memory.transferring; },
        }), function (c) { return c.store[RESOURCE_ENERGY]; });
        return tower.store.getFreeCapacity(RESOURCE_ENERGY) - incomingEnergy <= 0;
    },
    // Function to harvest energy from sources.
    harvestEnergy: function (creep) {
        if (!creep.memory.path || !creep.memory.targetId) {
            creep_service_1.default.getPathToSource(creep);
        }
        else {
            creep_service_1.default.moveAndHarvest(creep);
        }
    },
    // Function to move to the target and transfer energy.
    moveAndTransfer: function (creep) {
        var target = Game.getObjectById(creep.memory.targetId);
        if (!target ||
            ("store" in target &&
                target.store.getFreeCapacity(RESOURCE_ENERGY) ===
                    0)) {
            creep.memory.path = undefined;
            creep.memory.targetId = null;
            // Switch to the next task if the target is invalid or filled.
            this.switchToNextTask(creep);
            return;
        }
        var action;
        // Transfer energy to the target.
        if ("store" in target &&
            target.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            action = creep.transfer(target, RESOURCE_ENERGY);
        }
        else if (target.structureType === STRUCTURE_CONTROLLER) {
            action = creep.upgradeController(target);
        }
        else if (target instanceof ConstructionSite) {
            action = creep.build(target);
        }
        else {
            // Handle other target types if necessary
            action = ERR_INVALID_TARGET;
        }
        // Move towards the target if not in range.
        if (action === ERR_NOT_IN_RANGE) {
            var moveResult = creep.moveByPath(creep.memory.path);
            if (moveResult !== OK && moveResult !== ERR_TIRED) {
                console.log("Move by path failed, error:", moveResult);
                creep.memory.path = undefined;
                creep.memory.targetId = null;
                // Switch to the next task if movement fails.
                this.switchToNextTask(creep);
            }
        }
        else if (action === ERR_FULL ||
            action === ERR_INVALID_TARGET ||
            action === ERR_NO_BODYPART) {
            // Clear the memory of all creeps targeting this structure if it is filled.
            if (target.structureType !== STRUCTURE_EXTENSION) {
                this.clearTargetMemory(target.id, creep.room.name);
            }
            creep.memory.path = undefined;
            creep.memory.targetId = null;
            // Switch to the next task if the action fails.
            this.switchToNextTask(creep);
        }
    },
    // Function to clear target memory for all creeps.
    clearTargetMemory: function (targetId, roomName) {
        lodash_1.default.forEach(Game.creeps, function (creep) {
            if (creep.memory.targetId === targetId &&
                creep.room.name === roomName &&
                creep.memory.transferring) {
                creep.memory.path = undefined;
                creep.memory.targetId = null;
            }
        });
    },
    // Function to switch to the next task.
    switchToNextTask: function (creep) {
        var targets = this.getPriorityTargets(creep.room, creep);
        if (targets.length) {
            var newTarget = targets[0];
            creep.memory.targetId = newTarget.id;
            creep.memory.path = creep.pos.findPathTo(newTarget);
        }
        else {
            var constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES);
            if (constructionSites.length > 0) {
                var newTarget = constructionSites[0];
                creep.memory.targetId = newTarget.id;
                creep.memory.path = creep.pos.findPathTo(newTarget);
            }
            else {
                var controller = creep.room.controller;
                if (controller) {
                    creep.memory.targetId = controller.id;
                    creep.memory.path = creep.pos.findPathTo(controller);
                }
            }
        }
    },
};
exports.default = roleHarvester;
