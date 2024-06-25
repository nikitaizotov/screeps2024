"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoutRole = void 0;
var build_service_1 = __importDefault(require("./build.service"));
var creep_service_1 = __importDefault(require("./creep.service"));
exports.scoutRole = {
    creepsPerRoom: 1,
    namePrefix: "Scout",
    memoryKey: "scout",
    bodyParts: [MOVE, MOVE, MOVE, WORK, CARRY, CLAIM],
    run: function (creep) {
        try {
            if (creep.spawning) {
                return;
            }
            if (!creep.memory.initialized) {
                this.initializeMemory(creep);
            }
            var room = creep.room;
            var controller = room.controller;
            if (controller && controller.my) {
                if (Memory.scoutRooms[room.name]) {
                    delete Memory.scoutRooms[room.name];
                }
                return;
            }
            if (controller && !controller.my && !controller.owner) {
                if (this.canClaimController()) {
                    if (creep.pos.inRangeTo(controller, 1)) {
                        var claimResult = creep.claimController(controller);
                        if (claimResult === OK) {
                            creep.memory.buildingSpawn = true;
                            creep.memory.targetId = null;
                        }
                    }
                    else {
                        if (!creep.memory.path || creep.memory.targetId !== controller.id) {
                            creep.memory.path = creep.pos.findPathTo(controller, {
                                ignoreCreeps: true,
                            });
                            creep.memory.targetId = controller.id;
                        }
                        creep.moveByPath(creep.memory.path);
                    }
                    return;
                }
            }
            if (creep.memory.buildingSpawn) {
                if (creep.store[RESOURCE_ENERGY] === 0) {
                    this.harvestEnergy(creep);
                }
                else {
                    var constructionSite = room.find(FIND_CONSTRUCTION_SITES, {
                        filter: function (site) { return site.structureType === STRUCTURE_SPAWN; },
                    })[0];
                    if (constructionSite) {
                        if (creep.build(constructionSite) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(constructionSite);
                        }
                    }
                    else {
                        var result = build_service_1.default.buildSpawn(room);
                        if (result === OK) {
                            console.log("Construction site for spawn created successfully.");
                        }
                        else {
                            console.log("Error creating construction site for spawn:", result);
                        }
                    }
                    if (room.find(FIND_MY_SPAWNS).length > 0) {
                        creep.memory.buildingSpawn = false;
                        this.exploreRoom(creep);
                    }
                }
                return;
            }
            this.exploreRoom(creep);
            if (creep.memory.nextRooms && creep.memory.nextRooms.length > 0) {
                var nextRoomName = creep.memory.nextRooms.shift();
                creep.moveTo(new RoomPosition(25, 25, nextRoomName));
            }
            else {
                this.findNextRoom(creep);
            }
        }
        catch (error) {
            console.log("Error in Scout run: ".concat(error.message));
        }
    },
    initializeMemory: function (creep) {
        try {
            if (!Memory.scoutRooms) {
                Memory.scoutRooms = {};
            }
            creep.memory.initialized = true;
        }
        catch (error) {
            console.log("Error in initializeMemory: ".concat(error.message));
        }
    },
    canClaimController: function () {
        try {
            return Game.gcl.level > Object.keys(Game.rooms).length;
        }
        catch (error) {
            console.log("Error in canClaimController: ".concat(error.message));
            return false;
        }
    },
    exploreRoom: function (creep) {
        try {
            var roomName = creep.room.name;
            if (!Memory.scoutRooms[roomName]) {
                Memory.scoutRooms[roomName] = {
                    scouted: true,
                    lastScouted: Game.time,
                    empty: !creep.room.find(FIND_HOSTILE_CREEPS).length,
                    attacked: false,
                    attacker: null,
                };
            }
            else {
                Memory.scoutRooms[roomName].lastScouted = Game.time;
                if (Memory.scoutRooms[roomName].attacked === false &&
                    creep.hits < creep.hitsMax) {
                    Memory.scoutRooms[roomName].attacked = true;
                    var attackers = creep.room.find(FIND_HOSTILE_CREEPS);
                    if (attackers.length > 0) {
                        Memory.scoutRooms[roomName].attacker = attackers[0].owner.username;
                    }
                }
            }
        }
        catch (error) {
            console.log("Error in exploreRoom: ".concat(error.message));
        }
    },
    findNextRoom: function (creep) {
        try {
            var exits = Game.map.describeExits(creep.room.name);
            if (!exits) {
                return;
            }
            var nextRooms = Object.values(exits).filter(function (roomName) {
                return !Memory.scoutRooms[roomName];
            });
            if (nextRooms.length === 0) {
                creep.memory.nextRooms = Object.values(exits);
            }
            else {
                creep.memory.nextRooms = nextRooms;
            }
        }
        catch (error) {
            console.log("Error in findNextRoom: ".concat(error.message));
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
};
exports.default = exports.scoutRole;
