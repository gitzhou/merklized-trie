import { hash160 } from '../src';

describe('Test hash functions', () => {
  it('hash160', () => {
    const payload = Buffer.from('Hello, World!', 'utf-8');
    const hash = Buffer.from('e3c83f9d9adb8fcbccc4399da8ebe609ba4352e4', 'hex');
    expect(hash160(payload)).toEqual(hash);
  });
});
