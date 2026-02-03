import Dexie, {type Table } from "dexie";
import type { Item } from "./types";

class BewerbungsDB extends Dexie {
  items!: Table<Item, string>;

  constructor() {
    super("bewerbung_board_db");
    this.version(1).stores({
      items: "id, column, order, dateISO, platform, name",
    });
  }
}

export const db = new BewerbungsDB();
