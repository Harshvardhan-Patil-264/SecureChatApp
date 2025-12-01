const db = require('../config/db');

async function migrate() {
    try {
        console.log('Adding signature fields to database...');

        // Add signature_key_public to users table
        try {
            await db.query(`
        ALTER TABLE users
        ADD COLUMN signature_key_public TEXT NULL;
      `);
            console.log('✓ Added signature_key_public to users table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️  signature_key_public already exists');
            } else {
                throw err;
            }
        }

        // Add signature and verified fields to messages table
        try {
            await db.query(`
        ALTER TABLE messages
        ADD COLUMN signature TEXT NULL;
      `);
            console.log('✓ Added signature to messages table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️  signature already exists');
            } else {
                throw err;
            }
        }

        try {
            await db.query(`
        ALTER TABLE messages
        ADD COLUMN verified BOOLEAN DEFAULT FALSE;
      `);
            console.log('✓ Added verified to messages table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️  verified already exists');
            } else {
                throw err;
            }
        }

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
