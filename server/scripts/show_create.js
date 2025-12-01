const db = require('../config/db');

async function showCreate() {
    try {
        const [rows] = await db.query('SHOW CREATE TABLE messages');
        console.log(rows[0]['Create Table']);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

showCreate();
