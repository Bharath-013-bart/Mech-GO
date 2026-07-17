const otpStore = require('./_otp-store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber } = req.body || {};
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phoneNumber, {
      code: otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    console.log(`📱 OTP generated for ${phoneNumber}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      demoOTP: otp
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
};
