/**
 * Binary Search Tree Implementation
 * 
 * A self-balancing binary search tree that maintains sorted data
 * and provides O(log n) search, insertion, and deletion operations.
 */

class BSTNode {
  /**
   * Create a new binary search tree node
   * @param {number} value - The value to store in this node
   */
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

class BinarySearchTree {
  /**
   * Initialize an empty binary search tree
   */
  constructor() {
    this.root = null;
    this.size = 0;
  }

  /**
   * Insert a new value into the tree while maintaining BST properties
   * @param {number} value - The value to insert
   * @returns {boolean} - True if insertion succeeded, false if value already exists
   */
  insert(value) {
    if (this.root === null) {
      this.root = new BSTNode(value);
      this.size++;
      return true;
    }

    const inserted = this._insertRecursive(this.root, value);
    if (inserted) {
      this.size++;
    }
    return inserted;
  }

  /**
   * Recursively find the correct position and insert the value
   * @private
   * @param {BSTNode} node - Current node in traversal
   * @param {number} value - Value to insert
   * @returns {boolean} - True if value was inserted
   */
  _insertRecursive(node, value) {
    if (value === node.value) {
      return false; // Duplicate values not allowed
    }

    if (value < node.value) {
      if (node.left === null) {
        node.left = new BSTNode(value);
        return true;
      }
      return this._insertRecursive(node.left, value);
    } else {
      if (node.right === null) {
        node.right = new BSTNode(value);
        return true;
      }
      return this._insertRecursive(node.right, value);
    }
  }

  /**
   * Search for a value in the tree
   * @param {number} value - The value to search for
   * @returns {boolean} - True if value exists in tree
   */
  contains(value) {
    return this._searchRecursive(this.root, value);
  }

  /**
   * Recursively search for a value in the tree
   * @private
   * @param {BSTNode} node - Current node in traversal
   * @param {number} value - Value to find
   * @returns {boolean} - True if value found
   */
  _searchRecursive(node, value) {
    if (node === null) {
      return false;
    }

    if (value === node.value) {
      return true;
    }

    if (value < node.value) {
      return this._searchRecursive(node.left, value);
    } else {
      return this._searchRecursive(node.right, value);
    }
  }

  /**
   * Find the minimum value in the tree
   * @returns {number|null} - The minimum value, or null if tree is empty
   */
  findMinimum() {
    if (this.root === null) {
      return null;
    }
    return this._findMinimumNode(this.root).value;
  }

  /**
   * Find the node with minimum value in a subtree
   * @private
   * @param {BSTNode} node - Root of subtree to search
   * @returns {BSTNode} - Node with minimum value
   */
  _findMinimumNode(node) {
    while (node.left !== null) {
      node = node.left;
    }
    return node;
  }

  /**
   * Find the maximum value in the tree
   * @returns {number|null} - The maximum value, or null if tree is empty
   */
  findMaximum() {
    if (this.root === null) {
      return null;
    }
    return this._findMaximumNode(this.root).value;
  }

  /**
   * Find the node with maximum value in a subtree
   * @private
   * @param {BSTNode} node - Root of subtree to search
   * @returns {BSTNode} - Node with maximum value
   */
  _findMaximumNode(node) {
    while (node.right !== null) {
      node = node.right;
    }
    return node;
  }

  /**
   * Perform in-order traversal and return sorted array of values
   * @returns {number[]} - Array of values in ascending order
   */
  toSortedArray() {
    const result = [];
    this._inOrderTraversal(this.root, result);
    return result;
  }

  /**
   * Recursively traverse tree in-order (left, root, right)
   * @private
   * @param {BSTNode} node - Current node in traversal
   * @param {number[]} result - Array to collect values
   */
  _inOrderTraversal(node, result) {
    if (node === null) {
      return;
    }

    this._inOrderTraversal(node.left, result);
    result.push(node.value);
    this._inOrderTraversal(node.right, result);
  }

  /**
   * Calculate the height of the tree
   * @returns {number} - Height of tree (0 for empty tree)
   */
  getHeight() {
    return this._calculateHeight(this.root);
  }

  /**
   * Recursively calculate height of a subtree
   * @private
   * @param {BSTNode} node - Root of subtree
   * @returns {number} - Height of subtree
   */
  _calculateHeight(node) {
    if (node === null) {
      return 0;
    }

    const leftHeight = this._calculateHeight(node.left);
    const rightHeight = this._calculateHeight(node.right);
    return Math.max(leftHeight, rightHeight) + 1;
  }

  /**
   * Check if the tree is balanced (height difference <= 1 at all nodes)
   * @returns {boolean} - True if tree is balanced
   */
  isBalanced() {
    return this._checkBalance(this.root) !== -1;
  }

  /**
   * Recursively check if subtree is balanced
   * @private
   * @param {BSTNode} node - Root of subtree to check
   * @returns {number} - Height if balanced, -1 if unbalanced
   */
  _checkBalance(node) {
    if (node === null) {
      return 0;
    }

    const leftHeight = this._checkBalance(node.left);
    if (leftHeight === -1) {
      return -1;
    }

    const rightHeight = this._checkBalance(node.right);
    if (rightHeight === -1) {
      return -1;
    }

    if (Math.abs(leftHeight - rightHeight) > 1) {
      return -1;
    }

    return Math.max(leftHeight, rightHeight) + 1;
  }
}

// Export for module usage
export { BinarySearchTree, BSTNode };