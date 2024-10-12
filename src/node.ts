import { MerklizedTrieNode } from './types';
import { defaultHasher } from './hash';

/**
 * class for intermediate nodes in the merkle trie tree
 */
export class MerklizedTrieInterNode implements MerklizedTrieNode {
  // number of slots in the intermediate node
  private readonly slots: number;
  // hash value of empty slot
  private readonly emptyHash: Buffer;
  // hash function
  private readonly hasher: (payload: Buffer) => Buffer;
  // slotIndex -> slotHash
  private slotHashes: Map<number, Buffer>;

  constructor(
    slots: number,
    emptyHash: Buffer,
    hasher?: (payload: Buffer) => Buffer,
  ) {
    if (slots < 1) {
      throw new Error('slots of node must be greater than 0');
    }
    this.slots = slots;
    this.emptyHash = emptyHash;
    this.hasher = hasher || defaultHasher;
    this.slotHashes = new Map<number, Buffer>();
  }

  setSlot(slotIndex: number, slotHash: Buffer) {
    this.slotHashes.set(slotIndex, slotHash);
  }

  serialize(): Buffer {
    const hashes: Buffer[] = [];
    for (let i = 0; i < this.slots; i++) {
      hashes.push(this.slotHashes.get(i) || this.emptyHash);
    }
    return Buffer.concat(hashes);
  }

  hash(): Buffer {
    return this.hasher(this.serialize());
  }

  slotSiblings(slotIndex: number): Buffer {
    if (slotIndex < 0 || slotIndex >= this.slots) {
      throw new Error(`slot index ${slotIndex} out of bounds`);
    }
    const hashes: Buffer[] = [];
    for (let i = 0; i < slotIndex; i++) {
      hashes.push(this.slotHashes.get(i) || this.emptyHash);
    }
    for (let i = slotIndex + 1; i < this.slots; i++) {
      hashes.push(this.slotHashes.get(i) || this.emptyHash);
    }
    return Buffer.concat(hashes);
  }
}
