export class CacheService {
  /**
   * Will clear the cache of paths.
   */
  clearCreepPathCache(expirationTime: number = 1000): void {
    try {
      const currentTick = Game.time;

      if (currentTick % expirationTime === 0) {
        for (const roomName in Memory.cacheCreepPaths) {
          const roomCache = Memory.cacheCreepPaths[roomName];
          const keysToRemove = [];

          for (const key in roomCache) {
            const cachedPath = roomCache[key];
            if (
              currentTick - cachedPath.lastAccessed > expirationTime ||
              cachedPath.usedTimes < 2
            ) {
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
            }, {} as { [key: string]: CachedCreepPath });

          Memory.cacheCreepPaths[roomName] = sortedCache;
        }
      }
    } catch (error: any) {
      console.log(`Error in clearCreepPathCache: ${error.message}`);
    }
  }

  /**
   * Will cache sources for a given room.
   * @param room
   */
  // cacheSources(room: Room): void {
  //   if (!Memory.cache.sources[room.name]) {
  //     Memory.cache.sources[room.name] = [];
  //   }

  //   const sources = room.find(FIND_SOURCES);
  //   const sourceIds = sources.map((source) => source.id);

  //   Memory.cache.sources[room.name] = sourceIds;
  // }

  // cacheStorages(room: Room): void {
  //   if (!Memory.cache.storages[room.name]) {
  //     Memory.cache.storages[room.name] = [];
  //   }

  //   const storages = room.find(FIND_STRUCTURES, {
  //     filter: (structure) => structure.structureType === STRUCTURE_STORAGE,
  //   });

  //   const ids = storages.map((storage) => storage.id);

  //   Memory.cache.storages[room.name] = ids;
  // }

  // cacheContainers(room: Room): void {
  //   if (!Memory.cache.containers[room.name]) {
  //     Memory.cache.containers[room.name] = [];
  //   }

  //   const containers = room.find(FIND_STRUCTURES, {
  //     filter: (structure) => structure.structureType === STRUCTURE_CONTAINER,
  //   });

  //   const ids = containers.map((container) => container.id);

  //   Memory.cache.containers[room.name] = ids;
  // }

  // cacheSpawns(room: Room): void {
  //   if (!Memory.cache.spawns[room.name]) {
  //     Memory.cache.spawns[room.name] = [];
  //   }

  //   const targets = room.find(FIND_STRUCTURES, {
  //     filter: (structure: StructureSpawn) => {
  //       return structure.structureType === STRUCTURE_SPAWN;
  //     },
  //   });

  //   const ids = targets.map((targets) => targets.id);
  //   Memory.cache.spawns[room.name] = ids;
  // }

  // cacheTowers(room: Room): void {
  //   if (!Memory.cache.towers[room.name]) {
  //     Memory.cache.towers[room.name] = [];
  //   }

  //   const targets = room.find(FIND_STRUCTURES, {
  //     filter: (structure: StructureTower) => {
  //       return structure.structureType === STRUCTURE_TOWER;
  //     },
  //   });

  //   const ids = targets.map((targets) => targets.id);
  //   Memory.cache.towers[room.name] = ids;
  // }

  // cacheExtensions(room: Room): void {
  //   if (!Memory.cache.extensions[room.name]) {
  //     Memory.cache.extensions[room.name] = [];
  //   }

  //   const targets = room.find(FIND_STRUCTURES, {
  //     filter: (structure: StructureExtension) => {
  //       return structure.structureType === STRUCTURE_EXTENSION;
  //     },
  //   });

  //   const ids = targets.map((targets) => targets.id);
  //   Memory.cache.extensions[room.name] = ids;
  // }

  // cacheWalls(room: Room): void {
  //   if (!Memory.cache.walls[room.name]) {
  //     Memory.cache.walls[room.name] = [];
  //   }

  //   const targets = room.find(FIND_STRUCTURES, {
  //     filter: (structure: StructureWall) => {
  //       return structure.structureType === STRUCTURE_WALL;
  //     },
  //   });

  //   const ids = targets.map((targets) => targets.id);
  //   Memory.cache.walls[room.name] = ids;
  // }

  // cacheRamparts(room: Room): void {
  //   if (!Memory.cache.ramparts[room.name]) {
  //     Memory.cache.ramparts[room.name] = [];
  //   }

  //   const targets = room.find(FIND_STRUCTURES, {
  //     filter: (structure: StructureRampart) => {
  //       return structure.structureType === STRUCTURE_RAMPART;
  //     },
  //   });

  //   const ids = targets.map((targets) => targets.id);
  //   Memory.cache.ramparts[room.name] = ids;
  // }

  cacheSources(room: Room): void {
    this.cacheStructures(room, STRUCTURE_CONTAINER, "sources");
  }

  cacheStorages(room: Room): void {
    this.cacheStructures(room, STRUCTURE_STORAGE, "storages");
  }

  cacheContainers(room: Room): void {
    this.cacheStructures(room, STRUCTURE_CONTAINER, "containers");
  }

  cacheSpawns(room: Room): void {
    this.cacheStructures(room, STRUCTURE_SPAWN, "spawns");
  }

  cacheTowers(room: Room): void {
    this.cacheStructures(room, STRUCTURE_TOWER, "towers");
  }

  cacheExtensions(room: Room): void {
    this.cacheStructures(room, STRUCTURE_EXTENSION, "extensions");
  }

  cacheWalls(room: Room): void {
    this.cacheStructures(room, STRUCTURE_WALL, "walls");
  }

  cacheRamparts(room: Room): void {
    this.cacheStructures(room, STRUCTURE_RAMPART, "ramparts");
  }

