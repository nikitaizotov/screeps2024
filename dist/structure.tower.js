"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var attack_service_1 = __importDefault(require("./attack.service"));
var towerManager = {
    run: function (tower) {
        if (tower) {
            var closestHostile = tower.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
                filter: function (enemyCreep) {
                    return !attack_service_1.default.avoidPlayers.includes(enemyCreep.owner.username);
                },
            });
            if (closestHostile) {
                tower.attack(closestHostile);
            }
            else {
                var closestDamagedAlly = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                    filter: function (creep) { return creep.hits < creep.hitsMax; },
                });
                if (closestDamagedAlly) {
                    tower.heal(closestDamagedAlly);
                }
                else {
                    var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: function (structure) {
                            return structure.hits < structure.hitsMax &&
                                structure.structureType !== STRUCTURE_WALL &&
                                structure.structureType !== STRUCTURE_RAMPART;
                        },
                    });
                    if (closestDamagedStructure) {
                        tower.repair(closestDamagedStructure);
                    }
                }
            }
        }
    },
};
exports.default = towerManager;
