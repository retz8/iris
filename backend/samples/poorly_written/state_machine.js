/**
 * State management
 */

const STATE_A = 0;
const STATE_B = 1;
const STATE_C = 2;

class Manager {
  constructor(config) {
    this.current = STATE_A;
    this.config = config;
    this.data = [];
    this.flag = false;
  }

  /**
   * Update state
   * @param {*} input 
   */
  update(input) {
    const next = this._determine(input);
    this._transition(next);
    return this._check();
  }

  /**
   * Determine next
   * @private
   * @param {*} input 
   */
  _determine(input) {
    if (this.current === STATE_A) {
      return input > 10 ? STATE_B : STATE_A;
    }
    if (this.current === STATE_B) {
      return input < 5 ? STATE_C : STATE_B;
    }
    return STATE_A;
  }

  /**
   * Transition handler
   * @private
   * @param {*} next 
   */
  _transition(next) {
    this.current = next;
    this._notify();
  }

  /**
   * Notify observers
   * @private
   */
  _notify() {
    this.flag = !this.flag;
  }

  /**
   * Check status
   * @private
   */
  _check() {
    return this.current === STATE_C;
  }

  /**
   * Process batch
   * @param {*} items 
   */
  batch(items) {
    this._prepare();
    
    for (const item of items) {
      this._handle(item);
    }

    return this._aggregate();
  }

  /**
   * Prepare for batch
   * @private
   */
  _prepare() {
    this.data = [];
  }

  /**
   * Handle single item
   * @private
   * @param {*} item 
   */
  _handle(item) {
    const processed = this._compute(item);
    if (this._filter(processed)) {
      this.data.push(processed);
    }
  }

  /**
   * Compute result
   * @private
   * @param {*} item 
   */
  _compute(item) {
    return item * 2 + this.config.offset;
  }

  /**
   * Filter values
   * @private
   * @param {*} val 
   */
  _filter(val) {
    return val > this.config.threshold;
  }

  /**
   * Aggregate results
   * @private
   */
  _aggregate() {
    return this.data.reduce((sum, val) => sum + val, 0);
  }

  /**
   * Execute workflow
   * @param {*} params 
   */
  execute(params) {
    const prepared = this._setup(params);
    const intermediate = this._process(prepared);
    return this._cleanup(intermediate);
  }

  /**
   * Setup phase
   * @private
   * @param {*} params 
   */
  _setup(params) {
    return {
      ...params,
      timestamp: Date.now()
    };
  }

  /**
   * Processing phase
   * @private
   * @param {*} data 
   */
  _process(data) {
    const values = Object.values(data).filter(v => typeof v === 'number');
    return values.map(v => v * this.config.multiplier);
  }

  /**
   * Cleanup phase
   * @private
   * @param {*} result 
   */
  _cleanup(result) {
    return result.filter(v => v !== 0);
  }

  /**
   * Get current state
   */
  getState() {
    return {
      current: this.current,
      flag: this.flag,
      count: this.data.length
    };
  }
}

export { Manager, STATE_A, STATE_B, STATE_C };