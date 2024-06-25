"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var attack_service_1 = __importDefault(require("./attack.service"));
var creep_service_1 = __importDefault(require("./creep.service"));
var roleRanged = {
    creepsPerRoom: 1,
    namePrefix: "Ranged",
    memoryKey: "ranged",
    bodyParts: [
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
    ],
    run: function (creep) {
        var _a;
        if (creep.spawning) {
            return;
        }
        var room = creep.room;
        var controller = room.controller;
        if (controller && controller.safeMode) {
            var check = controller.safeMode - ((_a = creep.ticksToLive) !== null && _a !== void 0 ? _a : 0);
            if (!(check < 0)) {
                var flag = Game.flags["MoveToFlag"];
                if (flag) {
                    this.goToFlag(creep, flag);
                }
                else {
                    this.randomlyPatrol(creep);
                }
                return;
            }
        }
        var tower = this.findClosestTower(creep);
        var target = this.findRangedEnemiesCloserThanTower(creep, tower);
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
                var path = PathFinder.search(creep.pos, {
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
                creep_service_1.default.drawPath(creep);
                creep.moveByPath(creep.memory.path);
            }
        }
        else {
            var flag = Game.flags["MoveToFlag"];
            if (flag) {
                this.goToFlag(creep, flag);
            }
            else {
                this.randomlyPatrol(creep);
            }
        }
    },
    goToFlag: function (creep, flag) {
        var path;
        if (!creep.memory.path) {
            path = creep.pos.findPathTo(flag);
        }
        else {
            path = creep.memory.path;
        }
        creep.moveByPath(path);
        creep_service_1.default.drawPath(creep);
    },
    randomlyPatrol: function (creep) {
        var directions = [
            TOP,
            TOP_RIGHT,
            RIGHT,
            BOTTOM_RIGHT,
            BOTTOM,
            BOTTOM_LEFT,
            LEFT,
            TOP_LEFT,
        ];
        var randomDirection = directions[Math.floor(Math.random() * directions.length)];
        creep.move(randomDirection);
    },
    findClosestTower: function (creep) {
        return creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
            filter: function (structure) {
                return (structure.owner &&
                    !attack_service_1.default.avoidPlayers.includes(structure.owner.username) &&
                    structure.structureType === STRUCTURE_TOWER);
            },
        });
    },
    findRangedEnemiesCloserThanTower: function (creep, tower) {
        return creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
            filter: function (enemyCreep) {
                return (!attack_service_1.default.avoidPlayers.includes(enemyCreep.owner.username) &&
                    enemyCreep.getActiveBodyparts(RANGED_ATTACK) > 0 &&
                    (!tower ||
                        creep.pos.getRangeTo(enemyCreep) < creep.pos.getRangeTo(tower)));
            },
        });
    },
    findDangerousEnemies: function (creep) {
        return creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
            filter: function (enemyCreep) {
                return (!attack_service_1.default.avoidPlayers.includes(enemyCreep.owner.username) &&
                    (enemyCreep.getActiveBodyparts(ATTACK) > 0 ||
                        enemyCreep.getActiveBodyparts(RANGED_ATTACK) > 0));
            },
        });
    },
    findAllEnemies: function (creep) {
        return creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
            filter: function (enemyCreep) {
                return !attack_service_1.default.avoidPlayers.includes(enemyCreep.owner.username);
            },
        });
    },
    findStructuralTargets: function (creep) {
        var hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES, {
            filter: function (structure) {
                return (structure.owner &&
                    !attack_service_1.default.avoidPlayers.includes(structure.owner.username) &&
                    (structure.structureType === STRUCTURE_TOWER ||
                        structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_EXTENSION));
            },
        });
        hostileStructures.sort(function (a, b) {
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
    },
};
exports.default = roleRanged;
