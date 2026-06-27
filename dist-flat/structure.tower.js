"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowerManager = void 0;
const attack_service_1 = require("./attack.service");
class TowerManager {
    constructor() {
        this.attackService = new attack_service_1.AttackService();
    }
    work(tower) {
        if (tower) {
            // First, look for the closest hostile creep with HEAL body part.
            const closestHostileWithHeal = tower.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
                filter: (enemyCreep) => {
                    return (!this.attackService.avoidPlayers.includes(enemyCreep.owner.username) && enemyCreep.body.some((part) => part.type === HEAL));
                },
            });
            if (closestHostileWithHeal) {
                tower.attack(closestHostileWithHeal);
            }
            else {
                // If no hostile creeps with HEAL are found, look for the closest hostile creep.
                const closestHostile = tower.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
                    filter: (enemyCreep) => {
                        return !this.attackService.avoidPlayers.includes(enemyCreep.owner.username);
                    },
                });
                if (closestHostile) {
                    tower.attack(closestHostile);
                }
                else {
                    // If no hostile creeps are found, look for the closest damaged ally creep.
                    const closestDamagedAlly = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                        filter: (creep) => creep.hits < creep.hitsMax,
                    });
                    if (closestDamagedAlly) {
                        tower.heal(closestDamagedAlly);
                    }
                    else {
                        // If no damaged ally creeps are found, look for the closest damaged structure.
                        const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                            filter: (structure) => structure.hits < structure.hitsMax &&
                                structure.structureType !== STRUCTURE_WALL &&
                                structure.structureType !== STRUCTURE_RAMPART,
                        });
                        if (closestDamagedStructure) {
                            tower.repair(closestDamagedStructure);
                            // If the structure is fully repaired, clear the memory of any creeps targeting it.
                            if (closestDamagedStructure.hits === closestDamagedStructure.hitsMax) {
                                for (const creepName in Game.creeps) {
                                    const creep = Game.creeps[creepName];
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
    }
}
exports.TowerManager = TowerManager;
