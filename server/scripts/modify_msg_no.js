const db = require('../config/db');

async function migrate() {
    try {
        console.log('Modifying msg_no column to BIGINT...');
        await db.query(`
      ALTER TABLE messages
      MODIFY COLUMN msg_no BIGINT NULL;
    `);
        console.log('Migration successful!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
