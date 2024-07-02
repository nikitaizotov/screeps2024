"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var container_service_1 = __importDefault(require("./container.service"));
var link_service_1 = __importDefault(require("./link.service"));
var linkService = new link_service_1.default();
var buildService = {
    structureCache: {},
    cachedPaths: [],
    exitZones: [],
    roomTerrain: {},
    buildOrder: [
        STRUCTURE_EXTENSION,
        STRUCTURE_TOWER,
        STRUCTURE_STORAGE,
        STRUCTURE_TERMINAL,
        STRUCTURE_LAB,
        STRUCTURE_OBSERVER,
        STRUCTURE_NUKER,
        STRUCTURE_POWER_SPAWN,
    ],
    firstStructurePos: null,
    build: function () {
        try {
            if (!Memory.structureCache)
                Memory.structureCache = {};
            if (!Memory.cachedPaths)
                Memory.cachedPaths = [];
            if (!Memory.exitZones)
                Memory.exitZones = [];
            if (!Memory.roomTerrain)
                Memory.roomTerrain = {};
            var rooms = Game.rooms;
            for (var roomName in rooms) {
                var room = rooms[roomName];
                if (room.controller &&
                    room.controller.my &&
                    !this.checkConstructionSites(room)) {
                    if (!Memory.structureCache[room.name]) {
                        Memory.structureCache[room.name] = {
                            spawns: room.find(FIND_MY_SPAWNS),
                            constructionSites: room.find(FIND_CONSTRUCTION_SITES),
                            existingStructures: room.find(FIND_MY_STRUCTURES),
                        };
                    }
                    if (!Memory.exitZones[room.name]) {
                        Memory.exitZones[room.name] = this.getExitZones(room);
                    }
                    if (!Memory.roomTerrain[room.name]) {
                        Memory.roomTerrain[room.name] = this.cacheRoomTerrain(room.name);
                    }
                    // Plan roads every 15000 ticks.
                    if (Game.time % 15000 === 0)
                        this.planRoads(room);
                    // Process build queue every 90 ticks.
                    if (Game.time % 90 === 0)
                        this.processBuildOrder(room);
                    // Connect the first structure every 111 ticks.
                    if (Game.time % 111 === 0)
                        this.connectFirstStructure(room);
                    // Block exits every 222 ticks.
                    if (Game.time % 222 === 0)
                        this.blockExits(room);
                    // Build roads around structures every 244 ticks.
                    if (Game.time % 244 === 0)
                        this.buildRoadsAroundStructures(room);
                    // Build containers every 233 ticks.
                    if (Game.time % 233 === 0)
                        this.buildContainers(room);
                    // Build links every 244 ticks.
                    if (Game.time % 244 === 0 && linkService.isLinksAvailable(room)) {
                        linkService.buildLinks(room);
                    }
                }
            }
        }
        catch (error) {
            console.log("Error in buildService run: ".concat(error.message));
        }
    },
    planRoads: function (room) {
        try {
            if (!Memory.cachedPaths)
                Memory.cachedPaths = [];
            if (!Memory.connectedPoints)
                Memory.connectedPoints = {};
            var allSpawns = [];
            if (room.controller && room.controller.my) {
                var spawns = room.find(FIND_MY_SPAWNS);
                for (var _i = 0, spawns_1 = spawns; _i < spawns_1.length; _i++) {
                    var spawn = spawns_1[_i];
                    allSpawns.push(spawn.pos);
                }
                var hashPos_1 = function (pos) {
                    return "".concat(pos.roomName, "_").concat(pos.x, "_").concat(pos.y);
                };
                var addConnection_1 = function (pos1, pos2) {
                    var key1 = hashPos_1(pos1);
                    var key2 = hashPos_1(pos2);
                    if (!Memory.connectedPoints[key1])
                        Memory.connectedPoints[key1] = [];
                    Memory.connectedPoints[key1].push(key2);
                };
                var isConnected_1 = function (pos1, pos2) {
                    var key1 = hashPos_1(pos1);
                    var key2 = hashPos_1(pos2);
                    return (Memory.connectedPoints[key1] &&
                        Memory.connectedPoints[key1].includes(key2));
                };
                var checkAndRepairRoad = function () {
                    for (var _i = 0, _a = Memory.cachedPaths; _i < _a.length; _i++) {
                        var posData = _a[_i];
                        var pos = new RoomPosition(posData.x, posData.y, posData.roomName);
                        var room_1 = Game.rooms[pos.roomName];
                        if (room_1 && room_1.controller && room_1.controller.my) {
                            var structures = room_1.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
                            var hasRoad = structures.some(function (s) { return s.structureType === STRUCTURE_ROAD; });
                            if (!hasRoad) {
                                var constructionSites = room_1.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);
                                var hasConstructionSite = constructionSites.some(function (s) { return s.structureType === STRUCTURE_ROAD; });
                                if (!hasConstructionSite)
                                    room_1.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                            }
                        }
                    }
                };
                var planRoadBetween = function (pos1, pos2) {
                    var _a;
                    if (isConnected_1(pos1, pos2))
                        return;
                    var path = PathFinder.search(pos1, { pos: pos2, range: 1 }, {
                        plainCost: 2,
                        swampCost: 10,
                        roomCallback: function (roomName) {
                            var room = Game.rooms[roomName];
                            if (!room || !room.controller || !room.controller.my)
                                return new PathFinder.CostMatrix();
                            var costs = new PathFinder.CostMatrix();
                            room.find(FIND_STRUCTURES).forEach(function (struct) {
                                if (struct.structureType === STRUCTURE_ROAD)
                                    costs.set(struct.pos.x, struct.pos.y, 1);
                                else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                    struct.structureType !== STRUCTURE_RAMPART &&
                                    !(struct instanceof OwnedStructure && struct.my === false))
                                    costs.set(struct.pos.x, struct.pos.y, 0xff);
                            });
                            return costs;
                        },
                    }).path;
                    (_a = Memory.cachedPaths).push.apply(_a, path.map(function (pos) { return ({
                        x: pos.x,
                        y: pos.y,
                        roomName: pos.roomName,
                    }); }));
                    for (var _i = 0, path_1 = path; _i < path_1.length; _i++) {
                        var pos = path_1[_i];
                        Game.rooms[pos.roomName].createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                    }
                    addConnection_1(pos1, pos2);
                };
                var keyPoints = [];
                for (var _a = 0, spawns_2 = spawns; _a < spawns_2.length; _a++) {
                    var spawn = spawns_2[_a];
                    keyPoints.push(spawn.pos);
                }
                var sources = room.find(FIND_SOURCES);
                for (var _b = 0, sources_1 = sources; _b < sources_1.length; _b++) {
                    var source = sources_1[_b];
                    keyPoints.push(source.pos);
                }
                var controller = room.controller;
                if (controller)
                    keyPoints.push(controller.pos);
                for (var i = 0; i < keyPoints.length; i++) {
                    for (var j = i + 1; j < keyPoints.length; j++) {
                        planRoadBetween(keyPoints[i], keyPoints[j]);
                    }
                }
                checkAndRepairRoad();
            }
        }
        catch (error) {
            console.log("Error in planRoads: ".concat(error.message));
        }
    },
    buildContainers: function (room) {
        container_service_1.default.buildContainers(room);
    },
    processBuildOrder: function (room) {
        try {
            if (room.controller && room.controller.my) {
                if (!Memory.exitZones[room.name] || Game.time % 5000 === 0)
                    Memory.exitZones[room.name] = this.getExitZones(room);
                this.exitZones = Memory.exitZones[room.name];
                if (!Memory.roomTerrain[room.name])
                    Memory.roomTerrain[room.name] = this.cacheRoomTerrain(room.name);
                this.roomTerrain = Memory.roomTerrain[room.name];
                if (!Memory.structureCache[room.name] || Game.time % 100 === 0) {
                    Memory.structureCache[room.name] = {
                        spawns: room.find(FIND_MY_SPAWNS),
                        constructionSites: room.find(FIND_CONSTRUCTION_SITES),
                        existingStructures: room.find(FIND_MY_STRUCTURES),
                    };
                }
                var _a = Memory.structureCache[room.name], spawns = _a.spawns, constructionSites = _a.constructionSites, existingStructures = _a.existingStructures;
                if (spawns.length === 0) {
                    this.buildStructure(room, STRUCTURE_SPAWN, 1, constructionSites, existingStructures);
                }
                else {
                    for (var i = 0; i < this.buildOrder.length; i++) {
                        var structureType = this.buildOrder[i];
                        var availableCount = this.getAvailableStructureCount(room, structureType, existingStructures, constructionSites);
                        if (availableCount > 0) {
                            this.buildStructure(room, structureType, 1, constructionSites, existingStructures);
                            break;
                        }
                    }
                }
            }
        }
        catch (error) {
            console.log("Error in processBuildOrder: ".concat(error.message));
        }
    },
    buildStructure: function (room, type, maxCount, constructionSites, existingStructures) {
        try {
            var structuresPlanned = 0;
            var roomCenter = new RoomPosition(25, 25, room.name);
            var exitZones = this.exitZones;
            var cachedPaths = Memory.cachedPaths;
            for (var radius = 1; structuresPlanned < maxCount; radius++) {
                for (var xOffset = -radius; xOffset <= radius; xOffset++) {
                    for (var yOffset = -radius; yOffset <= radius; yOffset++) {
                        // Шахматный порядок по диагоналям
                        if ((xOffset + yOffset) % 2 !== 0)
                            continue;
                        var x = roomCenter.x + xOffset;
                        var y = roomCenter.y + yOffset;
                        var areaToCheck = room.lookAtArea(y - 1, x - 1, y + 1, x + 1, true);
                        var hasContainerNearby = areaToCheck.some(function (a) {
                            return a.structure && a.structure.structureType === STRUCTURE_CONTAINER;
                        });
                        var hasSourceNearby = areaToCheck.some(function (a) { return a.type === LOOK_SOURCES; });
                        if (this.isRestrictedZone(exitZones, cachedPaths, x, y) ||
                            hasContainerNearby ||
                            hasSourceNearby)
                            continue;
                        if (this.isValidConstructionPosition(room, x, y, constructionSites, existingStructures)) {
                            if (room.createConstructionSite(x, y, type) === OK) {
                                structuresPlanned++;
                                if (!this.firstStructurePos)
                                    this.firstStructurePos = new RoomPosition(x, y, room.name);
                                if (structuresPlanned >= maxCount)
                                    return;
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            console.log("Error in buildStructure: ".concat(error.message));
        }
    },
    buildSpawn: function (room) {
        try {
            if (room.find(FIND_MY_SPAWNS).length === 0) {
                this.buildStructure(room, STRUCTURE_SPAWN, 1, [], room.find(FIND_MY_STRUCTURES));
            }
        }
        catch (error) {
            console.log("Error in buildSpawn: ".concat(error.message));
        }
    },
    connectFirstStructure: function (room) {
        try {
            var exitZones = this.exitZones;
            var cachedPaths = Memory.cachedPaths;
            if (room.controller && room.controller.my) {
                var roomCenter = new RoomPosition(25, 25, room.name);
                var maxRadius = 25;
                try {
                    for (var radius = 1; radius <= maxRadius; radius++) {
                        var found = false;
                        for (var xOffset = -radius; xOffset <= radius; xOffset++) {
                            for (var yOffset = -radius; yOffset <= radius; yOffset++) {
                                if (Math.abs(xOffset) !== radius &&
                                    Math.abs(yOffset) !== radius)
                                    continue;
                                var x = roomCenter.x + xOffset;
                                var y = roomCenter.y + yOffset;
                                if (x < 0 || x > 49 || y < 0 || y > 49)
                                    continue;
                                if (this.isRestrictedZone(exitZones, cachedPaths, x, y))
                                    continue;
                                var constructionSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                                var structures = room.lookForAt(LOOK_STRUCTURES, x, y);
                                var hasExtensionConstructionSite = constructionSites.some(function (site) { return site.structureType === STRUCTURE_EXTENSION; });
                                var hasExtension = structures.some(function (structure) { return structure.structureType === STRUCTURE_EXTENSION; });
                                if (hasExtensionConstructionSite || hasExtension) {
                                    this.buildRoadsFromFirstStructure(room, new RoomPosition(x, y, room.name));
                                    found = true;
                                    break;
                                }
                            }
                            if (found)
                                break;
                        }
                    }
                }
                catch (error) {
                    console.log("Error connectFirstStructure in ".concat(room.name, ": ").concat(error));
                }
            }
        }
        catch (error) {
            console.log("Error in connectFirstStructure: ".concat(error.message));
        }
    },
    buildRoadsAroundStructures: function (room) {
        try {
            if (room.controller && room.controller.my) {
                try {
                    var structures = room.find(FIND_STRUCTURES, {
                        filter: function (structure) {
                            return (structure.structureType !== STRUCTURE_ROAD &&
                                structure.structureType !== STRUCTURE_WALL &&
                                structure.structureType !== STRUCTURE_RAMPART);
                        },
                    });
                    structures.forEach(function (structure) {
                        var x = structure.pos.x;
                        var y = structure.pos.y;
                        var positions = [
                            [x - 1, y - 1],
                            // [x, y - 1],
                            [x + 1, y - 1],
                            // [x - 1, y],
                            // [x + 1, y],
                            [x - 1, y + 1],
                            // [x, y + 1],
                            [x + 1, y + 1],
                        ];
                        positions.forEach(function (pos) {
                            var x = pos[0], y = pos[1];
                            if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
                                var look = room.lookAt(x, y);
                                var isRoadPresent = look.some(function (lookObject) {
                                    return lookObject.type === LOOK_STRUCTURES &&
                                        lookObject.structure &&
                                        lookObject.structure.structureType === STRUCTURE_ROAD;
                                });
                                var isConstructionSitePresent = look.some(function (lookObject) {
                                    return lookObject.type === LOOK_CONSTRUCTION_SITES &&
                                        lookObject.constructionSite &&
                                        lookObject.constructionSite.structureType === STRUCTURE_ROAD;
                                });
                                var isObstacle = look.some(function (lookObject) {
                                    return lookObject.type === LOOK_TERRAIN &&
                                        lookObject.terrain === "wall";
                                });
                                if (!isRoadPresent &&
                                    !isConstructionSitePresent &&
                                    !isObstacle) {
                                    room.createConstructionSite(x, y, STRUCTURE_ROAD);
                                }
                            }
                        });
                    });
                }
                catch (error) {
                    console.log("Error buildRoadsAroundStructures in ".concat(room.name, ": ").concat(error.message));
                }
            }
        }
        catch (error) {
            console.log("Error in buildRoadsAroundStructures: ".concat(error.message));
        }
    },
    buildRoadsFromFirstStructure: function (room, startPos) {
        try {
            var sources = room.find(FIND_SOURCES);
            var controller = room.controller;
            var targets = sources.map(function (source) { return source.pos; });
            if (controller)
                targets.push(controller.pos);
            for (var _i = 0, targets_1 = targets; _i < targets_1.length; _i++) {
                var target = targets_1[_i];
                var path = PathFinder.search(startPos, { pos: target, range: 1 }, {
                    plainCost: 2,
                    swampCost: 10,
                    roomCallback: function (roomName) {
                        var room = Game.rooms[roomName];
                        if (!room || !room.controller || !room.controller.my)
                            return new PathFinder.CostMatrix();
                        var costs = new PathFinder.CostMatrix();
                        room.find(FIND_STRUCTURES).forEach(function (struct) {
                            if (struct.structureType === STRUCTURE_ROAD)
                                costs.set(struct.pos.x, struct.pos.y, 1);
                            else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                struct.structureType !== STRUCTURE_RAMPART &&
                                struct.my !== false)
                                costs.set(struct.pos.x, struct.pos.y, 0xff);
                        });
                        return costs;
                    },
                }).path;
                for (var _a = 0, path_2 = path; _a < path_2.length; _a++) {
                    var pos = path_2[_a];
                    room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                }
            }
        }
        catch (error) {
            console.log("Error in buildRoadsFromFirstStructure: ".concat(error.message));
        }
    },
    isRestrictedZone: function (exitZones, cachedPaths, x, y) {
        try {
            for (var _i = 0, exitZones_1 = exitZones; _i < exitZones_1.length; _i++) {
                var zone = exitZones_1[_i];
                if (x >= zone.xMin &&
                    x <= zone.xMax &&
                    y >= zone.yMin &&
                    y <= zone.yMax) {
                    return true;
                }
            }
            for (var _a = 0, cachedPaths_1 = cachedPaths; _a < cachedPaths_1.length; _a++) {
                var pos = cachedPaths_1[_a];
                if (Math.abs(pos.x - x) <= 1 && Math.abs(pos.y - y) <= 1) {
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            console.log("Error in isRestrictedZone: ".concat(error.message));
            return false;
        }
    },
    isValidConstructionPosition: function (room, x, y, constructionSites, existingStructures) {
        try {
            if (x <= 2 || y <= 2 || x >= 47 || y >= 47)
                return false;
            if (Memory.roomTerrain[room.name][x][y] === TERRAIN_MASK_WALL)
                return false;
            if (existingStructures.some(function (s) { return s.pos.x === x && s.pos.y === y; }))
                return false;
            if (constructionSites.some(function (s) { return s.pos.x === x && s.pos.y === y; }))
                return false;
            return true;
        }
        catch (error) {
            console.log("Error in isValidConstructionPosition: ".concat(error.message));
            return false;
        }
    },
    cacheRoomTerrain: function (roomName) {
        try {
            var terrain = new Room.Terrain(roomName);
            var terrainData = [];
            for (var x = 0; x < 50; x++) {
                terrainData[x] = [];
                for (var y = 0; y < 50; y++) {
                    terrainData[x][y] = terrain.get(x, y);
                }
            }
            return terrainData;
        }
        catch (error) {
            console.log("Error in cacheRoomTerrain: ".concat(error.message));
            return [];
        }
    },
    getExitZones: function (room) {
        try {
            var exitZones = [];
            var exitTypes = [
                FIND_EXIT_TOP,
                FIND_EXIT_RIGHT,
                FIND_EXIT_BOTTOM,
                FIND_EXIT_LEFT,
            ];
            for (var _i = 0, exitTypes_1 = exitTypes; _i < exitTypes_1.length; _i++) {
                var exitType = exitTypes_1[_i];
                var exitPositions = room.find(exitType);
                for (var _a = 0, exitPositions_1 = exitPositions; _a < exitPositions_1.length; _a++) {
                    var pos = exitPositions_1[_a];
                    exitZones.push({
                        xMin: Math.max(0, pos.x - 5),
                        xMax: Math.min(49, pos.x + 5),
                        yMin: Math.max(0, pos.y - 5),
                        yMax: Math.min(49, pos.y + 5),
                    });
                }
            }
            return exitZones;
        }
        catch (error) {
            console.log("Error in getExitZones: ".concat(error.message));
            return [];
        }
    },
    getAvailableStructureCount: function (room, structureType, existingStructures, constructionSites) {
        var _a, _b;
        try {
            var controllerLevel = (_b = (_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) !== null && _b !== void 0 ? _b : 0;
            var maxStructures = CONTROLLER_STRUCTURES[structureType][controllerLevel];
            var existingCount = existingStructures.filter(function (s) { return s.structureType === structureType; }).length;
            var constructionCount = constructionSites.filter(function (s) { return s.structureType === structureType; }).length;
            return maxStructures - existingCount - constructionCount;
        }
        catch (error) {
            console.log("Error in getAvailableStructureCount: ".concat(error.message));
            return 0;
        }
    },
    checkConstructionSites: function (room) {
        try {
            var constructionSites = room.find(FIND_CONSTRUCTION_SITES);
            return constructionSites.length > 50;
        }
        catch (error) {
            console.log("Error in checkConstructionSites: ".concat(error.message));
            return false;
        }
    },
    blockExits: function (room) {
        var _a;
        try {
            var spawns = room.find(FIND_MY_SPAWNS);
            if (!spawns) {
                return;
            }
            var spawn = spawns[0];
            var exitTypes = [
                FIND_EXIT_TOP,
                FIND_EXIT_RIGHT,
                FIND_EXIT_BOTTOM,
                FIND_EXIT_LEFT,
            ];
            if (!Memory.roomData.exits) {
                Memory.roomData.exits = {};
            }
            if (!Memory.roomData.exits[room.name]) {
                Memory.roomData.exits[room.name] = (_a = {},
                    _a[FIND_EXIT_TOP] = this.getExitRampPoint(room, FIND_EXIT_TOP, spawn),
                    _a[FIND_EXIT_RIGHT] = this.getExitRampPoint(room, FIND_EXIT_RIGHT, spawn),
                    _a[FIND_EXIT_BOTTOM] = this.getExitRampPoint(room, FIND_EXIT_BOTTOM, spawn),
                    _a[FIND_EXIT_LEFT] = this.getExitRampPoint(room, FIND_EXIT_LEFT, spawn),
                    _a);
            }
            // for (let roomName in Game.rooms) {
            //   const room = Game.rooms[roomName];
            // if (room.controller && room.controller.my) {
            if (!Memory.exitZones[room.name] || Game.time % 5000 === 0) {
                Memory.exitZones[room.name] = this.getExitZones(room);
            }
            var exitZones = Memory.exitZones[room.name];
            for (var _i = 0, exitTypes_2 = exitTypes; _i < exitTypes_2.length; _i++) {
                var exitType = exitTypes_2[_i];
                var exitPositions = room.find(exitType);
                if (exitPositions.length > 0) {
                    var clusters = [];
                    var currentCluster = [];
                    for (var i = 0; i < exitPositions.length; i++) {
                        var pos = exitPositions[i];
                        if (currentCluster.length === 0 ||
                            (Math.abs(pos.x - currentCluster[currentCluster.length - 1].x) <=
                                1 &&
                                Math.abs(pos.y - currentCluster[currentCluster.length - 1].y) <=
                                    1)) {
                            currentCluster.push(pos);
                        }
                        else {
                            clusters.push(currentCluster);
                            currentCluster = [pos];
                        }
                    }
                    if (currentCluster.length > 0) {
                        clusters.push(currentCluster);
                    }
                    for (var _b = 0, clusters_1 = clusters; _b < clusters_1.length; _b++) {
                        var cluster = clusters_1[_b];
                        for (var _c = 0, cluster_1 = cluster; _c < cluster_1.length; _c++) {
                            var exitPosition = cluster_1[_c];
                            var x = exitPosition.x;
                            var y = exitPosition.y;
                            var wallPositions = [];
                            switch (exitType) {
                                case FIND_EXIT_TOP:
                                    wallPositions.push({ x: x - 2, y: y + 1 });
                                    wallPositions.push({ x: x - 2, y: y + 2 });
                                    wallPositions.push({ x: x - 1, y: y + 2 });
                                    wallPositions.push({ x: x, y: y + 2 });
                                    wallPositions.push({ x: x + 1, y: y + 2 });
                                    wallPositions.push({ x: x + 2, y: y + 2 });
                                    wallPositions.push({ x: x + 2, y: y + 1 });
                                    break;
                                case FIND_EXIT_RIGHT:
                                    wallPositions.push({ x: x - 1, y: y - 2 });
                                    wallPositions.push({ x: x - 2, y: y - 2 });
                                    wallPositions.push({ x: x - 2, y: y - 1 });
                                    wallPositions.push({ x: x - 2, y: y });
                                    wallPositions.push({ x: x - 2, y: y + 1 });
                                    wallPositions.push({ x: x - 2, y: y + 2 });
                                    wallPositions.push({ x: x - 1, y: y + 2 });
                                    break;
                                case FIND_EXIT_BOTTOM:
                                    wallPositions.push({ x: x - 2, y: y - 1 });
                                    wallPositions.push({ x: x - 2, y: y - 2 });
                                    wallPositions.push({ x: x - 1, y: y - 2 });
                                    wallPositions.push({ x: x, y: y - 2 });
                                    wallPositions.push({ x: x + 1, y: y - 2 });
                                    wallPositions.push({ x: x + 2, y: y - 2 });
                                    wallPositions.push({ x: x + 2, y: y - 1 });
                                    break;
                                case FIND_EXIT_LEFT:
                                    wallPositions.push({ x: x + 1, y: y - 2 });
                                    wallPositions.push({ x: x + 2, y: y - 2 });
                                    wallPositions.push({ x: x + 2, y: y - 1 });
                                    wallPositions.push({ x: x + 2, y: y });
                                    wallPositions.push({ x: x + 2, y: y + 1 });
                                    wallPositions.push({ x: x + 2, y: y + 2 });
                                    wallPositions.push({ x: x + 1, y: y + 2 });
                                    break;
                            }
                            var _loop_1 = function (pos) {
                                var rampartPositions = Memory.roomData.exits[room.name][exitType];
                                var structuresAtPos = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y).length === 0;
                                var constructionSitesAtPos = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y)
                                    .length === 0;
                                if (structuresAtPos && constructionSitesAtPos) {
                                    var isRampartPosition = rampartPositions.some(function (p) { return p.x === pos.x && p.y === pos.y; });
                                    var structureType = isRampartPosition
                                        ? STRUCTURE_RAMPART
                                        : STRUCTURE_WALL;
                                    room.createConstructionSite(pos.x, pos.y, structureType);
                                }
                            };
                            for (var _d = 0, wallPositions_1 = wallPositions; _d < wallPositions_1.length; _d++) {
                                var pos = wallPositions_1[_d];
                                _loop_1(pos);
                            }
                        }
                    }
                }
            }
            // }
            //}
        }
        catch (error) {
            console.log("Error in blockExits: ".concat(error.message));
        }
    },
    getExitRampPoint: function (room, exitType, spawn) {
        var _this = this;
        var returnData = [];
        var exitPositions = room.find(exitType);
        // Array to store segments of exit positions.
        var segments = [];
        // Array to store the current segment.
        var currentSegment = [];
        // Sort exit positions to simplify processing. Sort based on exit type.
        exitPositions.sort(function (a, b) {
            return exitType === FIND_EXIT_TOP || exitType === FIND_EXIT_BOTTOM
                ? a.x - b.x
                : a.y - b.y;
        });
        exitPositions.forEach(function (pos) {
            if (currentSegment.length === 0 ||
                _this.areAdjacent(currentSegment[currentSegment.length - 1], pos)) {
                // Check if the current position is adjacent to the last position in the segment.
                // Add position to the current segment.
                currentSegment.push({ x: pos.x, y: pos.y });
            }
            else {
                // Add the current segment to segments array.
                segments.push(currentSegment);
                // Start a new segment.
                currentSegment = [{ x: pos.x, y: pos.y }];
            }
        });
        if (currentSegment.length > 0) {
            // Add the last segment if it exists.
            segments.push(currentSegment);
        }
        // Find the central points for each segment.
        var centralPoints = segments.map(function (segment) {
            // Calculate the middle index.
            var midIndex = Math.floor(segment.length / 2);
            // Return the central point of the segment.
            return segment[midIndex];
        });
        for (var _i = 0, centralPoints_1 = centralPoints; _i < centralPoints_1.length; _i++) {
            var centralPoint = centralPoints_1[_i];
            var position = new RoomPosition(centralPoint.x, centralPoint.y, room.name);
            var path = spawn.pos.findPathTo(position);
            path.reverse();
            var MIN = 2;
            var MAX = 47;
            switch (exitType) {
                case FIND_EXIT_TOP:
                    this.addRampartPosition([null, MIN], [null, MIN - 1], returnData, path);
                    break;
                case FIND_EXIT_RIGHT:
                    this.addRampartPosition([MAX, null], [MAX + 1, null], returnData, path);
                    break;
                case FIND_EXIT_BOTTOM:
                    this.addRampartPosition([null, MAX], [null, MAX + 1], returnData, path);
                    break;
                case FIND_EXIT_LEFT:
                    this.addRampartPosition([MIN, null], [MIN - 1, null], returnData, path);
                    break;
            }
        }
        return returnData;
    },
    areAdjacent: function (pos1, pos2) {
        var distance = Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
        return distance === 1;
    },
    getPointOnPath: function (x, y, path) {
        for (var _i = 0, path_3 = path; _i < path_3.length; _i++) {
            var step = path_3[_i];
            if (x !== null && step.x === x) {
                return step;
            }
            if (y !== null && step.y === y) {
                return step;
            }
        }
        return null;
    },
    addRampartPosition: function (primaryPosition, secondaryPosition, returnData, path) {
        var primaryRampartPosition = this.getPointOnPath(primaryPosition[0], primaryPosition[1], path);
        if (primaryRampartPosition) {
            returnData.push(primaryRampartPosition);
        }
        else {
            var secondaryRampartPosition = this.getPointOnPath(secondaryPosition[0], secondaryPosition[1], path);
            if (secondaryRampartPosition) {
                returnData.push(secondaryRampartPosition);
            }
        }
    },
};
exports.default = buildService;
