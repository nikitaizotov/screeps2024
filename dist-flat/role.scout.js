"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoutRole = void 0;
var build_service_1 = __importDefault(require("./build.service"));
var creep_service_1 = __importDefault(require("./creep.service"));
var scoutJobs;
(function (scoutJobs) {
    scoutJobs[scoutJobs["MOVING_TO_NEXT_ROOM"] = 0] = "MOVING_TO_NEXT_ROOM";
    scoutJobs[scoutJobs["CLAIMING"] = 1] = "CLAIMING";
    scoutJobs[scoutJobs["BUILDING"] = 2] = "BUILDING";
})(scoutJobs || (scoutJobs = {}));
var scoutJobList = (_a = {},
    _a[scoutJobs.MOVING_TO_NEXT_ROOM] = scoutJobs.MOVING_TO_NEXT_ROOM,
    _a[scoutJobs.CLAIMING] = scoutJobs.CLAIMING,
    _a[scoutJobs.BUILDING] = scoutJobs.BUILDING,
    _a);
exports.scoutRole = {
    creepsPerRoom: 0,
    namePrefix: "Scout",
    memoryKey: "scout",
    bodyParts: [MOVE, WORK, WORK, CARRY, CARRY, CARRY, CLAIM],
    baseBodyParts: [MOVE],
    maxBodyPartsMultiplier: 0,
    run: function (creep) {
        try {
            if (creep.spawning) {
                return;
            }
            if (creep.memory.path) {
                creep_service_1.default.drawPath(creep);
            }
            if (!creep.memory.initialized) {
                this.initializeMemory(creep);
                creep.memory.job = scoutJobs.MOVING_TO_NEXT_ROOM;
            }
            switch (creep.memory.job) {
                case scoutJobs.MOVING_TO_NEXT_ROOM:
                    this.moveToNextRoom(creep);
                    break;
                case scoutJobs.CLAIMING:
                    this.claim(creep);
                    break;
                case scoutJobs.BUILDING:
                    this.buildOrFinishSpawn(creep);
                    break;
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
            this.findNextRooms(creep);
        }
        catch (error) {
            console.log("Error in initializeMemory: ".concat(error.message));
        }
    },
    findNextRooms: function (creep) {
        try {
            var exits = Game.map.describeExits(creep.room.name);
            if (!exits) {
                return;
            }
            creep.memory.nextRooms = Object.values(exits);
            console.log("".concat(creep.name, " found exits: ").concat(creep.memory.nextRooms));
        }
        catch (error) {
            console.log("Error in findNextRooms: ".concat(error.message));
        }
    },
    moveToNextRoom: function (creep) {
        try {
            if (!creep.memory.targetRoom || !creep.memory.path) {
                this.getPathToNextRoom(creep);
            }
            else {
                this.moveToNextRoomController(creep);
            }
        }
        catch (error) {
            console.log("Scout error moveToNextRoom: ".concat(error));
        }
    },
    getPathToNextRoom: function (creep) {
        var rooms = creep.memory.nextRooms;
        var roomName = rooms.shift();
        if (roomName && creep.room !== roomName) {
            var pos = new RoomPosition(25, 25, roomName);
            creep.memory.targetRoom = roomName;
            creep.memory.path = creep.pos.findPathTo(pos);
        }
    },
    moveToNextRoomController: function (creep) {
        if (creep.memory.targetRoom === creep.room.name) {
            var target = creep.room.find(FIND_CONSTRUCTION_SITES, {
                filter: function (site) { return site.structureType === STRUCTURE_SPAWN; },
            })[0];
            if (target) {
                creep.memory.job = scoutJobs.BUILDING;
                creep.memory.building = false;
                creep.memory.path = undefined;
                creep.memory.targetId = null;
                creep.memory.path = creep.pos.findPathTo(target);
            }
            else {
                creep.memory.job = scoutJobs.CLAIMING;
                this.findPathToController(creep);
            }
        }
        if (creep.memory.path) {
            creep.moveByPath(creep.memory.path);
        }
        else {
            this.getPathToNextRoom(creep);
        }
    },
    claim: function (creep) {
        if (creep.room.controller) {
            var controller = creep.room.controller;
            var action = creep.claimController(controller);
            if (controller.my) {
                creep.memory.job = scoutJobs.BUILDING;
                return;
            }
            if (action === ERR_NOT_IN_RANGE) {
                if (creep.memory.path) {
                    creep.moveByPath(creep.memory.path);
                }
                else {
                    this.findPathToController(creep);
                }
            }
        }
    },
    findPathToController: function (creep) {
        var controller = creep.room.controller;
        if (controller && !controller.my) {
            creep.memory.path = creep.pos.findPathTo(controller);
        }
    },
    buildOrFinishSpawn: function (creep) {
        if (creep.memory.building === undefined ||
            (creep.memory.building && creep.store[RESOURCE_ENERGY] == 0)) {
            creep.memory.building = false;
            creep.memory.path = undefined;
            creep.memory.targetId = null;
            creep.say("🔄 harvest");
        }
        // Check if the creep should start transferring energy.
        if (!creep.memory.building && creep.store.getFreeCapacity() == 0) {
            creep.memory.building = true;
            creep.memory.path = undefined;
            creep.memory.targetId = null;
            creep.say("⚡ transfer");
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
        var _a;
        if (!creep.memory.path) {
            //creepService.findConstructionSite(creep);
            // const target = creep.room.find(FIND_CONSTRUCTION_SITES, {
            //   filter: (site) => site.structureType === STRUCTURE_SPAWN,
            // })[0];
            var target = ((_a = creep.room.controller) === null || _a === void 0 ? void 0 : _a.level) === 1
                ? creep.room.controller
                : creep.room.find(FIND_CONSTRUCTION_SITES, {
                    filter: function (site) { return site.structureType === STRUCTURE_SPAWN; },
                })[0];
            if (target) {
                creep.memory.path = creep.pos.findPathTo(target);
                creep.memory.targetId = target.id;
            }
            else {
                var spawns = creep.room.find(FIND_MY_SPAWNS);
                if (spawns) {
                    this.getPathToNextRoom(creep);
                }
            }
        }
        else {
            this.moveAndTransfer(creep);
        }
    },
    moveAndTransfer: function (creep) {
        // const target = creep.room.find(FIND_CONSTRUCTION_SITES, {
        //   filter: (site) => site.structureType === STRUCTURE_SPAWN,
        // })[0];
        var target = Game.getObjectById(creep.memory.targetId);
        if (!target) {
            // The target may have been completed, so we check this and clear the memory.
            if (creep.memory.targetId) {
                var constructedStructure = Game.getObjectById(creep.memory.targetId);
                if (constructedStructure) {
                    console.log("Construction completed:", constructedStructure.structureType);
                }
                else {
                    console.log("Target construction site not found and not completed.");
                }
                var result = build_service_1.default.buildSpawn(creep.room);
                if (result === OK) {
                    console.log("Construction site for spawn created successfully in ".concat(creep.room.name, "."));
                }
                else {
                    console.log("Error creating construction site for spawn in ".concat(creep.room.name, ": ").concat(result));
                }
                creep.memory.building = false;
                creep.memory.path = undefined;
                creep.memory.targetId = null;
            }
            return;
        }
        var action;
        var controller = creep.room.controller;
        if (creep.memory.targetId === controller.id) {
            action = creep.upgradeController(controller);
        }
        else {
            action = creep.build(target);
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
        else if (action === OK) {
            if (creep.memory.targetId !== controller.id) {
                // Check if the construction is completed.
                var spawn = target;
                if (!spawn.progressTotal || spawn.progress >= spawn.progressTotal) {
                    creep.memory.building = false;
                    creep.memory.path = undefined;
                    creep.memory.targetId = null;
                    creep.memory.job = scoutJobs.MOVING_TO_NEXT_ROOM;
                }
            }
        }
    },
};
exports.default = exports.scoutRole;
