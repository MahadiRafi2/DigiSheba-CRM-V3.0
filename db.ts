import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'futureba_DigiShebaCRMUser';
const dbPassword = process.env.DB_PASSWORD || 'SmjZB2.wD7)Q1G&T';
const dbName = process.env.DB_NAME || 'futureba_DigiShebaCRM';

// Create connection without database to ensure it exists
async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.end();
}

// Global pool variable
let pool: mysql.Pool;

try {
  // We'll initialize the pool later to ensure DB exists
  // But for module export we need something.
  // Actually, let's just initialize it here and hope for the best, 
  // or use a wrapper.
} catch (e) {}

pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper to ensure DB exists before first use if needed
export const initDB = ensureDatabase;

export default pool;
