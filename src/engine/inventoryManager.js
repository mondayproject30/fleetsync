/**
 * Inventory Management Module (IMS)
 * - Tracks products, stock levels, shelf assignments
 * - Order creation, item reservation, inventory depletion upon pick
 * - Auto-replenishment simulation
 */

import { SHELVES } from './warehouseLayout.js';

export class InventoryManager {
  constructor(onEventLog) {
    this.log = onEventLog || console.log;
    this.inventory = new Map();
    this.initInventory();
  }

  initInventory() {
    this.inventory.clear();
    SHELVES.forEach(shelf => {
      const shelfStock = shelf.items.map(name => ({
        name,
        shelfId: shelf.id,
        shelfNum: shelf.num,
        stock: 50,
        reserved: 0
      }));
      this.inventory.set(shelf.id, shelfStock);
    });
  }

  getShelfItems(shelfId) {
    return this.inventory.get(shelfId) || [];
  }

  getRandomItemForShelf(shelfId) {
    const items = this.getShelfItems(shelfId);
    if (!items.length) return 'Industrial Part';
    return items[Math.floor(Math.random() * items.length)].name;
  }

  findShelfByItem(itemName) {
    for (const [shelfId, items] of this.inventory.entries()) {
      if (items.some(i => i.name.toLowerCase() === itemName.toLowerCase())) {
        return SHELVES.find(s => s.id === shelfId);
      }
    }
    return null;
  }

  reserveItem(shelfId, itemName) {
    const items = this.inventory.get(shelfId);
    if (!items) return false;
    const item = items.find(i => i.name === itemName);
    if (item && item.stock > item.reserved) {
      item.reserved++;
      return true;
    }
    return false;
  }

  fulfillPick(shelfId, itemName) {
    const items = this.inventory.get(shelfId);
    if (!items) return false;
    const item = items.find(i => i.name === itemName);
    if (item) {
      if (item.reserved > 0) item.reserved--;
      if (item.stock > 0) item.stock--;
      this.log(`[INVENTORY] Item '${itemName}' picked from Shelf ${item.shelfNum}. Remaining stock: ${item.stock}.`, 'info');
      // Auto-replenish if stock runs low
      if (item.stock < 5) {
        item.stock += 30;
        this.log(`[IMS REPLENISH] Stock replenishment triggered for '${itemName}' at Shelf ${item.shelfNum}. Stock restored to ${item.stock}.`, 'success');
      }
      return true;
    }
    return false;
  }

  getAllStockSummary() {
    const summary = [];
    this.inventory.forEach((items, shelfId) => {
      const shelf = SHELVES.find(s => s.id === shelfId);
      summary.push({
        shelfId,
        shelfNum: shelf ? shelf.num : 0,
        shelfName: shelf ? shelf.name : shelfId,
        totalStock: items.reduce((sum, i) => sum + i.stock, 0),
        items
      });
    });
    return summary;
  }

  reset() {
    this.initInventory();
  }
}
