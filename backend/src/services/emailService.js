const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initializes and returns the nodemailer transporter dynamically
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

  console.log('[EmailService] Transporter configuration diagnostic:');
  console.log(`- EMAIL_HOST: ${host || 'Not set'}`);
  console.log(`- EMAIL_PORT: ${port || 'Not set'}`);
  console.log(`- EMAIL_USER: ${user || 'Not set'}`);
  console.log(`- EMAIL_PASS/PASSWORD: ${pass ? 'PRESENT (masked)' : 'Not set'}`);

  if (host && port) {
    console.log(`[EmailService] Creating custom SMTP transporter for ${host}:${port}...`);
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port === '465', // true for 465, false for 587 or other ports
      auth: user && pass ? { user, pass } : undefined,
    });
  } else if (user && pass && !user.includes('your_email_sender') && user.trim() !== '') {
    console.log(`[EmailService] Creating Gmail transporter for ${user}...`);
    transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: { user, pass },
    });
  } else {
    // Ethereal Email fallback for testing
    console.log('[EmailService] SMTP credentials missing or placeholder. Initializing Ethereal Test Account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log('[EmailService] Ethereal test account created successfully:');
      console.log(`- Host: ${testAccount.smtp.host}`);
      console.log(`- Port: ${testAccount.smtp.port}`);
      console.log(`- User: ${testAccount.user}`);
      
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      // Store test account credentials in environment for email sending context
      process.env.EMAIL_USER_MOCK = testAccount.user;
    } catch (testAccountError) {
      console.error('[EmailService] Failed to create Ethereal test account:', testAccountError);
      transporter = null;
    }
  }

  // Validate the SMTP connection
  if (transporter) {
    try {
      console.log('[EmailService] Verifying SMTP connection status...');
      await transporter.verify();
      console.log('[EmailService] SMTP Connection Verified: READY to send emails.');
    } catch (verifyError) {
      console.error('[EmailService] SMTP Verification Failed:', verifyError.message);
      // Don't set to null so that we can see the exact error when sendMail is called
    }
  }

  return transporter;
};

/**
 * Sends a notification email to a user.
 * @param {string} toEmail 
 * @param {string} subject 
 * @param {string} htmlContent 
 */
const sendEmail = async (toEmail, subject, htmlContent) => {
  console.log(`\n--- Email Send Attempt ---`);
  console.log(`To:      ${toEmail}`);
  console.log(`Subject: ${subject}`);

  const activeTransporter = await getTransporter();

  if (!activeTransporter) {
    console.log('====== [Mock Email Dispatch] ======');
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log('Content (HTML):');
    console.log(htmlContent);
    console.log('===================================');
    return { mock: true, message: 'Email logged to console (no active transporter)' };
  }

  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER_MOCK || process.env.EMAIL_USER || 'no-reply@civicresolve.gov';
  const mailOptions = {
    from: fromEmail.includes('<') ? fromEmail : `"Civic Resolve" <${fromEmail}>`,
    to: toEmail,
    subject: subject,
    html: htmlContent,
  };

  try {
    console.log(`[EmailService] Sending via SMTP...`);
    const info = await activeTransporter.sendMail(mailOptions);
    
    console.log('[EmailService] SMTP Response:');
    console.log(`- Message ID: ${info.messageId}`);
    console.log(`- Envelope: ${JSON.stringify(info.envelope)}`);
    console.log(`- Accepted: ${JSON.stringify(info.accepted)}`);
    console.log(`- Rejected: ${JSON.stringify(info.rejected)}`);
    
    // Ethereal specific test message link
    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log(`- Ethereal Web Preview URL: ${testUrl}`);
      info.testUrl = testUrl;
    }
    
    console.log(`[EmailService] Email sent successfully.`);
    return info;
  } catch (error) {
    console.error('[EmailService] Nodemailer Service Error sending email:', error.message);
    throw error;
  }
};

module.exports = {
  sendEmail,
  getTransporter,
};
