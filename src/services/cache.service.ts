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
}
