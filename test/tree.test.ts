import {
  defaultHasher,
  MerklizedTrie,
  MerklizedTrieInterNode,
  MerklizedTrieLeaf,
  MerklizedTriePath,
  sha256,
} from '../src';

/**
 * demo leaf implementation
 */
class Leaf implements MerklizedTrieLeaf {
  // [0, 999], 2 bytes
  private readonly id: number;
  // 4 bytes
  private readonly data: Buffer;
  // hash function
  private readonly hasher: (payload: Buffer) => Buffer;

  constructor(id: number, data: Buffer, hasher?: (payload: Buffer) => Buffer) {
    if (id < 0n || id > 999n) {
      throw new Error('invalid id');
    }
    if (data.length != 4) {
      throw new Error('invalid data');
    }
    this.id = id;
    this.data = data;
    this.hasher = hasher || defaultHasher;
  }

  hash(): Buffer {
    return this.hasher(this.serialize());
  }

  key(): bigint {
    return BigInt(this.id);
  }

  serialize(): Buffer {
    const id = Buffer.alloc(2);
    id.writeUInt16BE(this.id);
    return Buffer.concat([id, this.data]);
  }
}

describe('Test MerklizedTrie', () => {
  // according to the demo leaf implementation
  // serialized leaf is 6 bytes, 2 bytes id plus 4 bytes data
  const leafBytes = 6;
  // the leaf id scope is [0, 999]
  //   thus tree height is 3, and the number of slots is 10
  const treeHeight = 3;
  const interNodeSlots = 10;
  // hash value of empty slot for intermediate node in each level of the tree
  const emptyHashes: Buffer[] = [];
  // hash function
  const hasher: (payload: Buffer) => Buffer = sha256;
  // leafs
  const leaf123 = new Leaf(123, Buffer.alloc(4), hasher);
  const leaf125 = new Leaf(125, Buffer.alloc(4), hasher);
  const leaf153 = new Leaf(153, Buffer.alloc(4), hasher);
  const leaf666 = new Leaf(666, Buffer.alloc(4), hasher);
  const newLeaf666 = new Leaf(666, Buffer.from('01020304', 'hex'), hasher);
  //  slot values of intermediate nodes at each level of the tree
  let node12Slots: Buffer[];
  let node15Slots: Buffer[];
  let node66Slots: Buffer[];
  let node1Slots: Buffer[];
  let node6Slots: Buffer[];
  let rootNodeSlots: Buffer[];

  const computeEmptyHashes = (
    emptyHashes: Buffer[],
    treeHeight: number,
    leafBytes: number,
    hasher: (payload: Buffer) => Buffer,
  ) => {
    let emptyHash = hasher(Buffer.alloc(leafBytes));
    for (let i = 0; i < treeHeight; i++) {
      emptyHashes.push(emptyHash);
      emptyHash = hasher(Buffer.concat(Array(interNodeSlots).fill(emptyHash)));
    }
  };

  beforeAll(() => {
    // precompute empty hashes
    computeEmptyHashes(emptyHashes, treeHeight, leafBytes, hasher);
    // initialize slot values of intermediate nodes at each level of the tree
    node12Slots = Array<Buffer>(interNodeSlots).fill(emptyHashes[0]);
    node15Slots = Array<Buffer>(interNodeSlots).fill(emptyHashes[0]);
    node66Slots = Array<Buffer>(interNodeSlots).fill(emptyHashes[0]);
    node1Slots = Array<Buffer>(interNodeSlots).fill(emptyHashes[1]);
    node6Slots = Array<Buffer>(interNodeSlots).fill(emptyHashes[1]);
    rootNodeSlots = Array<Buffer>(interNodeSlots).fill(emptyHashes[2]);
  });

  it('throw if tree height < 1 when calling constructor', () => {
    expect(() => new MerklizedTrie(0, leafBytes, interNodeSlots, [])).toThrow(
      'height of tree must be greater than 0',
    );
  });

  it('throw if leaf bytes < 1 when calling constructor', () => {
    expect(() => new MerklizedTrie(treeHeight, 0, interNodeSlots, [])).toThrow(
      'bytes of leaf must be greater than 0',
    );
  });

  it('merkle root of an empty trie', () => {
    const emptyTrie = new MerklizedTrie(
      treeHeight,
      leafBytes,
      interNodeSlots,
      [],
      hasher,
    );
    const emptyRootNode = new MerklizedTrieInterNode(
      interNodeSlots,
      emptyHashes[treeHeight - 1],
      hasher,
    );
    expect(emptyTrie.merkleRoot()).toEqual(emptyRootNode.hash());
  });

  it('merkle path of a non-existing leaf', () => {
    const emptyTrie = new MerklizedTrie(
      treeHeight,
      leafBytes,
      interNodeSlots,
      [],
      hasher,
    );
    expect(emptyTrie.getLeaf(999n)).toBe(undefined);
    expect(emptyTrie.merklePath(999n)).toBe(undefined);
  });

  it('upsert leafs', () => {
    // create an empty trie
    const trie = new MerklizedTrie(
      treeHeight,
      leafBytes,
      interNodeSlots,
      [],
      hasher,
    );
    // insert leaf 123
    trie.upsertLeaf(leaf123);
    node12Slots[3] = leaf123.hash();
    node1Slots[2] = hasher(Buffer.concat(node12Slots));
    rootNodeSlots[1] = hasher(Buffer.concat(node1Slots));
    expect(trie.merkleRoot()).toEqual(hasher(Buffer.concat(rootNodeSlots)));
    // insert leaf 125
    trie.upsertLeaf(leaf125);
    node12Slots[5] = leaf125.hash();
    node1Slots[2] = hasher(Buffer.concat(node12Slots));
    rootNodeSlots[1] = hasher(Buffer.concat(node1Slots));
    expect(trie.merkleRoot()).toEqual(hasher(Buffer.concat(rootNodeSlots)));
    // insert leaf 153
    trie.upsertLeaf(leaf153);
    node15Slots[3] = leaf153.hash();
    node1Slots[5] = hasher(Buffer.concat(node15Slots));
    rootNodeSlots[1] = hasher(Buffer.concat(node1Slots));
    expect(trie.merkleRoot()).toEqual(hasher(Buffer.concat(rootNodeSlots)));
    // insert leaf 666
    trie.upsertLeaf(leaf666);
    node66Slots[6] = leaf666.hash();
    node6Slots[6] = hasher(Buffer.concat(node66Slots));
    rootNodeSlots[6] = hasher(Buffer.concat(node6Slots));
    expect(trie.merkleRoot()).toEqual(hasher(Buffer.concat(rootNodeSlots)));
    // update tree with leaf that has not been changed, root should not change
    const prevMerkleRoot = trie.merkleRoot();
    trie.upsertLeaf(leaf666);
    expect(trie.merkleRoot()).toEqual(prevMerkleRoot);
    // update leaf 666
    trie.upsertLeaf(newLeaf666);
    node66Slots[6] = newLeaf666.hash();
    node6Slots[6] = hasher(Buffer.concat(node66Slots));
    rootNodeSlots[6] = hasher(Buffer.concat(node6Slots));
    expect(trie.merkleRoot()).toEqual(hasher(Buffer.concat(rootNodeSlots)));
    // merkle path of leaf 153
    const flattenSiblings = (slots: Buffer[], index: number): Buffer => {
      return Buffer.concat([
        Buffer.concat(slots.slice(0, index)),
        Buffer.concat(slots.slice(index + 1)),
      ]);
    };
    const merklePath: MerklizedTriePath = [
      flattenSiblings(node15Slots, 3),
      flattenSiblings(node1Slots, 5),
      flattenSiblings(rootNodeSlots, 1),
    ];
    expect(trie.merklePath(153n)).toEqual(merklePath);
    // new a trie with the same leaf nodes by passing them to the constructor
    // these two trees should have the same merkle root
    const tree = new MerklizedTrie(
      treeHeight,
      leafBytes,
      interNodeSlots,
      [leaf123, leaf125, leaf153, leaf666, newLeaf666],
      hasher,
    );
    expect(tree.merkleRoot()).toEqual(trie.merkleRoot());
  });

  it('use default hash function', () => {
    const trie = new MerklizedTrie(treeHeight, leafBytes, interNodeSlots, []);
    // recompute empty hashes since the hash function is different
    const emptyHashes: Buffer[] = [];
    computeEmptyHashes(emptyHashes, treeHeight, leafBytes, defaultHasher);
    const emptyRootNode = new MerklizedTrieInterNode(
      interNodeSlots,
      emptyHashes[treeHeight - 1],
    );
    expect(trie.merkleRoot()).toEqual(emptyRootNode.hash());
  });
});
