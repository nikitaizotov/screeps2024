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
  cacheSources(room: Room): void {
    if (!Memory.cache.sources[room.name]) {
      Memory.cache.sources[room.name] = [];
    }

    const sources = room.find(FIND_SOURCES);
    const sourceIds = sources.map((source) => source.id);

    Memory.cache.sources[room.name] = sourceIds;
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

  findSources(creep: Creep): Source[] {
    try {
      this.initCacheIfNotExist();

      if (!Memory.cache.sources[creep.room.name]) {
        Memory.cache.sources[creep.room.name] = [];
      }

      // Try to get from the cache.
      const cachedIds = Memory.cache.sources[creep.room.name];

      if (cachedIds && cachedIds.length > 0) {
        const sources = this.getFromCache(cachedIds);

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
          this.cacheSources(creep.room);
        }
      }

      // Maybe there is no cache, let's do it in an old manner.
      return creep.room.find(FIND_SOURCES, {
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
    console.log("FIND: StructureStorage");
    return creep.room.find(FIND_STRUCTURES, {
      filter: (structure) =>
        structure.structureType === STRUCTURE_STORAGE &&
        structure.store[RESOURCE_ENERGY] >= creep.store.getFreeCapacity(),
    });
  }

  findContainers(creep: Creep): StructureContainer[] {
    console.log("FIND: StructureContainer");
    return creep.room.find(FIND_STRUCTURES, {
      filter: (structure) =>
        structure.structureType === STRUCTURE_CONTAINER &&
        structure.store[RESOURCE_ENERGY] > 0,
    });
  }

  private initCacheIfNotExist(): void {
    if (!Memory.cache) {
      Memory.cache = {
        sources: {},
      };
    }
  }
}
