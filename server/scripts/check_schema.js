const db = require('../config/db');

async function checkSchema() {
    try {
        const [rows] = await db.query('DESCRIBE messages');
        console.log(rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
