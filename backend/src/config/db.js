const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'DB_Project',
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
        enableArithAbort: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

// Handle Authentication Type
if (process.env.USE_WINDOWS_AUTH === 'true') {
    config.authentication = {
        type: 'ntlm',
        options: {
            domain: process.env.DB_DOMAIN || '', // Try leaving empty or use your computer name
            userName: process.env.DB_USER,      // Your Windows Username
            password: process.env.DB_PASSWORD,  // Your Windows Password
        }
    };
    // For local dev, trustedConnection and NTLM work together
    config.options.trustedConnection = true;
} else {
    config.user = process.env.DB_USER;
    config.password = process.env.DB_PASSWORD;
}



// Singleton pool — shared across all routes
let pool = null;

async function getPool() {
    if (pool) return pool;
    try {
        pool = await new sql.ConnectionPool(config).connect();
        console.log('✅  SQL Server connected —', process.env.DB_NAME);
        pool.on('error', (err) => {
            console.error('❌  Pool error:', err.message);
            pool = null;
        });
        return pool;
    } catch (err) {
        console.error('❌  DB connection failed:', err.message);
        throw err;
    }
}

// Helper — run a parameterised query and return rows
// Usage: query('SELECT * FROM [User] WHERE userID = @id', { id: { type: sql.Int, val: 1 } })
async function query(sqlText, params = {}) {
    const p = await getPool();
    const req = p.request();
    for (const [key, { type, val }] of Object.entries(params)) {
        req.input(key, type, val);
    }
    const result = await req.query(sqlText);
    return result.recordset;
}

// Helper — execute a stored procedure
// Usage: execSP('sp_AdmitPatient', { reportID: { type: sql.Int, val: 3 }, ... })
async function execSP(spName, params = {}, outputParams = {}) {
    const p = await getPool();
    const req = p.request();
    for (const [key, { type, val }] of Object.entries(params)) {
        req.input(key, type, val);
    }
    for (const [key, { type }] of Object.entries(outputParams)) {
        req.output(key, type);
    }
    const result = await req.execute(spName);
    return { recordset: result.recordset, output: result.output };
}

module.exports = { sql, getPool, query, execSP };