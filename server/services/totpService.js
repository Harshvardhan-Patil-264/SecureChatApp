/**
 * services/totpService.js
 * Tiny wrapper around speakeasy + qrcode to provide TOTP secret, QR code generation and validation.
 */

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const ISSUER = 'ChatApp';

function generateSecret() {
  const secret = speakeasy.generateSecret({ length: 20 });
  return secret.base32;
}

function generateOtpAuthUrl(username, secret) {
  const label = encodeURIComponent(ISSUER + ':' + username);
  const secretEncoded = encodeURIComponent(secret);
  return `otpauth://totp/${label}?secret=${secretEncoded}&issuer=${ISSUER}&algorithm=SHA1&digits=6&period=30`;
}

async function generateQrCodeBase64(username, secret) {
  const url = generateOtpAuthUrl(username, secret);
  return qrcode.toDataURL(url, { width: 300 });
}

function validateTotp(secret, token) {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1
    });
  } catch (e) {
    return false;
  }
}

module.exports = {
  generateSecret,
  generateOtpAuthUrl,
  generateQrCodeBase64,
  validateTotp
};
