import {
  MerklizedTrieLeaf,
  MerklizedTrieNode,
  MerklizedTriePath,
} from './types';
import { MerklizedTrieInterNode } from './node';
import { defaultHasher } from './hash';

export class MerklizedTrie {
  // height of the tree
  private readonly treeHeight: number;
  // number of bytes in the leaf
  private readonly leafBytes: number;
  // number of slots in the intermediate node
  private readonly interNodeSlots: number;
  // leafs in the tree
  private readonly leafs = new Map<bigint, MerklizedTrieLeaf>();
  // hash function
  private readonly hasher: (payload: Buffer) => Buffer;
  // hash value of empty slot for intermediate node in each level of the tree
  private readonly emptyHashes: Buffer[] = [];
  // intermediate nodes at each level of the tree
  private readonly interNodes: Map<bigint, MerklizedTrieInterNode>[] = [];

  constructor(
    treeHeight: number,
    leafBytes: number,
    interNodeSlots: number,
    leafs: MerklizedTrieLeaf[],
    hasher?: (payload: Buffer) => Buffer,
  ) {
    if (treeHeight < 1) {
      throw new Error('height of tree must be greater than 0');
    }
    if (leafBytes < 1) {
      throw new Error('bytes of leaf must be greater than 0');
    }
    this.treeHeight = treeHeight;
    this.leafBytes = leafBytes;
    this.interNodeSlots = interNodeSlots;
    this.hasher = hasher || defaultHasher;
    // precompute empty hashes
    let emptyInterNode;
    let emptyHash = this.hasher(Buffer.alloc(this.leafBytes));
    for (let i = 0; i < this.treeHeight; i++) {
      this.emptyHashes.push(emptyHash);
      emptyInterNode = new MerklizedTrieInterNode(
        this.interNodeSlots,
        emptyHash,
        this.hasher,
      );
      emptyHash = emptyInterNode.hash();
    }
    // initialize the empty tree
    for (let i = 0; i < this.treeHeight; i++) {
      this.interNodes.push(new Map<bigint, MerklizedTrieInterNode>());
    }
    this.interNodes[this.treeHeight - 1].set(0n, emptyInterNode!);
    // upsert all the leafs
    leafs.forEach((leaf) => this.upsertLeaf(leaf));
  }

  getLeaf(leafKey: bigint): MerklizedTrieLeaf | undefined {
    return this.leafs.get(leafKey);
  }

  /**
   * upsert a leaf to the tree
   * @param leaf the leaf to upsert
   * @returns old value and merkle path of this leaf
   */
  upsertLeaf(leaf: MerklizedTrieLeaf): {
    oldLeaf: MerklizedTrieLeaf | undefined;
    merklePath: MerklizedTriePath;
  } {
    const leafKey = leaf.key();
    const oldLeaf = this.getLeaf(leafKey);
    this.leafs.set(leafKey, leaf);
    const merklePath = this.updateTree(leaf);
    return { oldLeaf, merklePath };
  }

  /**
   * update the tree when a leaf has been updated
   * @param leaf the leaf that has been updated
   * @returns merkle path of this leaf
   */
  private updateTree(leaf: MerklizedTrieLeaf): MerklizedTriePath {
    const path: MerklizedTriePath = [];
    let node: MerklizedTrieNode = leaf;
    let nodeKey = leaf.key();
    for (let i = 0; i < this.treeHeight; i++) {
      const parentNodeKey = this.getParentNodeKey(nodeKey);
      const slotIndexInParent = this.getSlotIndexInParent(nodeKey);
      let parentNode = this.interNodes[i].get(parentNodeKey);
      if (!parentNode) {
        parentNode = new MerklizedTrieInterNode(
          this.interNodeSlots,
          this.emptyHashes[i],
          this.hasher,
        );
        this.interNodes[i].set(parentNodeKey, parentNode);
      }
      parentNode.setSlot(slotIndexInParent, node.hash());
      path.push(parentNode.slotSiblings(slotIndexInParent));

      node = parentNode;
      nodeKey = parentNodeKey;
    }
    return path;
  }

  merkleRoot(): Buffer {
    // there is only one root node and its key is 0n definitely
    const rootNode = this.interNodes[this.treeHeight - 1].values().next().value;
    return rootNode.hash();
  }

  merklePath(leafKey: bigint): MerklizedTriePath | undefined {
    if (!this.leafs.has(leafKey)) {
      return undefined;
    }
    return this.updateTree(this.getLeaf(leafKey)!);
  }

  /**
   * given a node key, calculate this node's parent node key
   */
  private getParentNodeKey(nodeKey: bigint): bigint {
    return nodeKey / BigInt(this.interNodeSlots);
  }

  /**
   * given a node key, calculate this node's slot index in the parent node
   */
  private getSlotIndexInParent(nodeKey: bigint): number {
    return Number(nodeKey % BigInt(this.interNodeSlots));
  }
}
