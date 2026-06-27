"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
class CacheService {
    /**
     * Will clear the cache of paths.
     */
    clearCreepPathCache(expirationTime = 1000) {
        try {
            const currentTick = Game.time;
            if (currentTick % expirationTime === 0) {
                for (const roomName in Memory.cacheCreepPaths) {
                    const roomCache = Memory.cacheCreepPaths[roomName];
                    const keysToRemove = [];
                    for (const key in roomCache) {
                        const cachedPath = roomCache[key];
                        if (currentTick - cachedPath.lastAccessed > expirationTime ||
                            cachedPath.usedTimes < 2) {
                            keysToRemove.push(key);
                        }
                    }
                    for (const key of keysToRemove) {
                        delete roomCache[key];
                    }
                    const sortedCache = Object.entries(roomCache)
                        .sort(([, a], [, b]) => b.usedTimes - a.usedTimes)
                        .reduce((acc, [key, value]) => {
                        acc[key] = value;
                        return acc;
                    }, {});
                    Memory.cacheCreepPaths[roomName] = sortedCache;
                }
            }
        }
        catch (error) {
            console.log(`Error in clearCreepPathCache: ${error.message}`);
        }
    }
    cacheSources(room) {
        if (!Memory.cache.sources[room.name]) {
            Memory.cache.sources[room.name] = [];
        }
        const sources = room.find(FIND_SOURCES);
        const sourceIds = sources.map((source) => source.id);
        Memory.cache.sources[room.name] = sourceIds;
    }
    cacheStorages(room) {
        this.cacheStructures(room, STRUCTURE_STORAGE, "storages");
    }
    cacheTerminals(room) {
        this.cacheStructures(room, STRUCTURE_TERMINAL, "terminals");
    }
    cacheContainers(room) {
        this.cacheStructures(room, STRUCTURE_CONTAINER, "containers");
    }
    cacheSpawns(room) {
        this.cacheStructures(room, STRUCTURE_SPAWN, "spawns");
    }
    cacheTowers(room) {
        this.cacheStructures(room, STRUCTURE_TOWER, "towers");
    }
    cacheLinks(room) {
        this.cacheStructures(room, STRUCTURE_LINK, "links");
    }
    cacheExtensions(room) {
        this.cacheStructures(room, STRUCTURE_EXTENSION, "extensions");
    }
    cacheWalls(room) {
        this.cacheStructures(room, STRUCTURE_WALL, "walls");
    }
    cacheRamparts(room) {
        this.cacheStructures(room, STRUCTURE_RAMPART, "ramparts");
    }
    cacheConstructionSites(room) {
        if (!Memory.cache.constructionSites) {
            Memory.cache.constructionSites = {};
        }
        if (!Memory.cache.constructionSites[room.name]) {
            Memory.cache.constructionSites[room.name] = [];
        }
        const sites = room.find(FIND_CONSTRUCTION_SITES);
        const ids = sites.map((site) => site.id);
        Memory.cache.constructionSites[room.name] = ids;
    }
    getFromCache(ids) {
        try {
            const objects = ids.map((id) => Game.getObjectById(id));
            if (objects.some((obj) => obj === null)) {
                return null;
            }
            return objects;
        }
        catch (error) {
            console.log(`Error in getFromCache: ${error.message}`);
            return [];
        }
    }
    findSpawns(room) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.spawns) {
                Memory.cache.spawns = {};
            }
            if (!Memory.cache.spawns[room.name]) {
                this.cacheSpawns(room);
            }
            const cachedIds = Memory.cache.spawns[room.name];
            if (cachedIds && cachedIds.length > 0) {
                const spawns = this.getFromCache(cachedIds);
                if (spawns) {
                    return spawns.filter((spawn) => spawn !== null);
                }
                else {
                    this.cacheSpawns(room);
                }
            }
            return room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_SPAWN;
                },
            });
        }
        catch (error) {
            console.log(`Error in findSpawns: ${error.message}`);
            return room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_SPAWN;
                },
            });
        }
    }
    findTowers(room) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.towers) {
                Memory.cache.towers = {};
            }
            if (!Memory.cache.towers[room.name]) {
                this.cacheTowers(room);
            }
            const cachedIds = Memory.cache.towers[room.name];
            if (cachedIds && cachedIds.length > 0) {
                const targets = this.getFromCache(cachedIds);
                if (targets) {
                    return targets.filter((target) => target !== null);
                }
                else {
                    this.cacheTowers(room);
                }
            }
            return room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_TOWER;
                },
            });
        }
        catch (error) {
            console.log(`Error in findTowers: ${error.message}`);
            return room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_TOWER;
                },
            });
        }
    }
    findExtensions(room) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.extensions) {
                Memory.cache.extensions = {};
            }
            if (!Memory.cache.extensions[room.name]) {
                this.cacheExtensions(room);
            }
            const cachedIds = Memory.cache.extensions[room.name];
            if (cachedIds && cachedIds.length > 0) {
                const targets = this.getFromCache(cachedIds);
                if (targets) {
                    return targets.filter((target) => target !== null);
                }
                else {
                    this.cacheExtensions(room);
                }
            }
            return room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_EXTENSION;
                },
            });
        }
        catch (error) {
            console.log(`Error in findExtensions: ${error.message}`);
            return room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_EXTENSION;
                },
            });
        }
    }
    findWalls(room) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.walls) {
                Memory.cache.walls = {};
            }
            if (!Memory.cache.walls[room.name]) {
                this.cacheWalls(room);
            }
            const cachedIds = Memory.cache.walls[room.name];
            if (cachedIds && cachedIds.length > 0) {
                const targets = this.getFromCache(cachedIds);
                if (targets) {
                    return targets.filter((target) => target !== null);
                }
                else {
                    this.cacheWalls(room);
                }
            }
            return room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_WALL;
                },
            });
        }
        catch (error) {
            console.log(`Error in findWalls: ${error.message}`);
            return room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_WALL;
                },
            });
        }
    }
    findRamparts(room) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.ramparts) {
                Memory.cache.ramparts = {};
            }
            if (!Memory.cache.ramparts[room.name]) {
                this.cacheRamparts(room);
            }
            const cachedIds = Memory.cache.ramparts[room.name];
            if (cachedIds && cachedIds.length > 0) {
                const targets = this.getFromCache(cachedIds);
                if (targets) {
                    return targets.filter((target) => target !== null);
                }
                else {
                    this.cacheRamparts(room);
                }
            }
            return room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_RAMPART;
                },
            });
        }
        catch (error) {
            console.log(`Error in findRamparts: ${error.message}`);
            return room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_RAMPART;
                },
            });
        }
    }
    findSources(room) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.sources) {
                Memory.cache.sources = {};
            }
            if (!Memory.cache.sources[room.name]) {
                this.cacheSources(room);
            }
            // Try to get from the cache.
            const cachedIds = Memory.cache.sources[room.name];
            if (cachedIds && cachedIds.length > 0) {
                const sources = this.getFromCache(cachedIds);
                if (sources) {
                    const availableSources = sources.filter((source) => source !== null && source.energy > 0);
                    if (availableSources.length > 0) {
                        return availableSources;
                    }
                    else {
                        return [];
                    }
                }
                else {
                    this.cacheSources(room);
                }
            }
            // Maybe there is no cache, let's do it in an old manner.
            return room.find(FIND_SOURCES, {
                filter: (source) => source.energy > 0,
            });
        }
        catch (error) {
            console.log(`Error in findSources: ${error.message}`);
            return [];
        }
    }
    findTerminals(room) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.terminals) {
                Memory.cache.terminals = {};
            }
            if (!Memory.cache.terminals[room.name]) {
                this.cacheTerminals(room);
            }
            // Try to get from the cache.
            const cachedIds = Memory.cache.terminals[room.name];
            if (cachedIds && cachedIds.length > 0) {
                const terminals = this.getFromCache(cachedIds);
                if (terminals === null || terminals === void 0 ? void 0 : terminals.length) {
                    return terminals;
                }
                else {
                    this.cacheTerminals(room);
                }
            }
            return [];
        }
        catch (error) {
            console.log(`Error in findTerminals: ${error.message}`);
            return [];
        }
    }
    findConstructionSites(room) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.constructionSites) {
                Memory.cache.constructionSites = {};
            }
            if (!Memory.cache.constructionSites[room.name]) {
                this.cacheConstructionSites(room);
            }
            // Try to get from the cache.
            const cachedIds = Memory.cache.constructionSites[room.name];
            if (cachedIds && cachedIds.length > 0) {
                const sites = this.getFromCache(cachedIds);
                if (sites === null || sites === void 0 ? void 0 : sites.length) {
                    return sites;
                }
                else {
                    this.cacheTerminals(room);
                }
            }
            return [];
        }
        catch (error) {
            console.log(`Error in findConstructionSites: ${error.message}`);
            return [];
        }
    }
    findLinks(room) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.links) {
                Memory.cache.links = {};
            }
            if (!Memory.cache.links[room.name]) {
                this.cacheLinks(room);
            }
            // Try to get from the cache.
            const cachedIds = Memory.cache.links[room.name];
            if (cachedIds && cachedIds.length > 0) {
                const structures = this.getFromCache(cachedIds);
                if (structures === null || structures === void 0 ? void 0 : structures.length) {
                    return structures;
                }
                else {
                    this.cacheTerminals(room);
                }
            }
            return [];
        }
        catch (error) {
            console.log(`Error in findLinks: ${error.message}`);
            return [];
        }
    }
    findDroppedResources(creep) {
        return creep.room.find(FIND_DROPPED_RESOURCES, {
            filter: (resource) => resource.resourceType === RESOURCE_ENERGY,
        });
    }
    findStorages(creep) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.storages) {
                Memory.cache.storages = {};
            }
            if (!Memory.cache.storages[creep.room.name]) {
                this.cacheStorages(creep.room);
            }
            // Try to get from the cache.
            const cachedIds = Memory.cache.storages[creep.room.name];
            if (cachedIds && cachedIds.length > 0) {
                const storages = this.getFromCache(cachedIds);
                if (storages) {
                    const availableStructures = storages.filter((structure) => structure.store[RESOURCE_ENERGY] >= creep.store.getFreeCapacity());
                    if (availableStructures.length > 0) {
                        return availableStructures;
                    }
                    else {
                        return [];
                    }
                }
                else {
                    this.cacheStorages(creep.room);
                }
            }
            return creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => structure.structureType === STRUCTURE_STORAGE &&
                    structure.store[RESOURCE_ENERGY] >= creep.store.getFreeCapacity(),
            });
        }
        catch (error) {
            console.log(`Error in findStorages: ${error.message}`);
            return [];
        }
    }
    findContainers(creep) {
        try {
            this.initCacheIfNotExist();
            if (!Memory.cache.containers) {
                Memory.cache.containers = {};
            }
            if (!Memory.cache.containers[creep.room.name]) {
                Memory.cache.containers[creep.room.name] = [];
            }
            // Try to get from the cache.
            const cachedIds = Memory.cache.containers[creep.room.name];
            if (cachedIds && cachedIds.length > 0) {
                const containers = this.getFromCache(cachedIds);
                if (containers) {
                    const availableStructures = containers.filter((structure) => structure.store[RESOURCE_ENERGY] > 0);
                    if (availableStructures.length > 0) {
                        return availableStructures;
                    }
                    else {
                        return [];
                    }
                }
                else {
                    this.cacheContainers(creep.room);
                }
            }
            return creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => structure.structureType === STRUCTURE_CONTAINER &&
                    structure.store[RESOURCE_ENERGY] > 0,
            });
        }
        catch (error) {
            console.log(`Error in findContainers: ${error.message}`);
            return [];
        }
    }
    initCacheIfNotExist() {
        if (!Memory.cache) {
            Memory.cache = {
                sources: {},
                storages: {},
                droppedResources: {},
                containers: {},
                spawns: {},
                towers: {},
                extensions: {},
                walls: {},
                ramparts: {},
                terminals: {},
                constructionSites: {},
                links: {},
            };
        }
    }
    cacheStructures(room, structureType, cacheKey) {
        if (!Memory.cache[cacheKey]) {
            Memory.cache[cacheKey] = {};
        }
        if (!Memory.cache[cacheKey][room.name]) {
            Memory.cache[cacheKey][room.name] = [];
        }
        const structures = room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType === structureType,
        });
        const ids = structures.map((structure) => structure.id);
        Memory.cache[cacheKey][room.name] = ids;
    }
}
exports.CacheService = CacheService;
