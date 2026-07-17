const otpStore = globalThis.__mechGoOtpStore || (globalThis.__mechGoOtpStore = new Map());

module.exports = otpStore;
