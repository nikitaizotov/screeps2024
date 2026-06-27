"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleRanged = void 0;
const attack_service_1 = require("./attack.service");
const creep_service_1 = require("./creep.service");
class RoleRanged {
    constructor() {
        this.creepsPerRoom = 0;
        this.namePrefix = "Ranged";
        this.memoryKey = "ranged";
        this.bodyParts = [
            TOUGH,
            TOUGH,
            TOUGH,
            TOUGH,
            TOUGH,
            TOUGH,
            TOUGH,
            MOVE,
            MOVE,
            RANGED_ATTACK,
        ];
        this.creepService = new creep_service_1.CreepService();
        this.attackService = new attack_service_1.AttackService();
    }
    run(creep) {
        var _a;
        if (creep.spawning) {
            return;
        }
        const room = creep.room;
        const controller = room.controller;
        if (controller && controller.safeMode) {
            const check = controller.safeMode - ((_a = creep.ticksToLive) !== null && _a !== void 0 ? _a : 0);
            if (!(check < 0)) {
                const flag = Game.flags["MoveToFlag"];
                if (flag) {
                    this.goToFlag(creep, flag);
                }
                else {
                    this.randomlyPatrol(creep);
                }
                return;
            }
        }
        const tower = this.findClosestTower(creep);
        let target = this.findRangedEnemiesCloserThanTower(creep, tower);
        if (!target && tower) {
            target = tower;
        }
        if (!target) {
            target = this.findDangerousEnemies(creep);
        }
        if (!target) {
            target = this.findAllEnemies(creep);
        }
        if (!target) {
            target = this.findStructuralTargets(creep);
        }
        if (target) {
            if (creep.pos.inRangeTo(target, 3)) {
                creep.rangedAttack(target);
                const path = PathFinder.search(creep.pos, {
                    pos: target.pos,
                    range: 4,
                }).path;
                creep.moveByPath(path);
            }
            else {
                if (!creep.memory.path || creep.memory.targetId !== target.id) {
                    creep.memory.path = creep.pos.findPathTo(target, {
                        ignoreCreeps: true,
                    });
                    // Ensure target.id is compatible with CreepMemory's targetId
                    creep.memory.targetId = target.id;
                }
                //  creepService.drawPath(creep);
                creep.moveByPath(creep.memory.path);
            }
        }
        else {
            const flag = Game.flags["MoveToFlag"];
            if (flag) {
                this.goToFlag(creep, flag);
            }
            else {
                this.randomlyPatrol(creep);
            }
        }
    }
    goToFlag(creep, flag) {
        let path;
        if (!creep.memory.path) {
            path = creep.pos.findPathTo(flag);
        }
        else {
            path = creep.memory.path;
        }
        creep.moveByPath(path);
        // creepService.drawPath(creep);
    }
    randomlyPatrol(creep) {
        const directions = [
            TOP,
            TOP_RIGHT,
            RIGHT,
            BOTTOM_RIGHT,
            BOTTOM,
            BOTTOM_LEFT,
            LEFT,
            TOP_LEFT,
        ];
        const randomDirection = directions[Math.floor(Math.random() * directions.length)];
        creep.move(randomDirection);
    }
    findClosestTower(creep) {
        return creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: (structure) => {
                return (structure.owner &&
                    !this.attackService.avoidPlayers.includes(structure.owner.username) &&
                    structure.structureType === STRUCTURE_TOWER);
            },
        });
    }
    findRangedEnemiesCloserThanTower(creep, tower) {
        return creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
            filter: (enemyCreep) => {
                return (!this.attackService.avoidPlayers.includes(enemyCreep.owner.username) &&
                    enemyCreep.getActiveBodyparts(RANGED_ATTACK) > 0 &&
                    (!tower ||
                        creep.pos.getRangeTo(enemyCreep) < creep.pos.getRangeTo(tower)));
            },
        });
    }
    findDangerousEnemies(creep) {
        return creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
            filter: (enemyCreep) => {
                return (!this.attackService.avoidPlayers.includes(enemyCreep.owner.username) &&
                    (enemyCreep.getActiveBodyparts(ATTACK) > 0 ||
                        enemyCreep.getActiveBodyparts(RANGED_ATTACK) > 0));
            },
        });
    }
    findAllEnemies(creep) {
        return creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
            filter: (enemyCreep) => {
                return !this.attackService.avoidPlayers.includes(enemyCreep.owner.username);
            },
        });
    }
    findStructuralTargets(creep) {
        const hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: (structure) => {
                return (structure.owner &&
                    !this.attackService.avoidPlayers.includes(structure.owner.username) &&
                    (structure.structureType === STRUCTURE_TOWER ||
                        structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_EXTENSION));
            },
        });
        hostileStructures.sort((a, b) => {
            if (a.structureType === b.structureType)
                return 0;
            if (a.structureType === STRUCTURE_TOWER)
                return -1;
            if (b.structureType === STRUCTURE_TOWER)
                return 1;
            if (a.structureType === STRUCTURE_SPAWN)
                return -1;
            if (b.structureType === STRUCTURE_SPAWN)
                return 1;
            return 0;
        });
        return hostileStructures[0] || null;
    }
}
exports.RoleRanged = RoleRanged;
