/**
 * interface for all nodes in the merkle trie tree,
 *   including both intermediate nodes and leaf nodes
 */
export interface MerklizedTrieNode {
  hash(): Buffer;
  serialize(): Buffer;
}

/**
 * interface for leaf nodes in the merkle trie tree
 */
export interface MerklizedTrieLeaf extends MerklizedTrieNode {
  key(): bigint;
}

export type MerklizedTriePath = Buffer[];
