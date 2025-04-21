import { Request } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const verifyHMAC = (req: Request): boolean => {
  const secret = process.env.TYPEBOT_SECRET_KEY!;
  const receivedHmac = req.headers['x-typebot-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  const hmac = crypto.createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return hmac === receivedHmac;
};