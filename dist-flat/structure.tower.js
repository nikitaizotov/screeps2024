"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var attack_service_1 = __importDefault(require("./attack.service"));
var towerManager = {
    run: function (tower) {
        if (tower) {
            // First, look for the closest hostile creep with HEAL body part
            var closestHostileWithHeal = tower.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
                filter: function (enemyCreep) {
                    return (!attack_service_1.default.avoidPlayers.includes(enemyCreep.owner.username) &&
                        enemyCreep.body.some(function (part) { return part.type === HEAL; }));
                },
            });
            if (closestHostileWithHeal) {
                tower.attack(closestHostileWithHeal);
            }
            else {
                // If no hostile creeps with HEAL are found, look for the closest hostile creep
                var closestHostile = tower.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
                    filter: function (enemyCreep) {
                        return !attack_service_1.default.avoidPlayers.includes(enemyCreep.owner.username);
                    },
                });
                if (closestHostile) {
                    tower.attack(closestHostile);
                }
                else {
                    // If no hostile creeps are found, look for the closest damaged ally creep
                    var closestDamagedAlly = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                        filter: function (creep) { return creep.hits < creep.hitsMax; },
                    });
                    if (closestDamagedAlly) {
                        tower.heal(closestDamagedAlly);
                    }
                    else {
                        // If no damaged ally creeps are found, look for the closest damaged structure
                        var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                            filter: function (structure) {
                                return structure.hits < structure.hitsMax &&
                                    structure.structureType !== STRUCTURE_WALL &&
                                    structure.structureType !== STRUCTURE_RAMPART;
                            },
                        });
                        if (closestDamagedStructure) {
                            tower.repair(closestDamagedStructure);
                            // If the structure is fully repaired, clear the memory of any creeps targeting it
                            if (closestDamagedStructure.hits === closestDamagedStructure.hitsMax) {
                                for (var creepName in Game.creeps) {
                                    var creep = Game.creeps[creepName];
                                    if (creep.memory.targetId === closestDamagedStructure.id) {
                                        creep.memory.targetId = null;
                                        creep.memory.path = undefined;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
};
exports.default = towerManager;
