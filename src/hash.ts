import * as crypto from 'crypto';

export const sha256 = (payload: Buffer): Buffer => {
  return crypto.createHash('sha256').update(payload).digest();
};

export const ripemd160 = (payload: Buffer): Buffer => {
  return crypto.createHash('ripemd160').update(payload).digest();
};

export const hash160 = (payload: Buffer): Buffer => {
  return ripemd160(sha256(payload));
};

export const defaultHasher = hash160;
