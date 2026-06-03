require('dotenv').config();
const { getTransporter, sendEmail } = require('./src/services/emailService');

async function runEmailAudit() {
  console.log('============================================================');
  console.log('CIVIC RESOLVE - EMAIL SERVICE DIAGNOSTIC AUDIT');
  console.log('============================================================');

  try {
    // 1. Audit SMTP configurations
    console.log('\n--- STEP 1: SMTP CONFIGURATION AUDIT ---');
    console.log(`EMAIL_HOST:      ${process.env.EMAIL_HOST || '(not defined)'}`);
    console.log(`EMAIL_PORT:      ${process.env.EMAIL_PORT || '(not defined)'}`);
    console.log(`EMAIL_USER:      ${process.env.EMAIL_USER || '(not defined)'}`);
    console.log(`EMAIL_FROM:      ${process.env.EMAIL_FROM || '(not defined)'}`);
    console.log(`EMAIL_PASSWORD:  ${process.env.EMAIL_PASSWORD ? '[PRESENT]' : '(not defined)'}`);
    console.log(`EMAIL_PASS:      ${process.env.EMAIL_PASS ? '[PRESENT]' : '(not defined)'}`);

    // 2. Try obtaining transporter
    console.log('\n--- STEP 2: SMTP TRANSPORT CREATION & CONNECTION CHECK ---');
    const transporter = await getTransporter();
    if (!transporter) {
      console.log('❌ Transport creation failed (transporter is null).');
      process.exit(1);
    }
    console.log('✔ Transport created successfully.');

    // 3. Send test email
    console.log('\n--- STEP 3: MANUAL TEST EMAIL SEND ---');
    const testRecipient = 'test.recipient@civicresolve.gov';
    const testSubject = 'Civic Resolve - SMTP Connection Diagnostic Test';
    const testHtml = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Diagnostic Success</h2>
        <p>This is a manual SMTP test message confirming the Civic Resolve email integration delivery works.</p>
        <p style="font-size: 11px; color: #94a3b8;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `;

    console.log(`Attempting to send a manual test message to: ${testRecipient}`);
    const info = await sendEmail(testRecipient, testSubject, testHtml);

    // 4. Trace delivery parameters
    console.log('\n--- STEP 4: EMAIL DELIVERY TRACE ---');
    if (info.mock) {
      console.log('⚠ Email was logged as a mock console message because no active transporter could be created.');
    } else {
      console.log('✔ SMTP connection established.');
      console.log(`✔ Message Accepted by SMTP: ${info.accepted && info.accepted.length > 0 ? 'YES' : 'NO'}`);
      console.log(`✔ Message ID: ${info.messageId}`);
      console.log(`✔ Envelope details: ${JSON.stringify(info.envelope)}`);
      
      if (info.rejected && info.rejected.length > 0) {
        console.log(`❌ Message Rejected by recipient provider: ${JSON.stringify(info.rejected)}`);
      } else {
        console.log('✔ No rejected recipients.');
      }

      if (info.testUrl) {
        console.log(`✔ Ethereal Web Inbox Link: ${info.testUrl}`);
      }
      
      console.log('\n✔ TEST EMAIL SUCCESSFUL.');
    }

  } catch (error) {
    console.error('\n❌ EMAIL AUDIT ENCOUNTERED FAILURE:', error);
    process.exit(1);
  }
}

runEmailAudit();
