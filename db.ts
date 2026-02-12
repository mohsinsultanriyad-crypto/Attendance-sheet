
import Dexie, { Table } from 'dexie';
import { Worker, AttendanceEntry } from './types';

/**
 * AttendanceDatabase handles the local IndexedDB storage using Dexie.
 * We extend Dexie to provide type safety for our tables.
 */
export class AttendanceDatabase extends Dexie {
  workers!: Table<Worker>;
  entries!: Table<AttendanceEntry>;

  constructor() {
    super('AttendanceDB');
  }
}

// Initialize the database instance
export const db = new AttendanceDatabase();

// Define the schema on the instance to ensure the 'version' method is correctly recognized 
// by the TypeScript compiler and to avoid potential inheritance-related property resolution issues 
// within the constructor. Calling .stores() automatically initializes the table properties on the instance.
db.version(1).stores({
  workers: '++id, name, status',
  entries: '++id, date, workerId, [workerId+date]' // Unique index for worker+date via logic
});
