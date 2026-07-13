
import { createClient, Client } from "@libsql/client/web";
import { AppUser, UserRole } from "../types";

let dbInstance: Client | null = null;

const getDb = (): Client => {
  if (dbInstance) return dbInstance;

  let url = localStorage.getItem('sys_db_url');
  const authToken = localStorage.getItem('sys_db_token');

  if (!url || !authToken) {
    throw new Error("Database configuration missing");
  }

  // CORS Fix: Turso (LibSQL) requires HTTPS scheme in browser environments to handle CORS correctly.
  // The 'libsql://' protocol often triggers WebSocket or non-standard fetch behavior that gets blocked by CORS.
  if (url.startsWith("libsql://")) {
    url = url.replace("libsql://", "https://");
  }

  // Ensure no trailing slashes or weird formatting
  url = url.trim();

  dbInstance = createClient({
    url,
    authToken,
  });

  return dbInstance;
};

export const DbService = {
  isConfigured: (): boolean => {
      return !!localStorage.getItem('sys_db_url') && !!localStorage.getItem('sys_db_token');
  },

  // Initialize Tables
  init: async () => {
    try {
      const db = getDb();
      // Users Table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          pin TEXT NOT NULL,
          role TEXT NOT NULL,
          active INTEGER DEFAULT 1
        )
      `);

      // Store Data Table (Key-Value for optimization)
      // key: collection name (e.g., 'gold_items', 'gold_transactions')
      // data: JSON string
      // updated_at: timestamp for sync check
      await db.execute(`
        CREATE TABLE IF NOT EXISTS store_data (
          key TEXT PRIMARY KEY,
          data TEXT,
          updated_at INTEGER
        )
      `);
      
      console.log("Database initialized");
      return true;
    } catch (error) {
      console.error("DB Init Error:", error);
      return false;
    }
  },

  // Check if system is set up (has owners)
  hasOwner: async (): Promise<boolean> => {
    try {
      const db = getDb();
      const rs = await db.execute("SELECT count(*) as count FROM users WHERE role = 'OWNER'");
      return (rs.rows[0].count as number) > 0;
    } catch (e) {
      return false;
    }
  },

  // Authentication
  login: async (email: string, pin: string): Promise<AppUser | null> => {
    try {
      const db = getDb();
      const rs = await db.execute({
        sql: "SELECT * FROM users WHERE email = ? AND pin = ? AND active = 1",
        args: [email, pin]
      });
      
      if (rs.rows.length > 0) {
        const u = rs.rows[0];
        return {
          id: u.id as string,
          name: u.name as string,
          role: u.role as UserRole,
          pin: u.pin as string,
          active: Boolean(u.active),
          email: u.email as string
        } as AppUser;
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  registerUser: async (user: AppUser) => {
    try {
      const db = getDb();
      await db.execute({
        sql: "INSERT INTO users (id, name, email, pin, role, active) VALUES (?, ?, ?, ?, ?, ?)",
        args: [user.id, user.name, user.email || '', user.pin, user.role, user.active ? 1 : 0]
      });
      return true;
    } catch (e) {
      console.error("Register Error", e);
      return false;
    }
  },

  getUsers: async (): Promise<AppUser[]> => {
      try {
          const db = getDb();
          const rs = await db.execute("SELECT * FROM users");
          return rs.rows.map(u => ({
              id: u.id as string,
              name: u.name as string,
              role: u.role as UserRole,
              pin: u.pin as string,
              email: u.email as string,
              active: Boolean(u.active)
          }));
      } catch (e) { return []; }
  },

  deleteUser: async (id: string) => {
      const db = getDb();
      await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] });
  },

  // --- SMART SYNC ---
  
  // Push local changes to DB
  // Modified to return boolean for offline handling
  pushData: async (key: string, data: any): Promise<boolean> => {
    const timestamp = Date.now();
    const jsonStr = JSON.stringify(data);
    
    try {
      const db = getDb();
      await db.execute({
        sql: `INSERT INTO store_data (key, data, updated_at) VALUES (?, ?, ?) 
              ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
        args: [key, jsonStr, timestamp]
      });
      return true;
    } catch (e) {
      console.error("Sync Push Error (Likely Offline):", e);
      return false;
    }
  },

  // Check for updates (Low cost query)
  // Returns map of { key: timestamp }
  checkUpdates: async (): Promise<Record<string, number>> => {
    try {
      const db = getDb();
      const rs = await db.execute("SELECT key, updated_at FROM store_data");
      const updates: Record<string, number> = {};
      rs.rows.forEach(row => {
        updates[row.key as string] = row.updated_at as number;
      });
      return updates;
    } catch (e) {
      return {};
    }
  },

  // Pull specific data
  fetchData: async (key: string): Promise<any> => {
    try {
      const db = getDb();
      const rs = await db.execute({
        sql: "SELECT data FROM store_data WHERE key = ?",
        args: [key]
      });
      if (rs.rows.length > 0 && rs.rows[0].data) {
        return JSON.parse(rs.rows[0].data as string);
      }
      return null;
    } catch (e) {
      return null;
    }
  }
};
