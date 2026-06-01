const nodemailer = require('nodemailer');

// Set up transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail', // or any custom service/SMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends a notification email to a user.
 * Falls back to console log if email user or pass is not defined.
 * @param {string} toEmail 
 * @param {string} subject 
 * @param {string} htmlContent 
 */
const sendEmail = async (toEmail, subject, htmlContent) => {
  if (
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS ||
    process.env.EMAIL_USER.includes('your_email_sender') ||
    process.env.EMAIL_PASS === ''
  ) {
    console.log('====== [Mock Email Dispatch] ======');
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log('Content (HTML):');
    console.log(htmlContent);
    console.log('===================================');
    return { mock: true, message: 'Email logged to console (no credentials)' };
  }

  const mailOptions = {
    from: `"Civic Resolve" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Nodemailer Service Error:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
};
