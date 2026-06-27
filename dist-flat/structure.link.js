"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkManager = void 0;
const role_link_manager_1 = require("./role.link-manager");
class LinkManager {
    constructor() {
        this.roleLinkManager = new role_link_manager_1.RoleLinkManager();
        this.storageLinkId = null;
    }
    work(link) {
        this.storageLinkId = this.roleLinkManager.getStorageLinkId(link.room);
        if (!this.storageLinkId && link.id === this.storageLinkId) {
            return;
        }
        // Проверка на полную заполненность линка
        if (link.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            const storageLink = Game.getObjectById(this.storageLinkId);
            if (storageLink &&
                storageLink.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                link.transferEnergy(storageLink);
            }
        }
    }
}
exports.LinkManager = LinkManager;
