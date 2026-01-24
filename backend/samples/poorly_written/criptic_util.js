/**
 * Utility functions
 */

class Utils {
  constructor() {
    this.cache = new Map();
    this.counter = 0;
  }

  /**
   * Process data
   * @param {*} data 
   * @returns {*}
   */
  process(data) {
    const temp = this._prepare(data);
    const result = this._apply(temp);
    return this._finalize(result);
  }

  /**
   * Prepare input
   * @private
   * @param {*} input 
   */
  _prepare(input) {
    if (typeof input === 'string') {
      return input.split('').map((c, i) => ({ c, i }));
    }
    return input;
  }

  /**
   * Apply transformation
   * @private
   * @param {*} temp 
   */
  _apply(temp) {
    return temp.map(item => {
      const code = item.c.charCodeAt(0);
      const offset = item.i % 2 === 0 ? 3 : -3;
      return String.fromCharCode(code + offset);
    }).join('');
  }

  /**
   * Finalize output
   * @private
   * @param {*} result 
   */
  _finalize(result) {
    return result;
  }

  /**
   * Handle operation
   * @param {*} a 
   * @param {*} b 
   */
  handle(a, b) {
    const key = this._generateKey(a, b);
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = this._compute(a, b);
    this.cache.set(key, result);
    return result;
  }

  /**
   * Generate key
   * @private
   * @param {*} x 
   * @param {*} y 
   */
  _generateKey(x, y) {
    return `${x}_${y}`;
  }

  /**
   * Compute value
   * @private
   * @param {*} x 
   * @param {*} y 
   */
  _compute(x, y) {
    let result = 0;
    for (let i = 0; i < x; i++) {
      for (let j = 0; j < y; j++) {
        result += (i + 1) * (j + 1);
      }
    }
    return result;
  }

  /**
   * Execute operation
   * @param {*} input 
   */
  exec(input) {
    this.counter++;
    const processed = this._transform(input);
    return this._validate(processed);
  }

  /**
   * Transform data
   * @private
   * @param {*} data 
   */
  _transform(data) {
    if (Array.isArray(data)) {
      return data.filter((v, i) => i % 2 === 0);
    }
    return data;
  }

  /**
   * Validate result
   * @private
   * @param {*} result 
   */
  _validate(result) {
    return result !== null && result !== undefined;
  }

  /**
   * Run batch
   * @param {*} items 
   */
  run(items) {
    return items.map(item => this._processItem(item));
  }

  /**
   * Process single item
   * @private
   * @param {*} item 
   */
  _processItem(item) {
    const normalized = this._normalize(item);
    return this._adjust(normalized);
  }

  /**
   * Normalize value
   * @private
   * @param {*} val 
   */
  _normalize(val) {
    if (typeof val === 'number') {
      return val < 0 ? 0 : val > 100 ? 100 : val;
    }
    return val;
  }

  /**
   * Adjust value
   * @private
   * @param {*} val 
   */
  _adjust(val) {
    return val * 1.1;
  }
}

export { Utils };