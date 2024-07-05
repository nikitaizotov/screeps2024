import { RoleLinkManager } from "../roles/room-creeps/link-manager/role.link-manager";

export class LinkManager {
  roleLinkManager = new RoleLinkManager();
  storageLinkId: string | null = null;

  work(link: StructureLink): void {
    this.storageLinkId = this.roleLinkManager.getStorageLinkId(link.room);

    if (!this.storageLinkId && link.id === this.storageLinkId) {
      return;
    }

    // Проверка на полную заполненность линка
    if (link.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      const storageLink = Game.getObjectById(
        this.storageLinkId as any
      ) as StructureLink;

      if (
        storageLink &&
        storageLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      ) {
        link.transferEnergy(storageLink);
      }
    }
  }
}
