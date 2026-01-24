/**
 * Priority Task Queue
 * 
 * Manages asynchronous tasks with priority levels, concurrency limits,
 * and automatic retry logic for failed tasks.
 */

// Priority levels for task scheduling
const PRIORITY_URGENT = 0;
const PRIORITY_HIGH = 1;
const PRIORITY_NORMAL = 2;
const PRIORITY_LOW = 3;

class Task {
  /**
   * Create a new task with priority and retry configuration
   * @param {Function} taskFunction - Async function to execute
   * @param {number} priority - Priority level (0 = highest)
   * @param {number} maxRetries - Maximum retry attempts on failure
   */
  constructor(taskFunction, priority = PRIORITY_NORMAL, maxRetries = 3) {
    this.id = Task._generateTaskId();
    this.taskFunction = taskFunction;
    this.priority = priority;
    this.maxRetries = maxRetries;
    this.attempts = 0;
    this.status = 'pending';
    this.result = null;
    this.error = null;
    this.createdAt = Date.now();
  }

  /**
   * Generate unique task identifier
   * @private
   * @returns {string} - Unique task ID
   */
  static _generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class PriorityTaskQueue {
  /**
   * Initialize task queue with concurrency limit
   * @param {number} maxConcurrent - Maximum tasks running simultaneously
   */
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.currentlyRunning = 0;
    this.pendingTasks = [];
    this.completedTasks = [];
    this.failedTasks = [];
    this.isProcessing = false;
  }

  /**
   * Add a new task to the queue
   * @param {Function} taskFunction - Async function to execute
   * @param {number} priority - Task priority (lower number = higher priority)
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {string} - Task ID for tracking
   */
  enqueue(taskFunction, priority = PRIORITY_NORMAL, maxRetries = 3) {
    const task = new Task(taskFunction, priority, maxRetries);
    this.pendingTasks.push(task);
    this._sortPendingTasksByPriority();
    
    if (!this.isProcessing) {
      this._processNextTask();
    }

    return task.id;
  }

  /**
   * Sort pending tasks by priority and creation time
   * @private
   */
  _sortPendingTasksByPriority() {
    this.pendingTasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Process tasks from queue respecting concurrency limit
   * @private
   */
  async _processNextTask() {
    this.isProcessing = true;

    while (this.pendingTasks.length > 0 && this.currentlyRunning < this.maxConcurrent) {
      const task = this.pendingTasks.shift();
      this.currentlyRunning++;
      
      this._executeTask(task);
    }

    if (this.currentlyRunning === 0 && this.pendingTasks.length === 0) {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single task with error handling and retry logic
   * @private
   * @param {Task} task - Task to execute
   */
  async _executeTask(task) {
    task.status = 'running';
    task.attempts++;

    try {
      const result = await task.taskFunction();
      task.result = result;
      task.status = 'completed';
      this.completedTasks.push(task);
    } catch (error) {
      task.error = error;
      
      if (task.attempts < task.maxRetries) {
        task.status = 'retrying';
        this.pendingTasks.unshift(task);
        this._sortPendingTasksByPriority();
      } else {
        task.status = 'failed';
        this.failedTasks.push(task);
      }
    } finally {
      this.currentlyRunning--;
      this._processNextTask();
    }
  }

  /**
   * Get current queue statistics
   * @returns {Object} - Queue status information
   */
  getQueueStats() {
    return {
      pending: this.pendingTasks.length,
      running: this.currentlyRunning,
      completed: this.completedTasks.length,
      failed: this.failedTasks.length,
      total: this.pendingTasks.length + this.currentlyRunning + 
             this.completedTasks.length + this.failedTasks.length
    };
  }

  /**
   * Get details of a specific task by ID
   * @param {string} taskId - Task identifier
   * @returns {Task|null} - Task object or null if not found
   */
  getTaskById(taskId) {
    const allTasks = [
      ...this.pendingTasks,
      ...this.completedTasks,
      ...this.failedTasks
    ];

    return allTasks.find(task => task.id === taskId) || null;
  }

  /**
   * Clear all completed and failed tasks from history
   */
  clearHistory() {
    this.completedTasks = [];
    this.failedTasks = [];
  }

  /**
   * Wait for all pending tasks to complete
   * @returns {Promise<void>}
   */
  async waitUntilEmpty() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.pendingTasks.length === 0 && this.currentlyRunning === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
}

// Export constants and classes
export { 
  PriorityTaskQueue, 
  Task,
  PRIORITY_URGENT, 
  PRIORITY_HIGH, 
  PRIORITY_NORMAL, 
  PRIORITY_LOW 
};