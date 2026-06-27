import { buildBody } from "./body.factory";
import { CrewRequest } from "./kernel.types";

/**
 * Demand-driven spawning: keeps each crew's population topped up. Builds a body
 * scaled to the room's currently-available energy and tags the creep with its
 * kernel assignment so the old roles ignore it and the executor can drive it.
 *
 * Spawns at most one creep per crew per call; if the spawn is busy or energy is
 * too low it simply waits for a later tick.
 */
export class KernelSpawner {
  maintainCrew(crew: CrewRequest): void {
    const room = Game.rooms[crew.roomName];
    if (!room) return;

    let alive = 0;
    for (const name in Game.creeps) {
      const kt = Game.creeps[name].memory.kernelTask;
      if (kt && kt.role === crew.role && kt.roomName === crew.roomName) {
        alive++;
      }
    }
    if (alive >= crew.count) return;

    const spawn = room.find(FIND_MY_SPAWNS).find((s) => !s.spawning);
    if (!spawn) return;

    const body = buildBody(crew.unitBody, room.energyAvailable);
    if (body.length === 0) return;

    spawn.spawnCreep(body, `${crew.role}_${Game.time}`, {
      memory: {
        kernelTask: {
          role: crew.role,
          kind: crew.taskKind,
          roomName: crew.roomName,
        },
      } as CreepMemory,
    });
  }
}