  getFromCache<T extends _HasId>(ids: Id<T>[]): (T | null)[] | null {
    try {
      const objects = ids.map((id) => Game.getObjectById(id));

      if (objects.some((obj) => obj === null)) {
        return null;
      }

      return objects;
    } catch (error: any) {
      console.log(`Error in getFromCache: ${error.message}`);
      return [];
    }
  }

  findSpawns(room: Room): StructureSpawn[] {
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
          return spawns.filter(
            (spawn): spawn is StructureSpawn => spawn !== null
          );
        } else {
          this.cacheSpawns(room);
        }
      }

      return room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return structure.structureType === STRUCTURE_SPAWN;
        },
      });
    } catch (error: any) {
      console.log(`Error in findSpawns: ${error.message}`);

      return room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return structure.structureType === STRUCTURE_SPAWN;
        },
      });
    }
  }

  findTowers(room: Room): StructureTower[] {
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
          return targets.filter(
            (target): target is StructureTower => target !== null
          );
        } else {
          this.cacheTowers(room);
        }
      }

      return room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return structure.structureType === STRUCTURE_TOWER;
        },
      });
    } catch (error: any) {
      console.log(`Error in findTowers: ${error.message}`);

      return room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return structure.structureType === STRUCTURE_TOWER;
        },
      });
    }
  }

  findExtensions(room: Room): StructureExtension[] {
    try {
      this.initCacheIfNotExist();
      if (!Memory.cache.extensions) {
        Memory.cache.extensions = {};
      }

      if (!Memory.cache.extensions[room.name]) {
        this.cacheExtensions(room);
      }

      const cachedIds = Memory.cache.towers[room.name];

      if (cachedIds && cachedIds.length > 0) {
        const targets = this.getFromCache(cachedIds);

        if (targets) {
          return targets.filter(
            (target): target is StructureExtension => target !== null
          );
        } else {
          this.cacheTowers(room);
        }
      }

      return room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return structure.structureType === STRUCTURE_EXTENSION;
        },
      });
    } catch (error: any) {
      console.log(`Error in findExtensions: ${error.message}`);

      return room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return structure.structureType === STRUCTURE_EXTENSION;
        },
      });
    }
  }

  findWalls(room: Room): StructureWall[] {
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
          return targets.filter(
            (target): target is StructureWall => target !== null
          );
        } else {
          this.cacheWalls(room);
        }
      }

      return room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return structure.structureType === STRUCTURE_WALL;
        },
      });
    } catch (error: any) {
      console.log(`Error in findWalls: ${error.message}`);

      return room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return structure.structureType === STRUCTURE_WALL;
        },
      });
    }
  }

  findRamparts(room: Room): StructureRampart[] {
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
          return targets.filter(
            (target): target is StructureRampart => target !== null
          );
        } else {
          this.cacheRamparts(room);
        }
      }

      return room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return structure.structureType === STRUCTURE_RAMPART;
        },
      });
    } catch (error: any) {
      console.log(`Error in findRamparts: ${error.message}`);

      return room.find(FIND_STRUCTURES, {
        filter: (structure: AnyStructure) => {
          return structure.structureType === STRUCTURE_RAMPART;
        },
      });
    }
  }

  findSources(room: Room): Source[] {
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
        const sources = this.getFromCache<Source>(cachedIds as any);

        if (sources) {
          const availableSources = sources.filter(
            (source): source is Source => source !== null && source.energy > 0
          );
          if (availableSources.length > 0) {
            return availableSources;
          } else {
            return [];
          }
        } else {
          this.cacheSources(room);
        }
      }

      // Maybe there is no cache, let's do it in an old manner.
      return room.find(FIND_SOURCES, {
        filter: (source) => source.energy > 0,
      });
    } catch (error: any) {
      console.log(`Error in findSources: ${error.message}`);
      return [];
    }
  }

  findDroppedResources(creep: Creep): Resource[] {
    console.log("FIND: Resource");
    return creep.room.find(FIND_DROPPED_RESOURCES, {
      filter: (resource) => resource.resourceType === RESOURCE_ENERGY,
    });
  }

  findStorages(creep: Creep): StructureStorage[] {
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
          const availableStructures = storages.filter(
            (structure: any): structure is StructureStorage =>
              structure.store[RESOURCE_ENERGY] >= creep.store.getFreeCapacity()
          );
          if (availableStructures.length > 0) {
            return availableStructures;
          } else {
            return [];
          }
        } else {
          this.cacheStorages(creep.room);
        }
      }

      return creep.room.find(FIND_STRUCTURES, {
        filter: (structure) =>
          structure.structureType === STRUCTURE_STORAGE &&
          structure.store[RESOURCE_ENERGY] >= creep.store.getFreeCapacity(),
      });
    } catch (error: any) {
      console.log(`Error in findStorages: ${error.message}`);
      return [];
    }
  }

  findContainers(creep: Creep): StructureContainer[] {
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
          const availableStructures = containers.filter(
            (structure: any): structure is StructureContainer =>
              structure.store[RESOURCE_ENERGY] > 0
          );
          if (availableStructures.length > 0) {
            return availableStructures;
          } else {
            return [];
          }
        } else {
          this.cacheContainers(creep.room);
        }
      }

      return creep.room.find(FIND_STRUCTURES, {
        filter: (structure) =>
          structure.structureType === STRUCTURE_CONTAINER &&
          structure.store[RESOURCE_ENERGY] > 0,
      });
    } catch (error: any) {
      console.log(`Error in findContainers: ${error.message}`);
      return [];
    }
  }

  private initCacheIfNotExist(): void {
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
      };
    }
  }

  private cacheStructures(
    room: Room,
    structureType: StructureConstant,
    cacheKey: string
  ): void {
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
