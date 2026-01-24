/**
 * Data processing module
 */

class Processor {
  constructor(opts = {}) {
    this.opts = opts;
    this.buffer = [];
    this.index = 0;
    this.threshold = opts.threshold || 50;
  }

  /**
   * Main processing function
   * @param {*} input 
   */
  process(input) {
    const prepared = this.prepare(input);
    const transformed = this.transform(prepared);
    return this.finalize(transformed);
  }

  /**
   * Prepare data
   * @param {*} raw 
   */
  prepare(raw) {
    if (typeof raw === 'string') {
      return raw.split(',').map(s => s.trim());
    }
    return raw;
  }

  /**
   * Transform data
   * @param {*} data 
   */
  transform(data) {
    return data.map((item, idx) => {
      const parsed = parseFloat(item);
      return isNaN(parsed) ? 0 : this._adjust(parsed, idx);
    });
  }

  /**
   * Adjust value
   * @private
   * @param {*} val 
   * @param {*} idx 
   */
  _adjust(val, idx) {
    const factor = idx % 3 === 0 ? 1.5 : 1.0;
    return val * factor;
  }

  /**
   * Finalize output
   * @param {*} data 
   */
  finalize(data) {
    return data.filter(v => v > this.threshold);
  }

  /**
   * Handle stream
   * @param {*} chunk 
   */
  handle(chunk) {
    this.buffer.push(chunk);
    
    if (this._shouldFlush()) {
      return this._flush();
    }

    return null;
  }

  /**
   * Check flush condition
   * @private
   */
  _shouldFlush() {
    return this.buffer.length >= 10;
  }

  /**
   * Flush buffer
   * @private
   */
  _flush() {
    const result = this._merge(this.buffer);
    this.buffer = [];
    return result;
  }

  /**
   * Merge items
   * @private
   * @param {*} items 
   */
  _merge(items) {
    return items.reduce((acc, item) => {
      if (Array.isArray(item)) {
        return acc.concat(item);
      }
      return acc;
    }, []);
  }

  /**
   * Apply rules
   * @param {*} data 
   */
  apply(data) {
    const filtered = this._filter(data);
    const mapped = this._map(filtered);
    return this._reduce(mapped);
  }

  /**
   * Filter step
   * @private
   * @param {*} items 
   */
  _filter(items) {
    return items.filter(item => {
      return this._test(item);
    });
  }

  /**
   * Test condition
   * @private
   * @param {*} item 
   */
  _test(item) {
    return item.value > 0 && item.status === 'active';
  }

  /**
   * Map step
   * @private
   * @param {*} items 
   */
  _map(items) {
    return items.map(item => ({
      ...item,
      processed: true,
      timestamp: Date.now()
    }));
  }

  /**
   * Reduce step
   * @private
   * @param {*} items 
   */
  _reduce(items) {
    return items.reduce((acc, item) => {
      const key = item.category || 'default';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }

  /**
   * Run operation
   * @param {*} input 
   * @param {*} mode 
   */
  run(input, mode) {
    if (mode === 'fast') {
      return this._quickRun(input);
    }
    return this._fullRun(input);
  }

  /**
   * Quick execution
   * @private
   * @param {*} input 
   */
  _quickRun(input) {
    return input.slice(0, 10);
  }

  /**
   * Full execution
   * @private
   * @param {*} input 
   */
  _fullRun(input) {
    return input.map(item => this._processItem(item));
  }

  /**
   * Process item
   * @private
   * @param {*} item 
   */
  _processItem(item) {
    const weighted = item * (this.index++ % 5 + 1);
    return weighted > 100 ? 100 : weighted;
  }
}

export { Processor };