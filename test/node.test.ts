import { defaultHasher, MerklizedTrieInterNode, sha256 } from '../src';

describe('Test MerklizedTrieInterNode', () => {
  const emptyHash = Buffer.from('FF', 'hex');

  it('throw if slots < 1 when calling constructor', () => {
    expect(() => new MerklizedTrieInterNode(0, emptyHash)).toThrow(
      'slots of node must be greater than 0',
    );
  });

  it('serialize', () => {
    const slots = 5;
    const node = new MerklizedTrieInterNode(slots, emptyHash);
    const targetSlotHashes = new Array(slots).fill(emptyHash);
    expect(node.serialize()).toEqual(Buffer.concat(targetSlotHashes));

    const slotIndex = 2;
    const slotHash = Buffer.from('AA', 'hex');
    node.setSlot(slotIndex, slotHash);
    targetSlotHashes[slotIndex] = slotHash;
    expect(node.serialize()).toEqual(Buffer.concat(targetSlotHashes));
  });

  it('hash with default hasher', () => {
    const slots = 5;
    const node = new MerklizedTrieInterNode(slots, emptyHash);
    const targetSlotHashes = new Array(slots).fill(emptyHash);
    expect(node.hash()).toEqual(defaultHasher(Buffer.concat(targetSlotHashes)));

    const slotIndex = 2;
    const slotHash = Buffer.from('AA', 'hex');
    node.setSlot(slotIndex, slotHash);
    targetSlotHashes[slotIndex] = slotHash;
    expect(node.hash()).toEqual(defaultHasher(Buffer.concat(targetSlotHashes)));
  });

  it('hash with custom hasher', () => {
    const hasher = sha256;

    const slots = 5;
    const node = new MerklizedTrieInterNode(slots, emptyHash, hasher);
    const targetSlotHashes = new Array(slots).fill(emptyHash);
    expect(node.hash()).toEqual(hasher(Buffer.concat(targetSlotHashes)));

    const slotIndex = 2;
    const slotHash = Buffer.from('AA', 'hex');
    node.setSlot(slotIndex, slotHash);
    targetSlotHashes[slotIndex] = slotHash;
    expect(node.hash()).toEqual(hasher(Buffer.concat(targetSlotHashes)));
  });

  it('siblings', () => {
    const node = new MerklizedTrieInterNode(3, emptyHash);
    // FF FF FF
    expect(node.slotSiblings(1)).toEqual(Buffer.from('FFFF', 'hex'));

    node.setSlot(0, Buffer.from('00', 'hex'));
    // 00 FF FF
    expect(node.slotSiblings(1)).toEqual(Buffer.from('00FF', 'hex'));

    node.setSlot(1, Buffer.from('01', 'hex'));
    // 00 01 FF
    expect(node.slotSiblings(1)).toEqual(Buffer.from('00FF', 'hex'));

    node.setSlot(2, Buffer.from('02', 'hex'));
    // 00 01 02
    expect(node.slotSiblings(1)).toEqual(Buffer.from('0002', 'hex'));
  });

  it('throw if index is out of bounds when calling siblings', () => {
    const node = new MerklizedTrieInterNode(3, emptyHash);
    expect(() => node.slotSiblings(-1)).toThrow('slot index -1 out of bounds');
    expect(() => node.slotSiblings(3)).toThrow('slot index 3 out of bounds');
  });
});
