const sql = require('mssql');

const remoteConfig = {
  user: process.env.SQL_USER || "profit",
  password: process.env.SQL_PASSWORD || "profit",
  server: process.env.SQL_SERVER || "192.168.4.20",
  port: parseInt(process.env.SQL_PORT) || 1433,
  database: process.env.SQL_DATABASE || "CRISTM25",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 30000,
};

const getConnection = async () => {
    try {
        const pool = await sql.connect(remoteConfig);
        return pool;
    } catch (err) {
        console.error("Database connection failed: ", err);
        throw err;
    }
};

module.exports = {
    getConnection,
    sql
};