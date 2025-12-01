const db = require('../config/db');

async function migrate() {
    try {
        console.log('Adding msg_no column to messages table...');
        await db.query(`
      ALTER TABLE messages
      ADD COLUMN msg_no BIGINT NULL AFTER content;
    `);
        console.log('Migration successful!');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column msg_no already exists.');
            process.exit(0);
        }
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
