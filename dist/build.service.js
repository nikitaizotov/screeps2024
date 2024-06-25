"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
            if (!Memory.structureCache) {
                Memory.structureCache = {};
            }
            if (!Memory.cachedPaths) {
                Memory.cachedPaths = [];
            }
            if (!Memory.exitZones) {
                Memory.exitZones = {};
            }
            if (!Memory.roomTerrain) {
                Memory.roomTerrain = {};
            }
            // if (Game.time % 15000 === 0) {
            //   this.planRoads();
            // }
            // if (Game.time % 90 === 0) {
            //   this.processBuildOrder();
            // }
            // if (Game.time % 111 === 0) {
            //   this.connectFirstStructure();
            // }
            // if (Game.time % 222 === 0) {
            //   this.blockExits();
            // }
            var rooms = Game.rooms;
            for (var roomName in rooms) {
                var room = rooms[roomName];
                //this.buildContainers(room);
            }
        }
        catch (error) {
            console.log("Error in run: ".concat(error.message));
        }
    },
    planRoads: function () {
        try {
            if (!Memory.cachedPaths) {
                Memory.cachedPaths = [];
            }
            if (!Memory.connectedPoints) {
                Memory.connectedPoints = {};
            }
            var rooms = Game.rooms;
            var allSpawns = [];
            for (var roomName in rooms) {
                var room = rooms[roomName];
                if (room.controller && room.controller.my) {
                    var spawns = room.find(FIND_MY_SPAWNS);
                    for (var _i = 0, spawns_1 = spawns; _i < spawns_1.length; _i++) {
                        var spawn = spawns_1[_i];
                        allSpawns.push(spawn.pos);
                    }
                }
            }
            var hashPos_1 = function (pos) {
                return "".concat(pos.roomName, "_").concat(pos.x, "_").concat(pos.y);
            };
            var addConnection_1 = function (pos1, pos2) {
                var key1 = hashPos_1(pos1);
                var key2 = hashPos_1(pos2);
                if (!Memory.connectedPoints[key1]) {
                    Memory.connectedPoints[key1] = [];
                }
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
                    var room = Game.rooms[pos.roomName];
                    if (room && room.controller && room.controller.my) {
                        var structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
                        var hasRoad = structures.some(function (s) { return s.structureType === STRUCTURE_ROAD; });
                        if (!hasRoad) {
                            var constructionSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);
                            var hasConstructionSite = constructionSites.some(function (s) { return s.structureType === STRUCTURE_ROAD; });
                            if (!hasConstructionSite) {
                                room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                            }
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
                        if (!room || !room.controller || !room.controller.my) {
                            return new PathFinder.CostMatrix();
                        }
                        var costs = new PathFinder.CostMatrix();
                        room.find(FIND_STRUCTURES).forEach(function (struct) {
                            if (struct.structureType === STRUCTURE_ROAD) {
                                costs.set(struct.pos.x, struct.pos.y, 1);
                            }
                            else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                struct.structureType !== STRUCTURE_RAMPART &&
                                !(struct instanceof OwnedStructure && struct.my === false)) {
                                costs.set(struct.pos.x, struct.pos.y, 0xff);
                            }
                        });
                        return costs;
                    },
                }).path;
                (_a = Memory.cachedPaths).push.apply(_a, path.map(function (pos) { return ({ x: pos.x, y: pos.y, roomName: pos.roomName }); }));
                for (var _i = 0, path_1 = path; _i < path_1.length; _i++) {
                    var pos = path_1[_i];
                    Game.rooms[pos.roomName].createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
                }
                addConnection_1(pos1, pos2);
            };
            for (var roomName in rooms) {
                var room = rooms[roomName];
                if (room.controller && room.controller.my) {
                    var keyPoints = [];
                    var spawns = room.find(FIND_MY_SPAWNS);
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
                    if (controller) {
                        keyPoints.push(controller.pos);
                    }
                    for (var i = 0; i < keyPoints.length; i++) {
                        for (var j = i + 1; j < keyPoints.length; j++) {
                            planRoadBetween(keyPoints[i], keyPoints[j]);
                        }
                    }
                }
            }
            for (var i = 0; i < allSpawns.length; i++) {
                for (var j = i + 1; j < allSpawns.length; j++) {
                    if (allSpawns[i].roomName !== allSpawns[j].roomName) {
                        planRoadBetween(allSpawns[i], allSpawns[j]);
                    }
                }
            }
            checkAndRepairRoad();
        }
        catch (error) {
            console.log("Error in planRoads: ".concat(error.message));
        }
    },
    processBuildOrder: function () {
        try {
            var rooms = Game.rooms;
            for (var roomName in rooms) {
                var room = rooms[roomName];
                if (room.controller && room.controller.my) {
                    if (!Memory.exitZones[room.name] || Game.time % 5000 === 0) {
                        Memory.exitZones[room.name] = this.getExitZones(room);
                    }
                    this.exitZones = Memory.exitZones[room.name];
                    if (!Memory.roomTerrain[room.name]) {
                        Memory.roomTerrain[room.name] = this.cacheRoomTerrain(room.name);
                    }
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
            for (var radius = 1; structuresPlanned < maxCount; radius += 2) {
                for (var xOffset = -radius; xOffset <= radius; xOffset += 2) {
                    for (var yOffset = -radius; yOffset <= radius; yOffset += 2) {
                        var x = roomCenter.x + xOffset;
                        var y = roomCenter.y + yOffset;
                        if (this.isRestrictedZone(exitZones, cachedPaths, x, y)) {
                            continue;
                        }
                        if (this.isValidConstructionPosition(room, x, y, constructionSites, existingStructures)) {
                            if (room.createConstructionSite(x, y, type) === OK) {
                                structuresPlanned++;
                                if (!this.firstStructurePos) {
                                    this.firstStructurePos = new RoomPosition(x, y, room.name);
                                }
                                if (structuresPlanned >= maxCount) {
                                    return;
                                }
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
    connectFirstStructure: function () {
        try {
            var exitZones = this.exitZones;
            var cachedPaths = Memory.cachedPaths;
            for (var roomName in Game.rooms) {
                var room = Game.rooms[roomName];
                if (room.controller && room.controller.my) {
                    var roomCenter = new RoomPosition(25, 25, room.name);
                    var maxRadius = 25;
                    try {
                        for (var radius = 1; radius <= maxRadius; radius++) {
                            var found = false;
                            for (var xOffset = -radius; xOffset <= radius; xOffset++) {
                                for (var yOffset = -radius; yOffset <= radius; yOffset++) {
                                    if (Math.abs(xOffset) !== radius &&
                                        Math.abs(yOffset) !== radius) {
                                        continue;
                                    }
                                    var x = roomCenter.x + xOffset;
                                    var y = roomCenter.y + yOffset;
                                    if (x < 0 || x > 49 || y < 0 || y > 49) {
                                        continue;
                                    }
                                    if (this.isRestrictedZone(exitZones, cachedPaths, x, y)) {
                                        continue;
                                    }
                                    var constructionSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
                                    var structures = room.lookForAt(LOOK_STRUCTURES, x, y);
                                    var hasExtensionConstructionSite = constructionSites.some(function (site) { return site.structureType === STRUCTURE_EXTENSION; });
                                    var hasExtension = structures.some(function (structure) {
                                        return structure.structureType === STRUCTURE_EXTENSION;
                                    });
                                    if (hasExtensionConstructionSite || hasExtension) {
                                        this.buildRoadsFromFirstStructure(room, new RoomPosition(x, y, roomName));
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
                        console.log("Error connectFirstStructure in ".concat(roomName, ": ").concat(error));
                    }
                }
            }
        }
        catch (error) {
            console.log("Error in connectFirstStructure: ".concat(error.message));
        }
    },
    buildRoadsAroundStructures: function () {
        try {
            var _loop_1 = function (roomName) {
                var room = Game.rooms[roomName];
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
                                [x, y - 1],
                                [x + 1, y - 1],
                                [x - 1, y],
                                [x + 1, y],
                                [x - 1, y + 1],
                                [x, y + 1],
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
                                            lookObject.constructionSite.structureType ===
                                                STRUCTURE_ROAD;
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
                        console.log("Error buildRoadsAroundStructures in ".concat(roomName, ": ").concat(error.message));
                    }
                }
            };
            for (var roomName in Game.rooms) {
                _loop_1(roomName);
            }
        }
        catch (error) {
            console.log("Error in buildRoadsAroundStructures: ".concat(error.message));
        }
    },
    buildRoadsFromFirstStructure: function (room, startPos) {
        try {
            console.log("buildRoadsFromFirstStructure");
            var sources = room.find(FIND_SOURCES);
            var controller = room.controller;
            var targets = sources.map(function (source) { return source.pos; });
            if (controller) {
                targets.push(controller.pos);
            }
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
                            if (struct.structureType === STRUCTURE_ROAD) {
                                costs.set(struct.pos.x, struct.pos.y, 1);
                            }
                            else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                struct.structureType !== STRUCTURE_RAMPART &&
                                struct.my !== false) {
                                costs.set(struct.pos.x, struct.pos.y, 0xff);
                            }
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
    blockExits: function () {
        try {
            var exitTypes = [
                FIND_EXIT_TOP,
                FIND_EXIT_RIGHT,
                FIND_EXIT_BOTTOM,
                FIND_EXIT_LEFT,
            ];
            for (var roomName in Game.rooms) {
                var room = Game.rooms[roomName];
                if (room.controller && room.controller.my) {
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
                                    (Math.abs(pos.x - currentCluster[currentCluster.length - 1].x) <= 1 &&
                                        Math.abs(pos.y - currentCluster[currentCluster.length - 1].y) <= 1)) {
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
                            for (var _a = 0, clusters_1 = clusters; _a < clusters_1.length; _a++) {
                                var cluster = clusters_1[_a];
                                var midIndex = Math.floor(cluster.length / 2);
                                var midExit = cluster[midIndex];
                                var midX = midExit.x;
                                var midY = midExit.y;
                                switch (exitType) {
                                    case FIND_EXIT_TOP:
                                        midY += 2;
                                        break;
                                    case FIND_EXIT_RIGHT:
                                        midX -= 2;
                                        break;
                                    case FIND_EXIT_BOTTOM:
                                        midY -= 2;
                                        break;
                                    case FIND_EXIT_LEFT:
                                        midX += 2;
                                        break;
                                }
                                if (room.lookForAt(LOOK_STRUCTURES, midX, midY).length === 0 &&
                                    room.lookForAt(LOOK_CONSTRUCTION_SITES, midX, midY).length ===
                                        0) {
                                    room.createConstructionSite(midX, midY, STRUCTURE_RAMPART);
                                }
                                for (var _b = 0, cluster_1 = cluster; _b < cluster_1.length; _b++) {
                                    var exitPosition = cluster_1[_b];
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
                                    for (var _c = 0, wallPositions_1 = wallPositions; _c < wallPositions_1.length; _c++) {
                                        var pos = wallPositions_1[_c];
                                        if (room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y).length ===
                                            0 &&
                                            room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y)
                                                .length === 0) {
                                            room.createConstructionSite(pos.x, pos.y, STRUCTURE_WALL);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            console.log("Error in blockExits: ".concat(error.message));
        }
    },
};
exports.default = buildService;
