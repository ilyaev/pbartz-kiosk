import moment from "moment-timezone";
import SpotifyWebApi from "spotify-web-api-node";
import sqlite3 from "sqlite3";

const dbFilePath = process.env.DB_FILE_PATH || "db.sqlite";

type PromptRecord = {
  prompt: string;
  response: string;
  category: string;
  key: string;
  id: number;
  updated: string;
};

type SpotifySession = {
  access_token: string;
  refresh_token: string;
  expires: string;
  profile: string;
};

export default class DatabaseManager {
  private static instance: DatabaseManager;
  private db: sqlite3.Database;

  private constructor() {
    this.db = new sqlite3.Database(dbFilePath, (err) => {
      if (err) {
        console.error("Could not connect to database", err);
      } else {
        this.initilizeDatabase();
        console.log("Connected to database: " + dbFilePath);
      }
    });
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initilizeDatabase(): Promise<void> {
    const queries = [
      `
        CREATE TABLE IF NOT EXISTS prompt_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          prompt TEXT NOT NULL,
          response TEXT NOT NULL,
          category VARCHAR(256),
          key VARCHAR(256) NOT NULL,
          updated DATETIME
        )
      `,
      `
        CREATE TABLE IF NOT EXISTS spotify_session (
          id INTEGER PRIMARY KEY,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires DATETIME NOT NULL,
          profile TEXT NOT NULL
        )
      `,
    ];

    for (const query of queries) {
      await new Promise<void>((resolve, reject) => {
        this.db.run(query, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  public getRandomPrompt(category: string): Promise<PromptRecord | null> {
    return new Promise((resolve) => {
      const query = `SELECT * FROM prompt_cache WHERE category = ? ORDER BY RANDOM() LIMIT 1`;
      this.db.get(query, [category], (err, row) => {
        if (err) {
          resolve(null);
        } else {
          resolve(row as PromptRecord);
        }
      });
    });
  }

  public getPrompt(
    fields: Partial<PromptRecord>
  ): Promise<PromptRecord | null> {
    return new Promise((resolve, reject) => {
      const whereClause = Object.keys(fields)
        .map((key) => `${key} = ?`)
        .join(" AND ");
      const values = Object.values(fields);

      const query = `SELECT * FROM prompt_cache WHERE ${whereClause} order by id desc limit 1`;
      this.db.get(query, values, (err, row) => {
        if (err) {
          resolve(null);
        } else {
          resolve(row as PromptRecord);
        }
      });
    });
  }

  public async getSpotifyAccessToken(): Promise<SpotifySession> {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM spotify_session WHERE id = 1`;
      this.db.get(query, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as SpotifySession);
        }
      });
    });
  }

  public saveSpotifySession(
    accessToken: string,
    refreshToken: string,
    expires_in: number,
    profile: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const query = `REPLACE INTO spotify_session (id, access_token, refresh_token, expires, profile) VALUES (1, ?, ?, ?, ?)`;
      this.db.run(
        query,
        [
          accessToken,
          refreshToken,
          moment().add(expires_in, "second").format("YYYY-MM-DD HH:mm:ss"),
          profile,
        ],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  public savePrompt(record: { [key: string]: any }): Promise<void> {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(record).join(", ");
      const placeholders = Object.keys(record)
        .map(() => "?")
        .join(", ");
      const values = Object.values(record);

      const query = `REPLACE INTO prompt_cache (${columns}) VALUES (${placeholders})`;

      this.db.run(query, values, (err) => {
        if (err) {
          reject(err);
        } else {
          if (record.key && record.category && record.category === "finance") {
            const updateQuery = `UPDATE prompt_cache SET updated = ? WHERE key = ? AND category = ?`;
            this.db.run(
              updateQuery,
              [
                moment().format("YYYY-MM-DD HH:mm:ss"),
                record.key,
                record.category,
              ],
              (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          } else {
            resolve();
          }
        }
      });
    });
  }
}
