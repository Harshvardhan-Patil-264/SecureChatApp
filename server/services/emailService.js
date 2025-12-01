/**
 * services/emailService.js
 * Send security alert emails for Ultra Secure Chat
 */

const nodemailer = require('nodemailer');

/**
 * Create email transporter
 * Configure with your email service credentials
 */
function createTransporter() {
    // For development: Use ethereal.email (fake SMTP)
    // For production: Use Gmail, SendGrid, or your SMTP server

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASS || 'your-app-password'
        }
    });
}

/**
 * Get HTML email template for security alert
 * @param {number} sessionId - Session ID
 * @param {string} userA - First user
 * @param {string} userB - Second user
 * @returns {string} HTML email content
 */
function getSecurityAlertTemplate(sessionId, userA, userB) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5; 
            padding: 20px; 
            margin: 0;
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 12px; 
            max-width: 600px; 
            margin: 0 auto;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
            color: white; 
            padding: 30px; 
            border-radius: 12px 12px 0 0; 
            text-align: center;
            margin: -30px -30px 30px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header .icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .content { 
            padding: 20px 0;
            color: #333;
            line-height: 1.6;
        }
        .warning { 
            background: #fff3cd; 
            border-left: 4px solid #ffc107; 
            padding: 20px; 
            margin: 20px 0;
            border-radius: 4px;
        }
        .warning strong {
            color: #856404;
            display: block;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .warning ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .warning li {
            margin: 8px 0;
            color: #856404;
        }
        .info-box {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box h3 {
            margin: 0 0 10px 0;
            color: #1976d2;
            font-size: 18px;
        }
        .info-box p {
            margin: 5px 0;
            color: #0d47a1;
        }
        .steps {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .steps h3 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 18px;
        }
        .steps ol {
            margin: 0;
            padding-left: 20px;
        }
        .steps li {
            margin: 10px 0;
            color: #555;
        }
        .button { 
            background: #1976d2; 
            color: white; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block; 
            margin-top: 20px;
            font-weight: 500;
        }
        .button:hover {
            background: #1565c0;
        }
        .footer { 
            text-align: center; 
            color: #999; 
            font-size: 13px; 
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .footer p {
            margin: 5px 0;
        }
        .session-info {
            background: #fafafa;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">🚨</div>
            <h1>SecureChat Security Alert</h1>
        </div>
        <div class="content">
            <h2>Your Passphrase May Be Compromised</h2>
            
            <p>Your Ultra Secure Chat session detected <strong>3 unauthorized access attempts</strong>.</p>
            
            <div class="warning">
                <strong>⚠️ Security Measures Activated:</strong>
                <ul>
                    <li>Session has been locked immediately</li>
                    <li>Messages have been securely backed up</li>
                    <li>All data wiped from server</li>
                    <li>Decoy chat shown to attacker</li>
                </ul>
            </div>
            
            <div class="info-box">
                <h3>📦 Encrypted Backup</h3>
                <p>Your messages have been exported to an encrypted ZIP file (attached).</p>
                <p><strong>ZIP Password:</strong> Your original passphrase</p>
            </div>

            <div class="session-info">
                <strong>Session Details:</strong><br>
                Session ID: ${sessionId}<br>
                Participants: ${userA} ↔ ${userB}<br>
                Locked At: ${new Date().toISOString()}<br>
            </div>
            
            <div class="steps">
                <h3>🔐 Next Steps</h3>
                <ol>
                    <li>Download the attached ZIP file</li>
                    <li>Extract using your original passphrase</li>
                    <li>Review messages for any suspicious activity</li>
                    <li>Create a new secure chat with a different passphrase</li>
                    <li>Notify your contact through a secure channel</li>
                </ol>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong>
                Do not reuse the compromised passphrase. Change it immediately and ensure you share the new one securely (in person or through an encrypted channel).
            </div>
            
            <a href="https://securechat.app/security-guide" class="button">View Security Guide</a>
        </div>
        <div class="footer">
            <p>This is an automated security alert from SecureChat.</p>
            <p>Session ID: ${sessionId} | Timestamp: ${new Date().toISOString()}</p>
            <p>If you did not initiate this session, please contact support immediately.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Send security alert email with encrypted ZIP attachment
 * @param {string} recipientEmail - Recipient email address
 * @param {string} recipientName - Recipient name
 * @param {Buffer} zipBuffer - Encrypted ZIP file buffer
 * @param {number} sessionId - Session ID
 * @param {string} userA - First user
 * @param {string} userB - Second user
 * @returns {Promise<object>} Email send result
 */
async function sendSecurityEmail(recipientEmail, recipientName, zipBuffer, sessionId, userA, userB) {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"SecureChat Security" <${process.env.EMAIL_USER || 'security@securechat.app'}>`,
            to: recipientEmail,
            subject: '[SecureChat Alert] Your Passphrase May Be Compromised',
            html: getSecurityAlertTemplate(sessionId, userA, userB),
            attachments: [
                {
                    filename: `secure_chat_${sessionId}.zip`,
                    content: zipBuffer,
                    contentType: 'application/zip'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Security email sent to ${recipientEmail}: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId,
            recipient: recipientEmail
        };

    } catch (error) {
        console.error(`❌ Failed to send email to ${recipientEmail}:`, error);
        throw error;
    }
}

/**
 * Send test email (for configuration testing)
 * @param {string} recipientEmail - Test recipient
 * @returns {Promise<object>} Result
 */
async function sendTestEmail(recipientEmail) {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"SecureChat" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: 'SecureChat Email Configuration Test',
            html: `
                <h2>✅ Email Configuration Successful!</h2>
                <p>Your SecureChat email service is properly configured.</p>
                <p>Timestamp: ${new Date().toISOString()}</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent:', info.messageId);

        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Test email failed:', error);
        throw error;
    }
}

module.exports = {
    sendSecurityEmail,
    sendTestEmail,
    getSecurityAlertTemplate
};
