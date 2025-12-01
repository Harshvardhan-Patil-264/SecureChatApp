// Test SMTP Email Configuration
// Run this to verify your email settings work

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('📧 Testing SMTP Configuration...\n');

    console.log('Configuration:');
    console.log(`Host: ${process.env.EMAIL_HOST}`);
    console.log(`Port: ${process.env.EMAIL_PORT}`);
    console.log(`User: ${process.env.EMAIL_USER}`);
    console.log(`Pass: ${process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'NOT SET'}\n`);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        // Verify connection
        console.log('🔌 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified!\n');

        // Send test email
        console.log('📤 Sending test email to harsh264patil@gmail.com...');
        const info = await transporter.sendMail({
            from: `"ChatApp Test" <${process.env.EMAIL_USER}>`,
            to: 'harsh264patil@gmail.com',
            subject: '✅ ChatApp SMTP Test - Success!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #00c676;">🎉 SMTP Configuration Successful!</h2>
                    <p>Your ChatApp email system is working correctly.</p>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Configuration Details:</h3>
                        <ul>
                            <li><strong>Host:</strong> ${process.env.EMAIL_HOST}</li>
                            <li><strong>Port:</strong> ${process.env.EMAIL_PORT}</li>
                            <li><strong>User:</strong> ${process.env.EMAIL_USER}</li>
                            <li><strong>Status:</strong> ✅ Connected</li>
                        </ul>
                    </div>
                    
                    <p>You can now use Ultra Secure Chat lockdown feature with email backups!</p>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        This is a test email from ChatApp. If you received this, your SMTP configuration is correct.
                    </p>
                </div>
            `
        });

        console.log('✅ Test email sent successfully!');
        console.log(`📬 Message ID: ${info.messageId}`);
        console.log('\n🎉 SMTP is working! Check your inbox at harsh264patil@gmail.com\n');

    } catch (error) {
        console.error('❌ SMTP Test Failed:\n');
        console.error(`Error: ${error.message}\n`);

        if (error.code === 'EAUTH') {
            console.log('💡 Authentication Failed - Please check:');
            console.log('   1. Email and password are correct in .env file');
            console.log('   2. If using Gmail, you need an App Password:');
            console.log('      → Go to https://myaccount.google.com/apppasswords');
            console.log('      → Generate app password for "Mail"');
            console.log('      → Use that password in EMAIL_PASS (remove spaces)\n');
        } else if (error.code === 'ECONNECTION') {
            console.log('💡 Connection Failed - Please check:');
            console.log('   1. Internet connection is active');
            console.log('   2. SMTP host and port are correct');
            console.log('   3. Firewall is not blocking port 587\n');
        }

        process.exit(1);
    }
}

testEmail();
