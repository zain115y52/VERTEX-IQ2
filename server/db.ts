import { Pool } from "pg";
import { PostgresDB } from "./pgStore.js";

// Make sure we have a DB_HOST, default to localhost if not found for local testing
const dbHost = process.env.DB_HOST || "/cloudsql/VERTEX-IQ2:europe-west1:vertex-db";
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432;

// Check if socket path is used for Cloud SQL
const isSocket = dbHost.startsWith("/cloudsql");

export const pool = new Pool({
  host: dbHost,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "postgres",
  port: dbPort,
  ssl: !isSocket && dbHost !== "localhost" 
        ? { rejectUnauthorized: false } 
        : false,
});

pool.on("error", (err: any, client: any) => {
  console.error("Unexpected error on idle client", err);
});

export const db: PostgresDB = new PostgresDB();

export async function initDb() {
  try {
    console.log(`Connecting to PostgreSQL database at ${dbHost}...`);
    // Explicitly test the connection first
    const client = await pool.connect();
    console.log("Database connection successful!");
    client.release();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        "limit" INTEGER,
        status VARCHAR(50),
        server_id UUID,
        token_version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;

      CREATE TABLE IF NOT EXISTS servers (
        id UUID PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        ip VARCHAR(255) UNIQUE NOT NULL,
        port INTEGER NOT NULL,
        username VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        panel_password_enc TEXT,
        panel_url VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        inbound_id INTEGER NOT NULL DEFAULT 1,
        "limit" INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE servers ADD COLUMN IF NOT EXISTS panel_password_enc TEXT;

      CREATE TABLE IF NOT EXISTS vpn_users (
        id UUID PRIMARY KEY,
        server_id UUID NOT NULL,
        client_id UUID NOT NULL,
        username VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        quota_gb INTEGER NOT NULL,
        days INTEGER NOT NULL,
        usage_gb INTEGER NOT NULL DEFAULT 0,
        is_online BOOLEAN DEFAULT FALSE,
        vless_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS security_logs (
        id UUID PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        user_id UUID,
        username VARCHAR(255),
        ip_address VARCHAR(255),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default admin if no users exist
    const res = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(res.rows[0].count) === 0) {
      console.log("Inserting default admin user...");
      const bcrypt = await import("bcryptjs");
      const adminHash = bcrypt.default.hashSync("admin", 10);
      await pool.query(
        "INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)",
        ["admin-1", "admin", adminHash, "admin"]
      );
      console.log("Default admin user created successfully.");
    }
  } catch (error: any) {
    console.error("=========================================");
    console.error("Database connection/initialization failed:");
    console.error(error.message);
    if (isSocket) {
      console.error("NOTE: The application format requires Cloud Run to be configured with the Cloud SQL connection.");
      console.error("If running locally, set DB_HOST to an IP address instead of /cloudsql/...");
    }
    console.error("=========================================");
    throw error; // Rethrow to stop server if we enforce production only mode and DB is required
  }
}

