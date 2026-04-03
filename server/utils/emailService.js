const nodemailer = require('nodemailer');

const sendOTP = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"RentSplit Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your RentSplit Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #0D5C46; text-align: center;">RentSplit</h2>
          <p>Hi there,</p>
          <p>You requested a password reset. Use the following 6-digit OTP to reset your password. This OTP is valid for 10 minutes.</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #0D5C46; border-radius: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
          <p>Thanks,<br/>The RentSplit Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending OTP:', error);
    return false;
  }
};

module.exports = { sendOTP };
