const mysql = require("mysql2/promise");

// A connection pool keeps a set of reusable connections open instead of
// opening/closing one per request. Opening a TCP + auth handshake on every
// request is slow and exhausts the database's connection limit under load.
// The pool hands out an idle connection and reclaims it when the query is done.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
