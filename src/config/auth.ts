import crypto from 'crypto';

const SECRET_KEY = process.env.TYPEBOT_SECRET_KEY || 'chave_secreta_forte';

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  const calculatedSignature = hmac.update(body).digest('hex');
  return signature === calculatedSignature;
}