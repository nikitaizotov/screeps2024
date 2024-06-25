"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var creep_service_1 = __importDefault(require("./creep.service"));
var roleUpgrader = {
    creepsPerRoom: 3,
    namePrefix: "Upgrader",
    memoryKey: "upgrader",
    bodyParts: [WORK, CARRY, MOVE],
    run: function (creep) {
        if (creep.spawning) {
            return;
        }
        if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.upgrading = false;
            creep.memory.path = undefined;
            creep.say("🔄 harvest");
        }
        if (!creep.memory.upgrading && creep.store.getFreeCapacity() === 0) {
            creep.memory.upgrading = true;
            creep.memory.path = undefined;
            creep.say("⚡ upgrade");
        }
        if (creep.memory.upgrading) {
            this.upgradeControllerJob(creep);
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
            this.moveAndHarvest(creep);
        }
    },
    upgradeControllerJob: function (creep) {
        if (!creep.memory.path) {
            this.getPathToController(creep);
        }
        else {
            this.moveAndUpgrade(creep);
        }
    },
    getPathToSource: function (creep) {
        creep.say("Searching");
        var sources = creep.room.find(FIND_SOURCES);
        for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
            var source = sources_1[_i];
            var path = PathFinder.search(creep.pos, { pos: source.pos, range: 1 }, {
                roomCallback: function (roomName) {
                    var room = Game.rooms[roomName];
                    if (!room)
                        return false;
                    var costs = new PathFinder.CostMatrix();
                    room.find(FIND_CREEPS).forEach(function (creep) {
                        costs.set(creep.pos.x, creep.pos.y, 0xff);
                    });
                    return costs;
                },
            });
            if (!path.incomplete) {
                creep.memory.path = creep.pos.findPathTo(source);
                creep.memory.targetId = source.id;
                break;
            }
        }
    },
    getPathToController: function (creep) {
        creep.say("Searching");
        creep.memory.path = creep.pos.findPathTo(creep.room.controller);
    },
    moveAndHarvest: function (creep) {
        var source = Game.getObjectById(creep.memory.targetId);
        if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
            creep_service_1.default.drawPath(creep);
            var moveResult = creep.moveByPath(creep.memory.path);
            if (moveResult === ERR_NOT_FOUND ||
                (moveResult !== OK && moveResult !== ERR_TIRED)) {
                creep_service_1.default.getPathToSource(creep);
            }
        }
    },
    moveAndUpgrade: function (creep) {
        var action = creep.upgradeController(creep.room.controller);
        if (action === ERR_NOT_IN_RANGE) {
            var moveResult = creep.moveByPath(creep.memory.path);
            creep_service_1.default.drawPath(creep);
            if (moveResult !== OK && moveResult !== ERR_TIRED) {
                this.getPathToController(creep);
            }
        }
    },
};
exports.default = roleUpgrader;
