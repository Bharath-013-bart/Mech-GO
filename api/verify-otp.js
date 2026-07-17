const otpStore = require('./_otp-store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber, otp } = req.body || {};
    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }

    const stored = otpStore.get(phoneNumber);
    if (!stored) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (stored.code !== otp.toString()) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phoneNumber);
      return res.status(400).json({ error: 'OTP expired' });
    }

    otpStore.delete(phoneNumber);
    return res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: error.message || 'OTP verification failed' });
  }
};
