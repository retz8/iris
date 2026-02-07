"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../iris-core/dist/state/analysisState.js
var require_analysisState = __commonJS({
  "../iris-core/dist/state/analysisState.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.IRISCoreState = exports2.IRISAnalysisState = void 0;
    var IRISAnalysisState5;
    (function(IRISAnalysisState6) {
      IRISAnalysisState6["IDLE"] = "IDLE";
      IRISAnalysisState6["ANALYZING"] = "ANALYZING";
      IRISAnalysisState6["ANALYZED"] = "ANALYZED";
      IRISAnalysisState6["STALE"] = "STALE";
    })(IRISAnalysisState5 || (exports2.IRISAnalysisState = IRISAnalysisState5 = {}));
    var IRISCoreState2 = class {
      state;
      logger;
      listeners = [];
      constructor(logger) {
        this.logger = logger;
        this.state = {
          currentState: IRISAnalysisState5.IDLE,
          analysisData: null,
          activeFileUri: null,
          selectionState: { selectedBlockId: null, currentSegmentIndex: 0 }
        };
        this.logger.info("State manager initialized", { initialState: IRISAnalysisState5.IDLE });
      }
      onStateChange(listener) {
        this.listeners.push(listener);
        return () => {
          this.listeners = this.listeners.filter((l) => l !== listener);
        };
      }
      emit(state) {
        this.listeners.forEach((l) => l(state));
      }
      /**
       * Dispose resources
       */
      dispose() {
        this.listeners = [];
      }
      // ========================================
      // STATE TRANSITIONS
      // ========================================
      /**
       * Transition to ANALYZING state when analysis request starts
       */
      startAnalysis(fileUri) {
        const previousState = this.state.currentState;
        if (previousState === IRISAnalysisState5.ANALYZING) {
          this.logger.warn("Analysis already in progress, ignoring duplicate trigger", { fileUri });
          return;
        }
        this.state.currentState = IRISAnalysisState5.ANALYZING;
        this.state.activeFileUri = fileUri;
        this.state.analysisData = null;
        this.logStateTransition(previousState, IRISAnalysisState5.ANALYZING, fileUri);
        this.emit(IRISAnalysisState5.ANALYZING);
      }
      /**
       * Transition to ANALYZED state on successful analysis with valid schema
       */
      setAnalyzed(data) {
        const previousState = this.state.currentState;
        if (previousState !== IRISAnalysisState5.ANALYZING) {
          this.logger.warn("Received analysis data without being in ANALYZING state", {
            currentState: previousState,
            fileUri: data.analyzedFileUri
          });
          return;
        }
        this.state.currentState = IRISAnalysisState5.ANALYZED;
        this.state.analysisData = data;
        this.logStateTransition(previousState, IRISAnalysisState5.ANALYZED, data.analyzedFileUri, {
          blockCount: data.responsibilityBlocks.length,
          fileIntent: data.fileIntent.substring(0, 50) + "..."
          // Truncate for logging
        });
        this.emit(IRISAnalysisState5.ANALYZED);
      }
      /**
       * Transition to IDLE state on error or invalid schema
       * Clears selection state since selected block becomes invalid
       */
      setError(error, fileUri) {
        const previousState = this.state.currentState;
        this.state.currentState = IRISAnalysisState5.IDLE;
        this.state.analysisData = null;
        this.deselectBlock();
        this.logStateTransition(previousState, IRISAnalysisState5.IDLE, fileUri, { error });
        this.emit(IRISAnalysisState5.IDLE);
      }
      /**
       * Transition to STALE state when file is modified
       * Clears selection state since block ranges may be invalidated
       */
      setStale() {
        const previousState = this.state.currentState;
        if (previousState !== IRISAnalysisState5.ANALYZED) {
          return;
        }
        const fileUri = this.state.analysisData?.analyzedFileUri;
        this.state.currentState = IRISAnalysisState5.STALE;
        this.deselectBlock();
        this.logStateTransition(previousState, IRISAnalysisState5.STALE, fileUri);
        this.emit(IRISAnalysisState5.STALE);
      }
      /**
       * Reset to IDLE state (user-initiated or editor change)
       * Clear selection state on reset
       */
      reset() {
        const previousState = this.state.currentState;
        this.state.currentState = IRISAnalysisState5.IDLE;
        this.state.analysisData = null;
        this.state.activeFileUri = null;
        this.deselectBlock();
        this.logStateTransition(previousState, IRISAnalysisState5.IDLE, void 0, { reason: "reset" });
        this.emit(IRISAnalysisState5.IDLE);
      }
      // ========================================
      // READ-ONLY SELECTORS
      // ========================================
      /**
       * Get current state enum value
       */
      getCurrentState() {
        return this.state.currentState;
      }
      /**
       * Get complete analysis data (null if not in ANALYZED state)
       */
      getAnalysisData() {
        return this.state.analysisData;
      }
      /**
       * Get file intent only
       */
      getFileIntent() {
        return this.state.analysisData?.fileIntent ?? null;
      }
      /**
       * Get responsibility blocks only
       */
      getResponsibilityBlocks() {
        return this.state.analysisData?.responsibilityBlocks ?? null;
      }
      /**
       * Get metadata only
       */
      getMetadata() {
        return this.state.analysisData?.metadata ?? null;
      }
      /**
       * Get analyzed file URI
       */
      getAnalyzedFileUri() {
        return this.state.analysisData?.analyzedFileUri ?? null;
      }
      /**
       * Get active file URI being tracked
       */
      getActiveFileUri() {
        return this.state.activeFileUri;
      }
      /**
       * Check if analysis data is available
       */
      hasAnalysisData() {
        return this.state.analysisData !== null;
      }
      /**
       * Check if currently analyzing
       */
      isAnalyzing() {
        return this.state.currentState === IRISAnalysisState5.ANALYZING;
      }
      /**
       * Check if analysis is stale
       */
      isStale() {
        return this.state.currentState === IRISAnalysisState5.STALE;
      }
      /**
       * Get raw server response (for debugging or advanced use)
       */
      getRawResponse() {
        return this.state.analysisData?.rawResponse ?? null;
      }
      // ========================================
      // SELECTION STATE MANAGEMENT
      // ========================================
      /**
       * Select a block (pin/unpin model)
       */
      selectBlock(blockId) {
        const previousBlockId = this.state.selectionState.selectedBlockId;
        this.state.selectionState.selectedBlockId = blockId;
        this.state.selectionState.currentSegmentIndex = 0;
        this.logger.info("Block selected", {
          blockId,
          previousBlockId,
          segmentIndex: 0
        });
      }
      /**
       * Deselect current block (pin/unpin model)
       */
      deselectBlock() {
        const previousBlockId = this.state.selectionState.selectedBlockId;
        if (previousBlockId === null) {
          return;
        }
        this.state.selectionState.selectedBlockId = null;
        this.state.selectionState.currentSegmentIndex = 0;
        this.logger.info("Block deselected", {
          previousBlockId
        });
      }
      /**
       * Get current segment index for selected block
       */
      getCurrentSegmentIndex() {
        return this.state.selectionState.currentSegmentIndex;
      }
      /**
       * Set current segment index for navigation
       */
      setCurrentSegmentIndex(index) {
        const previousIndex = this.state.selectionState.currentSegmentIndex;
        const blockId = this.state.selectionState.selectedBlockId;
        this.state.selectionState.currentSegmentIndex = index;
        this.logger.info("Segment navigation", {
          blockId,
          previousIndex,
          currentIndex: index
        });
      }
      /**
       * Get currently selected block ID
       */
      getSelectedBlockId() {
        return this.state.selectionState.selectedBlockId;
      }
      /**
       * Check if a block is currently selected
       */
      isBlockSelected() {
        return this.state.selectionState.selectedBlockId !== null;
      }
      // ========================================
      // LOGGING
      // ========================================
      /**
       * Log state transition with structured metadata
       */
      logStateTransition(from, to, fileUri, metadata) {
        const message = `State transition: ${from} \u2192 ${to}`;
        const context = {
          from,
          to,
          fileUri,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          ...metadata
        };
        this.logger.info(message, context);
      }
    };
    exports2.IRISCoreState = IRISCoreState2;
  }
});

// ../iris-core/dist/api/irisClient.js
var require_irisClient = __commonJS({
  "../iris-core/dist/api/irisClient.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.IRISAPIClient = exports2.APIError = exports2.APIErrorType = void 0;
    var APIErrorType2;
    (function(APIErrorType3) {
      APIErrorType3["NETWORK_ERROR"] = "NETWORK_ERROR";
      APIErrorType3["TIMEOUT"] = "TIMEOUT";
      APIErrorType3["HTTP_ERROR"] = "HTTP_ERROR";
      APIErrorType3["INVALID_RESPONSE"] = "INVALID_RESPONSE";
      APIErrorType3["PARSE_ERROR"] = "PARSE_ERROR";
    })(APIErrorType2 || (exports2.APIErrorType = APIErrorType2 = {}));
    var APIError2 = class extends Error {
      type;
      statusCode;
      originalError;
      constructor(type, message, statusCode, originalError) {
        super(message);
        this.type = type;
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.name = "APIError";
      }
    };
    exports2.APIError = APIError2;
    var IRISAPIClient2 = class {
      config;
      logger;
      constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.logger.info("API Client initialized", {
          endpoint: config.endpoint,
          timeout: config.timeout
        });
      }
      /**
       * Send analysis request with comprehensive error handling
       */
      async analyze(request) {
        this.logger.info("Starting analysis request", {
          filename: request.filename,
          language: request.language,
          sourceLength: request.source_code.length
        });
        try {
          const response = await this.executeRequest(request);
          const validatedResponse = this.validateResponse(response);
          this.logger.info("Analysis request completed successfully", {
            filename: request.filename,
            blockCount: validatedResponse.responsibility_blocks.length
          });
          return validatedResponse;
        } catch (error) {
          if (error instanceof APIError2) {
            this.logger.error(`API Error: ${error.type}`, {
              message: error.message,
              statusCode: error.statusCode,
              filename: request.filename
            });
            throw error;
          }
          this.logger.errorWithException("Unexpected error during analysis", error, {
            filename: request.filename
          });
          throw new APIError2(APIErrorType2.NETWORK_ERROR, "Unexpected error during analysis request", void 0, error);
        }
      }
      /**
       * Execute HTTP request with timeout
       */
      async executeRequest(request) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, this.config.timeout);
        try {
          this.logger.debug("Sending POST request", {
            endpoint: this.config.endpoint,
            timeout: this.config.timeout
          });
          const response = await fetch(this.config.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(request),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          this.logger.debug("Received response", {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get("content-type")
          });
          if (!response.ok) {
            const errorText = await response.text().catch(() => "Unable to read error response");
            throw new APIError2(APIErrorType2.HTTP_ERROR, `Server returned ${response.status}: ${response.statusText}`, response.status);
          }
          try {
            const json = await response.json();
            return json;
          } catch (parseError) {
            throw new APIError2(APIErrorType2.PARSE_ERROR, "Failed to parse server response as JSON", response.status, parseError);
          }
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            throw new APIError2(APIErrorType2.TIMEOUT, `Request timeout after ${this.config.timeout}ms`);
          }
          if (error instanceof TypeError) {
            throw new APIError2(APIErrorType2.NETWORK_ERROR, `Network error: ${error.message}`, void 0, error);
          }
          if (error instanceof APIError2) {
            throw error;
          }
          throw new APIError2(APIErrorType2.NETWORK_ERROR, "Unknown network error", void 0, error);
        }
      }
      /**
       * Validate response schema defensively
       */
      validateResponse(response) {
        this.logger.debug("Validating response schema");
        if (!response || typeof response !== "object") {
          throw new APIError2(APIErrorType2.INVALID_RESPONSE, "Response is not an object");
        }
        const record = response;
        if (typeof record.file_intent !== "string") {
          throw new APIError2(APIErrorType2.INVALID_RESPONSE, 'Missing or invalid "file_intent" field (expected string)');
        }
        if (!Array.isArray(record.responsibility_blocks)) {
          throw new APIError2(APIErrorType2.INVALID_RESPONSE, 'Missing or invalid "responsibility_blocks" field (expected array)');
        }
        const blocks = record.responsibility_blocks;
        for (let i = 0; i < blocks.length; i++) {
          this.validateResponsibilityBlock(blocks[i], i);
        }
        const metadata = record.metadata ?? {};
        if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
          throw new APIError2(APIErrorType2.INVALID_RESPONSE, 'Invalid "metadata" field (expected object)');
        }
        this.logger.debug("Response validation successful", {
          blockCount: blocks.length,
          fileIntentLength: record.file_intent.length
        });
        return {
          file_intent: record.file_intent,
          metadata,
          responsibility_blocks: blocks
        };
      }
      /**
       * Validate individual responsibility block
       */
      validateResponsibilityBlock(block, index) {
        if (!block || typeof block !== "object") {
          throw new APIError2(APIErrorType2.INVALID_RESPONSE, `Responsibility block at index ${index} is not an object`);
        }
        const record = block;
        if (typeof record.description !== "string") {
          throw new APIError2(APIErrorType2.INVALID_RESPONSE, `Block ${index}: missing or invalid "description" field (expected string)`);
        }
        if (typeof record.label !== "string") {
          throw new APIError2(APIErrorType2.INVALID_RESPONSE, `Block ${index}: missing or invalid "label" field (expected string)`);
        }
        if (!Array.isArray(record.ranges)) {
          throw new APIError2(APIErrorType2.INVALID_RESPONSE, `Block ${index}: missing or invalid "ranges" field (expected array)`);
        }
        const ranges = record.ranges;
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          if (!Array.isArray(range) || range.length !== 2) {
            throw new APIError2(APIErrorType2.INVALID_RESPONSE, `Block ${index}, range ${i}: invalid format (expected [number, number])`);
          }
          const [start, end] = range;
          if (typeof start !== "number" || typeof end !== "number") {
            throw new APIError2(APIErrorType2.INVALID_RESPONSE, `Block ${index}, range ${i}: invalid types (expected numbers)`);
          }
          if (start < 1 || end < 1 || start > end) {
            throw new APIError2(APIErrorType2.INVALID_RESPONSE, `Block ${index}, range ${i}: invalid values (start=${start}, end=${end})`);
          }
        }
      }
      /**
       * Get user-friendly error message from API error
       */
      static getUserMessage(error) {
        switch (error.type) {
          case APIErrorType2.NETWORK_ERROR:
            return "Unable to connect to IRIS server. Please check your connection.";
          case APIErrorType2.TIMEOUT:
            return "Analysis request timed out. The file may be too large or the server is busy.";
          case APIErrorType2.HTTP_ERROR:
            if (error.statusCode === 429) {
              return "Too many requests. Please wait a moment and try again.";
            }
            if (error.statusCode === 500) {
              return "Server error. Please try again later.";
            }
            return `Server error (${error.statusCode}). Please try again.`;
          case APIErrorType2.INVALID_RESPONSE:
            return "Received invalid response from server. The analysis may have failed.";
          case APIErrorType2.PARSE_ERROR:
            return "Failed to parse server response. Please try again.";
          default:
            return "Analysis failed due to an unknown error.";
        }
      }
    };
    exports2.IRISAPIClient = IRISAPIClient2;
  }
});

// ../iris-core/dist/utils/blockId.js
var require_blockId = __commonJS({
  "../iris-core/dist/utils/blockId.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generateBlockId = generateBlockId2;
    exports2.generateBlockIds = generateBlockIds;
    var crypto2 = __importStar(require("crypto"));
    function normalizeWhitespace(text) {
      return text.trim().replace(/\s+/g, " ");
    }
    function generateBlockId2(block) {
      const normalizedLabel = normalizeWhitespace(block.label);
      const normalizedDescription = normalizeWhitespace(block.description);
      const stringifiedRanges = JSON.stringify(block.ranges);
      const signature = {
        label: normalizedLabel,
        description: normalizedDescription,
        ranges: stringifiedRanges
      };
      const signatureString = JSON.stringify(signature);
      const hash = crypto2.createHash("sha1").update(signatureString).digest("hex");
      const blockId = `rb_${hash.slice(0, 12)}`;
      return blockId;
    }
    function generateBlockIds(blocks) {
      return blocks.map((block) => ({
        ...block,
        blockId: generateBlockId2(block)
      }));
    }
  }
});

// ../iris-core/dist/index.js
var require_dist = __commonJS({
  "../iris-core/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generateBlockIds = exports2.generateBlockId = exports2.APIErrorType = exports2.APIError = exports2.IRISAPIClient = exports2.IRISCoreState = exports2.IRISAnalysisState = void 0;
    var analysisState_1 = require_analysisState();
    Object.defineProperty(exports2, "IRISAnalysisState", { enumerable: true, get: function() {
      return analysisState_1.IRISAnalysisState;
    } });
    Object.defineProperty(exports2, "IRISCoreState", { enumerable: true, get: function() {
      return analysisState_1.IRISCoreState;
    } });
    var irisClient_1 = require_irisClient();
    Object.defineProperty(exports2, "IRISAPIClient", { enumerable: true, get: function() {
      return irisClient_1.IRISAPIClient;
    } });
    Object.defineProperty(exports2, "APIError", { enumerable: true, get: function() {
      return irisClient_1.APIError;
    } });
    Object.defineProperty(exports2, "APIErrorType", { enumerable: true, get: function() {
      return irisClient_1.APIErrorType;
    } });
    var blockId_1 = require_blockId();
    Object.defineProperty(exports2, "generateBlockId", { enumerable: true, get: function() {
      return blockId_1.generateBlockId;
    } });
    Object.defineProperty(exports2, "generateBlockIds", { enumerable: true, get: function() {
      return blockId_1.generateBlockIds;
    } });
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var path = __toESM(require("path"));
var vscode6 = __toESM(require("vscode"));
var import_core4 = __toESM(require_dist());

// src/state/irisState.ts
var vscode2 = __toESM(require("vscode"));
var import_core = __toESM(require_dist());

// src/utils/logger.ts
var vscode = __toESM(require("vscode"));
var Logger = class {
  outputChannel;
  componentName;
  constructor(outputChannel, componentName) {
    this.outputChannel = outputChannel;
    this.componentName = componentName;
  }
  /**
   * Log an informational message
   */
  info(message, context) {
    this.log("INFO" /* INFO */, message, context);
  }
  /**
   * Log a warning message
   */
  warn(message, context) {
    this.log("WARN" /* WARN */, message, context);
  }
  /**
   * Log an error message
   */
  error(message, context) {
    this.log("ERROR" /* ERROR */, message, context);
  }
  /**
   * Log a debug message (verbose)
   */
  debug(message, context) {
    this.log("DEBUG" /* DEBUG */, message, context);
  }
  /**
   * Log an error with exception details
   */
  errorWithException(message, error, context) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : void 0;
    this.log("ERROR" /* ERROR */, message, {
      ...context,
      error: errorMessage,
      stack: errorStack
    });
  }
  /**
   * Core logging function with structured format
   */
  log(level, message, context) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context, null, 0)}` : "";
    const logLine = `[${timestamp}] [${level}] [${this.componentName}] ${message}${contextStr}`;
    this.outputChannel.appendLine(logLine);
    if (level === "ERROR" /* ERROR */) {
      void vscode.window.showErrorMessage(`IRIS: ${message}`);
    }
  }
  /**
   * Show output channel to user
   */
  show(preserveFocus = true) {
    this.outputChannel.show(preserveFocus);
  }
};
function createLogger(outputChannel, componentName) {
  return new Logger(outputChannel, componentName);
}

// src/state/irisState.ts
var import_core2 = __toESM(require_dist());
var IRISStateManager = class {
  core;
  stateChangeEmitter;
  onStateChange;
  constructor(outputChannel) {
    const logger = createLogger(outputChannel, "StateManager");
    this.core = new import_core.IRISCoreState(logger);
    this.stateChangeEmitter = new vscode2.EventEmitter();
    this.onStateChange = this.stateChangeEmitter.event;
    this.core.onStateChange((state) => {
      this.stateChangeEmitter.fire(state);
    });
  }
  // State transitions
  startAnalysis(fileUri) {
    this.core.startAnalysis(fileUri);
  }
  setAnalyzed(data) {
    this.core.setAnalyzed(data);
  }
  setError(error, fileUri) {
    this.core.setError(error, fileUri);
  }
  setStale() {
    this.core.setStale();
  }
  reset() {
    this.core.reset();
  }
  // Selectors
  getCurrentState() {
    return this.core.getCurrentState();
  }
  getAnalysisData() {
    return this.core.getAnalysisData();
  }
  getFileIntent() {
    return this.core.getFileIntent();
  }
  getResponsibilityBlocks() {
    return this.core.getResponsibilityBlocks();
  }
  getMetadata() {
    return this.core.getMetadata();
  }
  getAnalyzedFileUri() {
    return this.core.getAnalyzedFileUri();
  }
  getActiveFileUri() {
    return this.core.getActiveFileUri();
  }
  hasAnalysisData() {
    return this.core.hasAnalysisData();
  }
  isAnalyzing() {
    return this.core.isAnalyzing();
  }
  isStale() {
    return this.core.isStale();
  }
  getRawResponse() {
    return this.core.getRawResponse();
  }
  // Selection
  selectBlock(blockId) {
    this.core.selectBlock(blockId);
  }
  deselectBlock() {
    this.core.deselectBlock();
  }
  getCurrentSegmentIndex() {
    return this.core.getCurrentSegmentIndex();
  }
  setCurrentSegmentIndex(index) {
    this.core.setCurrentSegmentIndex(index);
  }
  getSelectedBlockId() {
    return this.core.getSelectedBlockId();
  }
  isBlockSelected() {
    return this.core.isBlockSelected();
  }
  // Lifecycle
  dispose() {
    this.core.dispose();
    this.stateChangeEmitter.dispose();
  }
};

// src/webview/sidePanel.ts
var vscode3 = __toESM(require("vscode"));
var import_core3 = __toESM(require_dist());

// src/utils/colorAssignment.ts
var crypto = __toESM(require("crypto"));
var GOLDEN_RATIO = 0.618033988749895;
function getThemeConfig(isDarkTheme) {
  if (isDarkTheme) {
    return {
      baseLightness: 55,
      // Lighter colors for dark theme
      saturation: 65,
      // Moderate saturation
      contrastBackground: { r: 30, g: 30, b: 30 }
      // Dark background
    };
  } else {
    return {
      baseLightness: 70,
      // Softer colors for light theme
      saturation: 55,
      // Slightly lower saturation
      contrastBackground: { r: 255, g: 255, b: 255 }
      // Light background
    };
  }
}
function hslToRgb(hsl) {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p2, q2, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
      if (t < 1 / 2) return q2;
      if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
      return p2;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}
function getRelativeLuminance(rgb) {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function getContrastRatio(color1, color2) {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
function ensureContrast(hsl, background, minContrast = 3) {
  let adjustedHsl = { ...hsl };
  let rgb = hslToRgb(adjustedHsl);
  let contrast = getContrastRatio(rgb, background);
  const maxIterations = 20;
  let iterations = 0;
  const lightnessStep = 3;
  const isBackgroundDark = getRelativeLuminance(background) < 0.5;
  const direction = isBackgroundDark ? 1 : -1;
  while (contrast < minContrast && iterations < maxIterations) {
    adjustedHsl.l += direction * lightnessStep;
    adjustedHsl.l = Math.max(20, Math.min(85, adjustedHsl.l));
    rgb = hslToRgb(adjustedHsl);
    contrast = getContrastRatio(rgb, background);
    iterations++;
  }
  return adjustedHsl;
}
function generateHueFromBlockId(blockId) {
  const hash = crypto.createHash("sha256").update(blockId).digest();
  const primarySeed = hash.readUInt32BE(0) / 4294967295;
  const secondarySeed = hash.readUInt32BE(8) / 4294967295;
  const hue = (primarySeed * 360 + secondarySeed * GOLDEN_RATIO * 120) % 360;
  return hue;
}
function generateColorVariation(blockId, config) {
  const hash = crypto.createHash("sha256").update(blockId).digest();
  const saturationSeed = hash.readUInt8(4) / 255;
  const saturationVariation = (saturationSeed - 0.5) * 20;
  const lightnessSeed = hash.readUInt8(6) / 255;
  const lightnessVariation = (lightnessSeed - 0.5) * 15;
  return {
    s: Math.max(40, Math.min(80, config.saturation + saturationVariation)),
    l: Math.max(40, Math.min(80, config.baseLightness + lightnessVariation))
  };
}
function generateBlockColor(blockId, isDarkTheme) {
  const config = getThemeConfig(isDarkTheme);
  const hue = generateHueFromBlockId(blockId);
  const variation = generateColorVariation(blockId, config);
  let hslColor = {
    h: hue,
    s: variation.s,
    l: variation.l
  };
  hslColor = ensureContrast(hslColor, config.contrastBackground, 3);
  const rgb = hslToRgb(hslColor);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
}
function generateBlockColorOpaque(blockId, isDarkTheme) {
  const rgbaColor = generateBlockColor(blockId, isDarkTheme);
  return rgbaColor.replace(/,\s*[\d.]+\)$/, ", 1.0)");
}

// src/types/messages.ts
function isWebviewMessage(message) {
  if (!message || typeof message !== "object" || typeof message.type !== "string") {
    return false;
  }
  switch (message.type) {
    case "WEBVIEW_READY":
      return true;
    case "BLOCK_HOVER":
    case "BLOCK_SELECTED":
    case "BLOCK_DESELECTED":
      return typeof message.blockId === "string" && message.blockId.length > 0;
    case "SEGMENT_NAVIGATED":
      return typeof message.blockId === "string" && typeof message.segmentIndex === "number" && typeof message.totalSegments === "number";
    case "BLOCK_CLEAR":
    case "ESCAPE_PRESSED":
      return true;
    default:
      return false;
  }
}

// src/webview/sidePanel.ts
var IRISSidePanelProvider = class {
  constructor(extensionUri, stateManager, decorationManager, segmentNavigator, outputChannel) {
    this.extensionUri = extensionUri;
    this.stateManager = stateManager;
    this.decorationManager = decorationManager;
    this.segmentNavigator = segmentNavigator;
    this.logger = createLogger(outputChannel, "SidePanel");
    this.disposables.push(
      this.stateManager.onStateChange((state) => {
        this.handleStateChange(state);
      })
    );
    this.logger.info("Side panel provider created");
  }
  static viewType = "iris.sidePanel";
  view;
  stateManager;
  decorationManager;
  segmentNavigator;
  disposables = [];
  logger;
  /**
   * Called when the view is first resolved
   */
  resolveWebviewView(webviewView, context, token) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    this.logger.info("Webview view resolved");
    this.disposables.push(
      webviewView.webview.onDidReceiveMessage((message) => {
        this.handleWebviewMessage(message);
      })
    );
    this.renderCurrentState();
    webviewView.onDidDispose(() => {
      this.view = void 0;
      this.logger.info("Webview view disposed");
    });
  }
  /**
   * Handle state change events from state manager
   */
  handleStateChange(state) {
    this.logger.info(`State changed to: ${state}`);
    this.renderCurrentState();
    this.postMessageToWebview({
      type: "STATE_UPDATE",
      state
    });
  }
  /**
   * Handle messages from webview
   */
  handleWebviewMessage(message) {
    if (!isWebviewMessage(message)) {
      this.logger.warn("Received malformed message from webview", {
        messageType: message?.type,
        message: JSON.stringify(message)
      });
      return;
    }
    switch (message.type) {
      case "WEBVIEW_READY":
        this.handleWebviewReady();
        break;
      case "BLOCK_HOVER":
        this.handleBlockHover(message.blockId);
        break;
      // UI Refinement 2: Pin/unpin selection model message types
      case "BLOCK_SELECTED":
        this.handleBlockSelected(message.blockId);
        break;
      case "BLOCK_DESELECTED":
        this.handleBlockDeselected(message.blockId);
        break;
      case "SEGMENT_NAVIGATED":
        this.handleSegmentNavigated(message.blockId, message.segmentIndex, message.totalSegments);
        break;
      case "ESCAPE_PRESSED":
        this.handleEscapePressed();
        break;
      case "BLOCK_CLEAR":
        this.handleBlockClear();
        break;
      default:
        const _exhaustive = message;
        this.logger.warn("Unknown message type", { message });
    }
  }
  /**
   * Handle WEBVIEW_READY message
   * Sent when webview is fully initialized
   */
  handleWebviewReady() {
    this.logger.info("Webview ready signal received");
    const currentState = this.stateManager.getCurrentState();
    this.postMessageToWebview({
      type: "STATE_UPDATE",
      state: currentState
    });
    if (currentState === import_core3.IRISAnalysisState.ANALYZED) {
      const data = this.stateManager.getAnalysisData();
      if (data) {
        this.sendAnalysisData(data);
      }
    }
  }
  /**
   * Handle BLOCK_HOVER message
   * Triggers editor decorations
   */
  handleBlockHover(blockId) {
    this.logger.info("Block hover", { blockId });
    const activeEditor = vscode3.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn("No active editor for block hover");
      return;
    }
    const blocks = this.stateManager.getResponsibilityBlocks();
    if (!blocks) {
      this.logger.warn("No responsibility blocks available");
      return;
    }
    const block = blocks.find((b) => b.blockId === blockId);
    if (!block) {
      this.logger.warn("Block not found", { blockId });
      return;
    }
    this.decorationManager.applyBlockHover(activeEditor, block);
  }
  /**
   * Handle BLOCK_SELECTED message
   * Select block and apply persistent highlighting with segment navigation
   */
  handleBlockSelected(blockId) {
    this.logger.info("Block selected - pin/unpin model", { blockId });
    const activeEditor = vscode3.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn("No active editor for block select");
      return;
    }
    const blocks = this.stateManager.getResponsibilityBlocks();
    if (!blocks) {
      this.logger.warn("No responsibility blocks available");
      return;
    }
    const block = blocks.find((b) => b.blockId === blockId);
    if (!block) {
      this.logger.warn("Block not found", { blockId });
      return;
    }
    this.stateManager.selectBlock(blockId);
    const totalSegments = block.ranges.length;
    const currentSegment = 0;
    this.segmentNavigator.showNavigator(blockId, currentSegment, totalSegments);
    this.decorationManager.applyBlockSelection(activeEditor, block);
    if (block.ranges.length > 0) {
      const [startLine] = block.ranges[0];
      const padding = 3;
      const revealLine = Math.max(startLine - 1 - padding, 0);
      const revealPos = new vscode3.Position(revealLine, 0);
      activeEditor.revealRange(new vscode3.Range(revealPos, revealPos), vscode3.TextEditorRevealType.AtTop);
      const cursorPos = new vscode3.Position(startLine - 1, 0);
      activeEditor.selection = new vscode3.Selection(cursorPos, cursorPos);
    }
    vscode3.commands.executeCommand("setContext", "iris.blockSelected", true);
    this.logger.info("Block selected with segment navigator", {
      blockId,
      totalSegments,
      label: block.label
    });
  }
  /**
   * Handle BLOCK_CLEAR message
   */
  handleBlockClear() {
    this.logger.info("Block clear");
    const activeEditor = vscode3.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }
    this.decorationManager.clearCurrentHighlight(activeEditor);
  }
  /**
   * Handle BLOCK_DESELECTED message
   * Deselect block, clear highlighting, and hide segment navigator
   */
  handleBlockDeselected(blockId) {
    this.logger.info("Block deselected - pin/unpin model", { blockId });
    const activeEditor = vscode3.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }
    this.stateManager.deselectBlock();
    this.decorationManager.clearCurrentHighlight(activeEditor);
    this.segmentNavigator.hideNavigator();
    vscode3.commands.executeCommand("setContext", "iris.blockSelected", false);
    this.logger.info("Block deselected - navigator hidden", { blockId });
  }
  /**
   * Handle SEGMENT_NAVIGATED message
   * Scroll editor to target segment and update navigator indicator
   */
  handleSegmentNavigated(blockId, segmentIndex, totalSegments) {
    this.logger.info("Segment navigated", { blockId, segmentIndex, totalSegments });
    const activeEditor = vscode3.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn("No active editor for segment navigation");
      return;
    }
    const blocks = this.stateManager.getResponsibilityBlocks();
    if (!blocks) {
      this.logger.error("No responsibility blocks available for segment navigation");
      return;
    }
    const block = blocks.find((b) => b.blockId === blockId);
    if (!block || !block.ranges || segmentIndex >= block.ranges.length) {
      this.logger.error("Invalid segment navigation", { blockId, segmentIndex });
      return;
    }
    this.stateManager.setCurrentSegmentIndex(segmentIndex);
    const [startLine, endLine] = block.ranges[segmentIndex];
    const padding = 3;
    const revealLine = Math.max(startLine - 1 - padding, 0);
    const revealPos = new vscode3.Position(revealLine, 0);
    activeEditor.revealRange(new vscode3.Range(revealPos, revealPos), vscode3.TextEditorRevealType.AtTop);
    const cursorPos = new vscode3.Position(startLine - 1, 0);
    activeEditor.selection = new vscode3.Selection(cursorPos, cursorPos);
    this.segmentNavigator.updateNavigator(segmentIndex, totalSegments);
    this.logger.info("Scrolled to segment and updated navigator", {
      blockId,
      segmentIndex: segmentIndex + 1,
      totalSegments,
      startLine
    });
  }
  /**
   * Handle ESCAPE_PRESSED message
   * Deselect current block via Escape key
   */
  handleEscapePressed() {
    this.logger.info("Escape pressed - deselecting block");
    const selectedBlockId = this.stateManager.getSelectedBlockId();
    if (!selectedBlockId) {
      this.logger.info("No block selected - ignoring Escape");
      return;
    }
    const activeEditor = vscode3.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }
    this.stateManager.deselectBlock();
    this.decorationManager.clearCurrentHighlight(activeEditor);
    this.segmentNavigator.hideNavigator();
    vscode3.commands.executeCommand("setContext", "iris.blockSelected", false);
    this.sendStateUpdate();
    this.logger.info("Block deselected via Escape", { blockId: selectedBlockId });
  }
  /**
   * Send state update message to webview
   * Used for notifying webview of state changes
   */
  sendStateUpdate() {
    const currentState = this.stateManager.getCurrentState();
    this.postMessageToWebview({
      type: "STATE_UPDATE",
      state: currentState
    });
  }
  /**
   * Send navigation command to webview for segment navigation
   */
  sendNavigationCommand(direction) {
    if (!this.view) {
      this.logger.warn("Cannot send navigation command - webview not initialized");
      return;
    }
    this.postMessageToWebview({
      type: "NAVIGATE_SEGMENT",
      direction
    });
    this.logger.info("Sent segment navigation command", { direction });
  }
  /**
   * Post message to webview
   */
  postMessageToWebview(message) {
    if (!this.view) {
      return;
    }
    this.view.webview.postMessage(message);
    this.logger.info("Sent message to webview", { type: message.type });
  }
  /**
   * Send analysis data to webview
   */
  sendAnalysisData(data) {
    const message = {
      type: "ANALYSIS_DATA",
      payload: {
        fileIntent: data.fileIntent,
        metadata: data.metadata,
        responsibilityBlocks: data.responsibilityBlocks,
        analyzedFileUri: data.analyzedFileUri,
        analyzedAt: data.analyzedAt.toISOString()
      }
    };
    this.postMessageToWebview(message);
    this.logger.info("Sent analysis data to webview", {
      blockCount: data.responsibilityBlocks.length
    });
  }
  /**
   * Render webview content based on current state
   */
  renderCurrentState() {
    if (!this.view) {
      return;
    }
    const currentState = this.stateManager.getCurrentState();
    switch (currentState) {
      case import_core3.IRISAnalysisState.IDLE:
        this.renderIdleState();
        break;
      case import_core3.IRISAnalysisState.ANALYZING:
        this.renderAnalyzingState();
        break;
      case import_core3.IRISAnalysisState.ANALYZED:
        this.renderAnalyzedState();
        break;
      case import_core3.IRISAnalysisState.STALE:
        this.renderStaleState();
        break;
    }
  }
  /**
   * Render IDLE state: empty state message
   */
  renderIdleState() {
    if (!this.view) {
      return;
    }
    this.view.webview.html = this.getHtmlTemplate(
      "No Analysis Available",
      `
      <div class="empty-state">
        <div class="empty-icon">\u{1F4CA}</div>
        <h3>No Analysis Available</h3>
        <p>Run IRIS analysis on an active file to see results here.</p>
        <p class="hint">Use the command: <code>IRIS: Run Analysis</code></p>
      </div>
      `
    );
    this.logger.info("Rendered IDLE state");
  }
  /**
   * Render ANALYZING state: loading indicator
   */
  renderAnalyzingState() {
    if (!this.view) {
      return;
    }
    this.view.webview.html = this.getHtmlTemplate(
      "Analyzing...",
      `
      <div class="loading-state">
        <div class="spinner"></div>
        <h3>Analyzing...</h3>
        <p>IRIS is analyzing your code. This may take a few moments.</p>
      </div>
      `
    );
    this.logger.info("Rendered ANALYZING state");
  }
  /**
   * Render ANALYZED state: display File Intent and Responsibility Blocks
   */
  renderAnalyzedState() {
    if (!this.view) {
      return;
    }
    const data = this.stateManager.getAnalysisData();
    if (!data) {
      this.logger.warn("No analysis data available in ANALYZED state");
      this.renderIdleState();
      return;
    }
    this.sendAnalysisData(data);
    const fileIntentHtml = `
      <div class="file-intent-section">
        <div class="file-intent-content">
          ${this.escapeHtml(data.fileIntent)}
        </div>
      </div>
    `;
    const isDarkTheme = vscode3.window.activeColorTheme.kind === vscode3.ColorThemeKind.Dark || vscode3.window.activeColorTheme.kind === vscode3.ColorThemeKind.HighContrast;
    const blocksHtml = data.responsibilityBlocks.length > 0 ? `
        <div class="responsibility-blocks-section">
          <div class="blocks-list">
            ${data.responsibilityBlocks.map((block) => {
      const dotColor = generateBlockColorOpaque(block.blockId, isDarkTheme);
      return `
              <div class="block-item"
                   data-block-id="${block.blockId}"
                   onmouseenter="handleBlockHover('${block.blockId}')"
                   onmouseleave="handleBlockClear()"
                   onclick="handleBlockClick('${block.blockId}')">
                <div class="block-header">
                  <span class="block-dot" style="background: ${dotColor};"></span>
                  <span class="block-label">${this.escapeHtml(block.label)}</span>
                </div>
                <div class="block-description-container">
                  <div class="block-description">${this.escapeHtml(block.description)}</div>
                </div>
              </div>
            `;
    }).join("")}
          </div>
        </div>
      ` : `
        <div class="responsibility-blocks-section">
          <p class="no-blocks">No responsibility blocks identified.</p>
        </div>
      `;
    this.view.webview.html = this.getHtmlTemplate(
      "Analysis Results",
      fileIntentHtml + blocksHtml
    );
    this.logger.info("Rendered ANALYZED state", {
      blockCount: data.responsibilityBlocks.length
    });
  }
  /**
   * Render STALE state: outdated analysis warning
   */
  renderStaleState() {
    if (!this.view) {
      return;
    }
    const data = this.stateManager.getAnalysisData();
    this.postMessageToWebview({
      type: "ANALYSIS_STALE"
    });
    const warningBanner = `
      <div class="stale-banner">
        <div class="stale-icon">\u26A0\uFE0F</div>
        <div class="stale-message">
          <strong>Outdated Analysis</strong>
          <p>The file has been modified since this analysis. Results may no longer be accurate.</p>
          <p class="hint">Re-run analysis to update: <code>IRIS: Run Analysis</code></p>
        </div>
      </div>
    `;
    if (data) {
      const fileIntentHtml = `
        <div class="file-intent-section stale">
          <div class="file-intent-content">
            ${this.escapeHtml(data.fileIntent)}
          </div>
        </div>
      `;
      const isDarkThemeStale = vscode3.window.activeColorTheme.kind === vscode3.ColorThemeKind.Dark || vscode3.window.activeColorTheme.kind === vscode3.ColorThemeKind.HighContrast;
      const blocksHtml = data.responsibilityBlocks.length > 0 ? `
          <div class="responsibility-blocks-section stale">
            <div class="blocks-list">
              ${data.responsibilityBlocks.map((block) => {
        const dotColor = generateBlockColorOpaque(block.blockId, isDarkThemeStale);
        return `
                <div class="block-item" data-block-id="${block.blockId}">
                  <div class="block-header">
                    <span class="block-dot" style="background: ${dotColor};"></span>
                    <span class="block-label">${this.escapeHtml(block.label)}</span>
                  </div>
                  <div class="block-description-container">
                    <div class="block-description">${this.escapeHtml(block.description)}</div>
                  </div>
                </div>
              `;
      }).join("")}
            </div>
          </div>
        ` : "";
      this.view.webview.html = this.getHtmlTemplate(
        "Analysis Results (Outdated)",
        warningBanner + fileIntentHtml + blocksHtml
      );
    } else {
      this.renderIdleState();
    }
    this.logger.info("Rendered STALE state");
  }
  /**
   * Generate HTML template with consistent structure
   */
  getHtmlTemplate(title, bodyContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    /* CSS custom properties for reusable values */
    :root {
      --iris-spacing-xs: 4px;
      --iris-spacing-sm: 8px;
      --iris-spacing-md: 12px;
      --iris-spacing-lg: 16px;
      --iris-spacing-xl: 24px;
      --iris-border-radius: 6px;
      --iris-transition-fast: 0.15s ease;
      --iris-transition-normal: 0.2s ease;
      --iris-transition-slow: 0.3s ease;
    }
    
    body {
      padding: var(--iris-spacing-lg);
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: 13px;
      line-height: 1.6;
      overflow-y: overlay; /* Overlay scrollbar so it doesn't consume layout width */
    }
    
    
    h3 {
      margin: 0 0 var(--iris-spacing-sm) 0;
      font-size: 14px;
      font-weight: 600;
    }
    
    p {
      margin: 0 0 var(--iris-spacing-sm) 0;
    }
    
    code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
    }
    
    .hint {
      font-size: 0.9em;
      color: var(--vscode-descriptionForeground);
    }
    
    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 48px 16px;
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    /* Loading State */
    .loading-state {
      text-align: center;
      padding: 48px 16px;
    }
    
    .spinner {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      border: 4px solid var(--vscode-progressBar-background);
      border-top-color: var(--vscode-progressBar-foreground);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Stale Banner */
    .stale-banner {
      display: flex;
      gap: var(--iris-spacing-md);
      padding: var(--iris-spacing-md);
      margin-bottom: var(--iris-spacing-lg);
      background: var(--vscode-inputValidation-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      border-radius: var(--iris-border-radius);
      transition: all var(--iris-transition-normal);
    }
    
    .stale-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    
    .stale-message {
      flex: 1;
    }
    
    .stale-message strong {
      display: block;
      margin-bottom: var(--iris-spacing-xs);
      color: var(--vscode-inputValidation-warningForeground);
      font-weight: 600;
    }
    
    /* File Intent */
    .file-intent-section {
      margin-bottom: var(--iris-spacing-sm); 
    }
    
    .file-intent-content {
      padding: 0 0 var(--iris-spacing-lg) 0;
      background: transparent;
      border: none;
      font-size: 16px;
      line-height: 1.6;
      font-weight: 600;
      color: var(--vscode-foreground);
      transition: all var(--iris-transition-normal);
    }
    
    .file-intent-section.stale .file-intent-content {
      opacity: 0.6;
    }
    
    /* Responsibility Blocks Section */
    .responsibility-blocks-section {
      margin-bottom: var(--iris-spacing-lg);
    }
    
    .blocks-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .block-item {
      padding: 6px 8px;
      background: transparent;
      cursor: pointer;
      transition: background var(--iris-transition-fast);
      border-radius: 3px;
    }

    .block-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .block-item.active {
      background: var(--vscode-list-activeSelectionBackground);
    }

    .responsibility-blocks-section.stale .block-item {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .responsibility-blocks-section.stale .block-item:hover {
      background: transparent;
    }

    .block-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .block-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 5px;
    }

    .block-label {
      font-weight: 500;
      font-size: 13px;
      line-height: 1.4;
      color: var(--vscode-foreground);
    }

    .block-description-container {
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transition: max-height var(--iris-transition-slow),
                  opacity var(--iris-transition-normal),
                  padding var(--iris-transition-normal);
      padding-left: 14px;
    }

    .block-item:hover .block-description-container,
    .block-item.active .block-description-container {
      max-height: 200px;
      opacity: 1;
      padding-top: var(--iris-spacing-xs);
    }

    .block-description {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.5;
    }
    
    .no-blocks {
      padding: var(--iris-spacing-xl);
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      font-size: 13px;
    }
    
  </style>
</head>
<body>
  ${bodyContent}
  <script>
    // VS Code API for posting messages
    const vscode = acquireVsCodeApi();
    
    // Pin/unpin selection model state
    let selectedBlockId = null;
    
    let currentSegmentIndex = 0;
    let segmentCount = 0;
    let analysisData = null;
    
    // Send WEBVIEW_READY on initialization
    window.addEventListener('DOMContentLoaded', () => {
      vscode.postMessage({ type: 'WEBVIEW_READY' });
    });
    
    // Keyboard shortcuts for segment navigation
    window.addEventListener('keydown', (event) => {
      // Only process shortcuts when a block is selected
      if (!selectedBlockId) {
        return;
      }
      
      // Ctrl+Up navigates to previous segment
      if (event.ctrlKey && event.key === 'ArrowUp') {
        event.preventDefault();
        handleSegmentNavigation('prev');
        return;
      }
      
      // Ctrl+Down navigates to next segment
      if (event.ctrlKey && event.key === 'ArrowDown') {
        event.preventDefault();
        handleSegmentNavigation('next');
        return;
      }
      
      // Escape key deselects the block
      if (event.key === 'Escape') {
        event.preventDefault();
        executeDeselectBlock(selectedBlockId);
        return;
      }
    });
    
    // Handle block hover
    function handleBlockHover(blockId) {
      // Don't send hover if block is selected/pinned
      if (selectedBlockId !== null) {
        return;
      }
      vscode.postMessage({ type: 'BLOCK_HOVER', blockId: blockId });
    }

    // Handle block clear (mouse leave)
    function handleBlockClear() {
      // Don't send clear if block is selected/pinned
      if (selectedBlockId !== null) {
        return;
      }
      vscode.postMessage({ type: 'BLOCK_CLEAR' });
    }
    
    // Handle block click - pin/unpin toggle
    function handleBlockClick(blockId) {
      if (selectedBlockId === blockId) {
        // Block already selected - unpin it
        executeDeselectBlock(blockId);
      } else {
        // Block not selected - pin it
        executeSelectBlock(blockId);
      }
    }
    
    // Execute block selection (pin block)
    function executeSelectBlock(blockId) {
      if (!analysisData || !analysisData.responsibilityBlocks) {
        console.error('Cannot select block: no analysis data available');
        return;
      }
      
      const block = analysisData.responsibilityBlocks.find(b => b.blockId === blockId);
      if (!block) {
        console.error('Cannot select block: block not found', blockId);
        return;
      }
      
      // Update selection state
      selectedBlockId = blockId;
      
      // Reset segment index to 0 when selecting new block
      currentSegmentIndex = 0;
      
      // Calculate segment count from block ranges
      segmentCount = block.ranges ? block.ranges.length : 0;
      
      // Update DOM - set active class on clicked block
      document.querySelectorAll('.block-item').forEach(item => {
        if (item.dataset.blockId === blockId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
      
      // Send BLOCK_SELECTED message to extension with blockId
      vscode.postMessage({ type: 'BLOCK_SELECTED', blockId: blockId });
      
      console.log('Block selected:', blockId, 'segments:', segmentCount);
    }
    
    // Execute block deselection (unpin block)
    function executeDeselectBlock(blockId) {
      // Send BLOCK_DESELECTED message to extension
      vscode.postMessage({ type: 'BLOCK_DESELECTED', blockId: blockId });
      
      // Remove active class from all blocks
      document.querySelectorAll('.block-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Clear selection state
      selectedBlockId = null;
      currentSegmentIndex = 0;
      segmentCount = 0;
      
    }
    
    // Handle segment navigation for blocks with scattered ranges
    function handleSegmentNavigation(direction) {
      // Validate that a block is selected
      if (!selectedBlockId) {
        console.warn('Cannot navigate segments: no block selected');
        return;
      }
      
      // Get the selected block from analysis data
      if (!analysisData || !analysisData.responsibilityBlocks) {
        console.error('Cannot navigate: no analysis data available');
        return;
      }
      
      const block = analysisData.responsibilityBlocks.find(b => b.blockId === selectedBlockId);
      if (!block || !block.ranges || block.ranges.length === 0) {
        console.error('Cannot navigate: block has no ranges');
        return;
      }
      
      // Calculate new segment index based on direction
      let newIndex = currentSegmentIndex;
      if (direction === 'next') {
        newIndex = Math.min(currentSegmentIndex + 1, block.ranges.length - 1);
      } else if (direction === 'prev') {
        newIndex = Math.max(currentSegmentIndex - 1, 0);
      }
      
      // Only proceed if index actually changed
      if (newIndex === currentSegmentIndex) {
        console.log('Already at', direction === 'next' ? 'last' : 'first', 'segment');
        return;
      }
      
      // Update current segment index
      currentSegmentIndex = newIndex;
      
      // Send SEGMENT_NAVIGATED message with new index to extension
      vscode.postMessage({ 
        type: 'SEGMENT_NAVIGATED', 
        blockId: selectedBlockId,
        segmentIndex: currentSegmentIndex,
        totalSegments: block.ranges.length
      });
      
      console.log('Navigated to segment', currentSegmentIndex + 1, 'of', block.ranges.length);
    }
    
    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      console.log('Received message from extension:', message);
      
      // Store analysis data for segment navigation
      if (message.type === 'ANALYSIS_DATA') {
        analysisData = message.payload;
        console.log('Stored analysis data:', analysisData.responsibilityBlocks.length, 'blocks');
      }
      
      // Handle state changes
      if (message.type === 'STATE_UPDATE') {
        // Clear selection on state transitions to IDLE or STALE
        if (message.state === 'IDLE' || message.state === 'STALE') {
          if (selectedBlockId !== null) {
            console.log('Clearing selection due to state transition to', message.state);
            selectedBlockId = null;
            currentSegmentIndex = 0;
            segmentCount = 0;
            document.querySelectorAll('.block-item').forEach(item => {
              item.classList.remove('active');
            });
          }
        }
      }
      
      // Handle ESCAPE_PRESSED message
      if (message.type === 'ESCAPE_PRESSED') {
        selectedBlockId = null;
        currentSegmentIndex = 0;
        segmentCount = 0;
        document.querySelectorAll('.block-item').forEach(item => {
          item.classList.remove('active');
        });
      }

      // Handle NAVIGATE_SEGMENT message from keyboard shortcuts
      if (message.type === 'NAVIGATE_SEGMENT') {
        if (selectedBlockId !== null) {
          console.log('Navigating segment via keyboard shortcut:', message.direction);
          handleSegmentNavigation(message.direction);
        } else {
          console.log('No block selected, ignoring navigation command');
        }
      }
    });
  </script>
</body>
</html>`;
  }
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  /**
   * Notify webview that block has been deselected
   * Called by Esc key handler in extension.ts
   */
  notifyFocusCleared() {
    if (!this.view) {
      return;
    }
    this.postMessageToWebview({
      type: "STATE_UPDATE",
      state: this.stateManager.getCurrentState()
    });
    this.view.webview.postMessage({ type: "ESCAPE_PRESSED" });
    this.logger.info("Notified webview of escape pressed");
  }
  /**
   * Dispose resources
   */
  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.logger.info("Side panel provider disposed");
  }
};

// src/decorations/decorationManager.ts
var vscode4 = __toESM(require("vscode"));
var DecorationManager = class {
  decorationCache;
  currentlyHighlightedBlockId;
  currentlyFocusedBlockId;
  // UI Refinement 2: Tracks selected/pinned block
  outputChannel;
  logger;
  constructor(outputChannel) {
    this.outputChannel = outputChannel;
    this.logger = createLogger(outputChannel, "DecorationManager");
    this.decorationCache = /* @__PURE__ */ new Map();
    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    this.logger.info("Decoration manager initialized");
  }
  /**
   * Generate deterministic color from blockId using smart color assignment
   * Uses golden ratio distribution for visual distinctiveness and WCAG AA compliance
   */
  generateColorFromBlockId(blockId) {
    const isDarkTheme = vscode4.window.activeColorTheme.kind === vscode4.ColorThemeKind.Dark || vscode4.window.activeColorTheme.kind === vscode4.ColorThemeKind.HighContrast;
    const color = generateBlockColor(blockId, isDarkTheme);
    this.logger.debug(`Generated color for blockId`, { blockId, color, isDarkTheme });
    return color;
  }
  /**
   * Convert ONE-based API ranges to ZERO-based VS Code ranges
   */
  convertRangesToVSCode(apiRanges) {
    const vscodeRanges = apiRanges.map(([start, end]) => ({
      startLine: start - 1,
      // Convert ONE-based to ZERO-based
      endLine: end - 1
      // Convert ONE-based to ZERO-based
    }));
    this.logger.debug(`Converted ${apiRanges.length} ranges from ONE-based to ZERO-based`);
    return vscodeRanges;
  }
  /**
   * Create or retrieve cached decoration type for a blockId
   */
  getOrCreateDecorationType(blockId) {
    const cached = this.decorationCache.get(blockId);
    if (cached) {
      this.logger.debug("Using cached decoration type", { blockId });
      return cached.decorationType;
    }
    const isDarkTheme = vscode4.window.activeColorTheme.kind === vscode4.ColorThemeKind.Dark || vscode4.window.activeColorTheme.kind === vscode4.ColorThemeKind.HighContrast;
    const baseColor = generateBlockColor(blockId, isDarkTheme);
    const backgroundColor = baseColor.replace(/,\s*[\d.]+\)$/, ", 0.25)");
    const opaqueColor = generateBlockColorOpaque(blockId, isDarkTheme);
    const decorationType = vscode4.window.createTextEditorDecorationType({
      backgroundColor,
      // rgba with 0.25 alpha - renders behind text
      isWholeLine: true,
      rangeBehavior: vscode4.DecorationRangeBehavior.ClosedClosed,
      overviewRulerColor: opaqueColor,
      // Opaque for ruler visibility only
      overviewRulerLane: vscode4.OverviewRulerLane.Right
    });
    this.logger.info("Created new decoration type", { blockId, backgroundColor });
    return decorationType;
  }
  // ========================================
  // BLOCK SELECTION
  // ========================================
  /**
   * Prepare decoration data for a responsibility block
   * Converts ranges and creates/caches decoration type
   */
  prepareBlockDecoration(block) {
    const cached = this.decorationCache.get(block.blockId);
    if (cached) {
      return cached;
    }
    const decorationType = this.getOrCreateDecorationType(block.blockId);
    const ranges = this.convertRangesToVSCode(block.ranges);
    const decorationData = {
      blockId: block.blockId,
      ranges,
      decorationType
    };
    this.decorationCache.set(block.blockId, decorationData);
    this.logger.info("Prepared block decoration", {
      blockId: block.blockId,
      rangeCount: ranges.length,
      label: block.label
    });
    return decorationData;
  }
  /**
   * Apply decorations for a specific block on BLOCK_HOVER
   * Hover is disabled while a block is selected (pin/unpin model)
   */
  applyBlockHover(editor, block) {
    if (this.currentlyFocusedBlockId !== null) {
      this.logger.info("Hover disabled while block selected", {
        blockId: block.blockId,
        selectedBlockId: this.currentlyFocusedBlockId
      });
      return;
    }
    this.clearCurrentHighlight(editor);
    const decorationData = this.prepareBlockDecoration(block);
    const vscodeRanges = decorationData.ranges.map(
      (range) => new vscode4.Range(
        new vscode4.Position(range.startLine, 0),
        new vscode4.Position(range.endLine, Number.MAX_SAFE_INTEGER)
      )
    );
    editor.setDecorations(decorationData.decorationType, vscodeRanges);
    this.currentlyHighlightedBlockId = block.blockId;
    this.logger.info("Applied block hover decorations", {
      blockId: block.blockId,
      rangeCount: vscodeRanges.length,
      label: block.label
    });
  }
  /**
   * Clear currently highlighted block decorations
   */
  clearCurrentHighlight(editor) {
    if (!this.currentlyHighlightedBlockId) {
      return;
    }
    const decorationData = this.decorationCache.get(this.currentlyHighlightedBlockId);
    if (decorationData) {
      editor.setDecorations(decorationData.decorationType, []);
      this.logger.info("Cleared block highlight", {
        blockId: this.currentlyHighlightedBlockId
      });
    }
    this.currentlyHighlightedBlockId = null;
  }
  /**
   * Clear all decorations on BLOCK_CLEAR, IDLE, STALE
   */
  clearAllDecorations(editor) {
    if (editor) {
      for (const decorationData of this.decorationCache.values()) {
        editor.setDecorations(decorationData.decorationType, []);
      }
      this.logger.info("Cleared all decorations from editor", {
        editorUri: editor.document.uri.toString()
      });
    }
    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    this.logger.info("Cleared all decoration state");
  }
  // ========================================
  // BLOCK SELECTION - Pin/Unpin model
  // ========================================
  /**
   * Apply block selection highlighting
   * Applies persistent highlighting to all segments with consistent color
   */
  applyBlockSelection(editor, block) {
    this.clearCurrentHighlight(editor);
    this.clearBlockSelection(editor);
    const decorationData = this.prepareBlockDecoration(block);
    const vscodeRanges = decorationData.ranges.map(
      (range) => new vscode4.Range(
        new vscode4.Position(range.startLine, 0),
        new vscode4.Position(range.endLine, Number.MAX_SAFE_INTEGER)
      )
    );
    editor.setDecorations(decorationData.decorationType, vscodeRanges);
    this.currentlyFocusedBlockId = block.blockId;
    this.logger.info("Applied block selection", {
      blockId: block.blockId,
      rangeCount: vscodeRanges.length,
      label: block.label
    });
  }
  /**
   * Clear block selection highlighting
   */
  clearBlockSelection(editor, blockId) {
    const targetBlockId = blockId || this.currentlyFocusedBlockId;
    if (!targetBlockId) {
      return;
    }
    const decorationData = this.decorationCache.get(targetBlockId);
    if (decorationData) {
      editor.setDecorations(decorationData.decorationType, []);
      this.logger.info("Cleared block selection", { blockId: targetBlockId });
    }
    this.currentlyFocusedBlockId = null;
  }
  /**
   * Dispose all decoration types
   * Called on state transitions (STALE, IDLE) or extension deactivation
   */
  disposeAllDecorations() {
    const decorationCount = this.decorationCache.size;
    for (const decorationData of this.decorationCache.values()) {
      decorationData.decorationType.dispose();
    }
    this.decorationCache.clear();
    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    this.logger.info("Disposed all decoration types", {
      decorationCount
    });
  }
  /**
   * Get currently highlighted block ID
   */
  getCurrentlyHighlightedBlockId() {
    return this.currentlyHighlightedBlockId;
  }
  /**
   * Check if decorations exist for a block
   */
  hasDecorationsForBlock(blockId) {
    return this.decorationCache.has(blockId);
  }
  /**
   * Get count of cached decorations
   */
  getCachedDecorationCount() {
    return this.decorationCache.size;
  }
  /**
   * Dispose manager and all resources
   */
  dispose() {
    this.disposeAllDecorations();
    this.logger.info("Decoration manager disposed");
  }
};

// src/decorations/segmentNavigator.ts
var vscode5 = __toESM(require("vscode"));
var SegmentNavigator = class {
  outputChannel;
  logger;
  // Decoration types for navigation UI components
  upButtonDecorationType = null;
  downButtonDecorationType = null;
  indicatorDecorationType = null;
  // Current navigation state
  isVisible = false;
  currentBlockId = null;
  currentSegment = 0;
  totalSegments = 0;
  // Virtual line position for floating UI (placed after last visible line)
  virtualLinePosition = 0;
  constructor(outputChannel) {
    this.outputChannel = outputChannel;
    this.logger = createLogger(outputChannel, "SegmentNavigator");
    this.logger.info("Segment navigator initialized");
  }
  /**
   * Show segment navigator with current position indicator
   */
  showNavigator(blockId, currentSegment, totalSegments) {
    const editor = vscode5.window.activeTextEditor;
    if (!editor) {
      this.logger.warn("Cannot show navigator: no active editor");
      return;
    }
    this.logger.info("Showing segment navigator", { blockId, currentSegment, totalSegments });
    this.currentBlockId = blockId;
    this.currentSegment = currentSegment;
    this.totalSegments = totalSegments;
    this.isVisible = true;
    this.renderNavigator(editor);
  }
  /**
   * Update navigator with new segment position
   */
  updateNavigator(currentSegment, totalSegments) {
    if (!this.isVisible) {
      this.logger.warn("Cannot update navigator: not visible");
      return;
    }
    const editor = vscode5.window.activeTextEditor;
    if (!editor) {
      this.logger.warn("Cannot update navigator: no active editor");
      return;
    }
    this.logger.debug("Updating segment navigator", { currentSegment, totalSegments });
    this.currentSegment = currentSegment;
    this.totalSegments = totalSegments;
    this.renderNavigator(editor);
  }
  /**
   * Hide navigator and clear all decorations
   */
  hideNavigator() {
    if (!this.isVisible) {
      return;
    }
    this.logger.info("Hiding segment navigator", { blockId: this.currentBlockId });
    const editor = vscode5.window.activeTextEditor;
    if (editor) {
      this.clearDecorations(editor);
    }
    this.disposeDecorationTypes();
    this.isVisible = false;
    this.currentBlockId = null;
    this.currentSegment = 0;
    this.totalSegments = 0;
  }
  /**
   * Render navigator UI in editor using decorations
   */
  renderNavigator(editor) {
    this.clearDecorations(editor);
    this.disposeDecorationTypes();
    const lastLine = editor.document.lineCount - 1;
    this.virtualLinePosition = lastLine;
    this.createUpButtonDecoration(editor);
    this.createIndicatorDecoration(editor);
    this.createDownButtonDecoration(editor);
    this.logger.debug("Navigator rendered", {
      currentSegment: this.currentSegment,
      totalSegments: this.totalSegments,
      virtualLine: this.virtualLinePosition
    });
  }
  /**
   * Create up arrow button decoration
   * Disabled when at first segment
   */
  createUpButtonDecoration(editor) {
    const isDisabled = this.currentSegment === 0;
    const opacity = isDisabled ? "0.3" : "1.0";
    const cursor = isDisabled ? "not-allowed" : "pointer";
    const isDarkTheme = vscode5.window.activeColorTheme.kind === vscode5.ColorThemeKind.Dark || vscode5.window.activeColorTheme.kind === vscode5.ColorThemeKind.HighContrast;
    const textColor = isDarkTheme ? "#CCCCCC" : "#333333";
    const bgColor = isDarkTheme ? "rgba(60, 60, 60, 0.9)" : "rgba(245, 245, 245, 0.9)";
    const hoverBgColor = isDarkTheme ? "rgba(80, 80, 80, 0.95)" : "rgba(230, 230, 230, 0.95)";
    this.upButtonDecorationType = vscode5.window.createTextEditorDecorationType({
      after: {
        contentText: "\u2191",
        color: textColor,
        backgroundColor: bgColor,
        margin: "0 2px",
        width: "24px",
        height: "24px",
        textDecoration: `none; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          border-radius: 4px; 
          opacity: ${opacity}; 
          cursor: ${cursor};
          font-size: 16px;
          font-weight: bold;
          box-sizing: border-box;
          border: 1px solid ${isDarkTheme ? "rgba(100, 100, 100, 0.5)" : "rgba(200, 200, 200, 0.5)"};`
      },
      isWholeLine: false,
      rangeBehavior: vscode5.DecorationRangeBehavior.ClosedClosed
    });
    const range = new vscode5.Range(
      this.virtualLinePosition,
      0,
      this.virtualLinePosition,
      0
    );
    editor.setDecorations(this.upButtonDecorationType, [range]);
  }
  /**
   * Create segment indicator decoration (e.g., "2/5")
   * Shows current position among total segments
   */
  createIndicatorDecoration(editor) {
    const displayText = `${this.currentSegment + 1}/${this.totalSegments}`;
    const isDarkTheme = vscode5.window.activeColorTheme.kind === vscode5.ColorThemeKind.Dark || vscode5.window.activeColorTheme.kind === vscode5.ColorThemeKind.HighContrast;
    const textColor = isDarkTheme ? "#CCCCCC" : "#333333";
    const bgColor = isDarkTheme ? "rgba(50, 50, 50, 0.9)" : "rgba(250, 250, 250, 0.9)";
    this.indicatorDecorationType = vscode5.window.createTextEditorDecorationType({
      after: {
        contentText: displayText,
        color: textColor,
        backgroundColor: bgColor,
        margin: "0 2px",
        textDecoration: `none; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          padding: 2px 8px;
          border-radius: 4px; 
          font-family: monospace;
          font-size: 12px;
          font-weight: 500;
          box-sizing: border-box;
          border: 1px solid ${isDarkTheme ? "rgba(100, 100, 100, 0.5)" : "rgba(200, 200, 200, 0.5)"};
          min-width: 40px;`
      },
      isWholeLine: false,
      rangeBehavior: vscode5.DecorationRangeBehavior.ClosedClosed
    });
    const range = new vscode5.Range(
      this.virtualLinePosition,
      30,
      this.virtualLinePosition,
      30
    );
    editor.setDecorations(this.indicatorDecorationType, [range]);
  }
  /**
   * Create down arrow button decoration
   * Disabled when at last segment
   */
  createDownButtonDecoration(editor) {
    const isDisabled = this.currentSegment >= this.totalSegments - 1;
    const opacity = isDisabled ? "0.3" : "1.0";
    const cursor = isDisabled ? "not-allowed" : "pointer";
    const isDarkTheme = vscode5.window.activeColorTheme.kind === vscode5.ColorThemeKind.Dark || vscode5.window.activeColorTheme.kind === vscode5.ColorThemeKind.HighContrast;
    const textColor = isDarkTheme ? "#CCCCCC" : "#333333";
    const bgColor = isDarkTheme ? "rgba(60, 60, 60, 0.9)" : "rgba(245, 245, 245, 0.9)";
    this.downButtonDecorationType = vscode5.window.createTextEditorDecorationType({
      after: {
        contentText: "\u2193",
        color: textColor,
        backgroundColor: bgColor,
        margin: "0 2px",
        width: "24px",
        height: "24px",
        textDecoration: `none; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          border-radius: 4px; 
          opacity: ${opacity}; 
          cursor: ${cursor};
          font-size: 16px;
          font-weight: bold;
          box-sizing: border-box;
          border: 1px solid ${isDarkTheme ? "rgba(100, 100, 100, 0.5)" : "rgba(200, 200, 200, 0.5)"};`
      },
      isWholeLine: false,
      rangeBehavior: vscode5.DecorationRangeBehavior.ClosedClosed
    });
    const range = new vscode5.Range(
      this.virtualLinePosition,
      75,
      this.virtualLinePosition,
      75
    );
    editor.setDecorations(this.downButtonDecorationType, [range]);
  }
  /**
   * Clear all navigator decorations from editor
   */
  clearDecorations(editor) {
    if (this.upButtonDecorationType) {
      editor.setDecorations(this.upButtonDecorationType, []);
    }
    if (this.indicatorDecorationType) {
      editor.setDecorations(this.indicatorDecorationType, []);
    }
    if (this.downButtonDecorationType) {
      editor.setDecorations(this.downButtonDecorationType, []);
    }
  }
  /**
   * Dispose all decoration types to prevent memory leaks
   */
  disposeDecorationTypes() {
    if (this.upButtonDecorationType) {
      this.upButtonDecorationType.dispose();
      this.upButtonDecorationType = null;
    }
    if (this.indicatorDecorationType) {
      this.indicatorDecorationType.dispose();
      this.indicatorDecorationType = null;
    }
    if (this.downButtonDecorationType) {
      this.downButtonDecorationType.dispose();
      this.downButtonDecorationType = null;
    }
  }
  /**
   * Check if navigator is currently visible
   */
  isNavigatorVisible() {
    return this.isVisible;
  }
  /**
   * Get current segment index
   */
  getCurrentSegment() {
    return this.currentSegment;
  }
  /**
   * Get total segments count
   */
  getTotalSegments() {
    return this.totalSegments;
  }
  /**
   * Dispose all resources
   */
  dispose() {
    this.logger.info("Disposing segment navigator");
    const editor = vscode5.window.activeTextEditor;
    if (editor) {
      this.clearDecorations(editor);
    }
    this.disposeDecorationTypes();
    this.isVisible = false;
    this.currentBlockId = null;
  }
};

// src/extension.ts
var OUTPUT_CHANNEL_NAME = "IRIS";
var SUPPORTED_LANGUAGES = /* @__PURE__ */ new Set([
  "python",
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact"
]);
var ANALYZE_ENDPOINT = "http://localhost:8080/api/iris/analyze";
var REQUEST_TIMEOUT_MS = 15e3;
function activate(context) {
  const outputChannel = vscode6.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(outputChannel);
  const logger = createLogger(outputChannel, "Extension");
  logger.info("Extension activated", { version: context.extension.packageJSON.version });
  const stateManager = new IRISStateManager(outputChannel);
  context.subscriptions.push(stateManager);
  const decorationManager = new DecorationManager(outputChannel);
  context.subscriptions.push(decorationManager);
  const segmentNavigator = new SegmentNavigator(outputChannel);
  context.subscriptions.push(segmentNavigator);
  const apiClient = new import_core4.IRISAPIClient(
    {
      endpoint: ANALYZE_ENDPOINT,
      timeout: REQUEST_TIMEOUT_MS
    },
    createLogger(outputChannel, "APIClient")
  );
  stateManager.onStateChange((newState) => {
    const activeEditor = vscode6.window.activeTextEditor;
    if (newState === import_core4.IRISAnalysisState.IDLE || newState === import_core4.IRISAnalysisState.STALE) {
      if (activeEditor) {
        decorationManager.clearAllDecorations(activeEditor);
      }
      decorationManager.disposeAllDecorations();
      logger.info("Cleared decorations", { state: newState });
    }
  });
  const sidePanelProvider = new IRISSidePanelProvider(
    context.extensionUri,
    stateManager,
    decorationManager,
    segmentNavigator,
    outputChannel
  );
  context.subscriptions.push(
    vscode6.window.registerWebviewViewProvider(
      IRISSidePanelProvider.viewType,
      sidePanelProvider
    )
  );
  context.subscriptions.push(sidePanelProvider);
  const exitFocusModeCommand = vscode6.commands.registerCommand("iris.exitFocusMode", async () => {
    try {
      logger.info("Command executed: iris.exitFocusMode (deselect block)");
      const activeEditor = vscode6.window.activeTextEditor;
      if (!activeEditor) {
        logger.warn("No active editor for deselect block");
        return;
      }
      const selectedBlockId = stateManager.getSelectedBlockId();
      if (selectedBlockId) {
        logger.info("Deselecting block via Esc key", { blockId: selectedBlockId });
        stateManager.deselectBlock();
        decorationManager.clearCurrentHighlight(activeEditor);
        segmentNavigator.hideNavigator();
        vscode6.commands.executeCommand("setContext", "iris.blockSelected", false);
        sidePanelProvider.sendStateUpdate();
        logger.info("Block deselected via Esc key");
      } else {
        logger.info("No selected block to deselect");
      }
    } catch (error) {
      logger.error("Failed to deselect block", { error: String(error) });
    }
  });
  context.subscriptions.push(exitFocusModeCommand);
  const navigatePreviousSegmentCommand = vscode6.commands.registerCommand("iris.navigatePreviousSegment", async () => {
    try {
      logger.info("Command executed: iris.navigatePreviousSegment");
      const selectedBlockId = stateManager.getSelectedBlockId();
      if (!selectedBlockId) {
        logger.warn("No selected block for segment navigation");
        return;
      }
      sidePanelProvider.sendNavigationCommand("prev");
      logger.info("Sent navigate previous segment command to webview", { blockId: selectedBlockId });
    } catch (error) {
      logger.error("Failed to navigate to previous segment", { error: String(error) });
    }
  });
  context.subscriptions.push(navigatePreviousSegmentCommand);
  const navigateNextSegmentCommand = vscode6.commands.registerCommand("iris.navigateNextSegment", async () => {
    try {
      logger.info("Command executed: iris.navigateNextSegment");
      const selectedBlockId = stateManager.getSelectedBlockId();
      if (!selectedBlockId) {
        logger.warn("No selected block for segment navigation");
        return;
      }
      sidePanelProvider.sendNavigationCommand("next");
      logger.info("Sent navigate next segment command to webview", { blockId: selectedBlockId });
    } catch (error) {
      logger.error("Failed to navigate to next segment", { error: String(error) });
    }
  });
  context.subscriptions.push(navigateNextSegmentCommand);
  vscode6.commands.executeCommand("setContext", "iris.blockSelected", false);
  const disposable = vscode6.commands.registerCommand("iris.runAnalysis", async () => {
    try {
      outputChannel.show(true);
      logger.info("Command executed: iris.runAnalysis");
      if (stateManager.isAnalyzing()) {
        logger.warn("Analysis already in progress, ignoring duplicate trigger");
        vscode6.window.showWarningMessage("IRIS: Analysis already in progress.");
        return;
      }
      const activeEditor = vscode6.window.activeTextEditor;
      if (!activeEditor) {
        logger.warn("No active editor found");
        vscode6.window.showInformationMessage("IRIS: No active editor to analyze.");
        return;
      }
      const document = activeEditor.document;
      const filePath = document.uri.fsPath;
      const fileUri = document.uri.toString();
      const fileName = path.basename(filePath);
      const languageId = document.languageId;
      const sourceCode = document.getText();
      const lineCount = document.lineCount;
      logger.info("Analyzing file", {
        fileName,
        languageId,
        filePath,
        lineCount,
        sourceLength: sourceCode.length
      });
      if (!SUPPORTED_LANGUAGES.has(languageId)) {
        logger.warn("Unsupported language detected", { languageId });
        vscode6.window.showWarningMessage(
          `IRIS: Unsupported language "${languageId}". Supported: ${Array.from(SUPPORTED_LANGUAGES).join(", ")}`
        );
        return;
      }
      const sourceWithLineNumbers = sourceCode.split("\n").map((line, idx) => `${idx + 1} | ${line}`).join("\n");
      const payload = {
        filename: fileName,
        language: languageId,
        source_code: sourceWithLineNumbers,
        metadata: {
          filepath: filePath,
          line_count: lineCount
        }
      };
      stateManager.startAnalysis(fileUri);
      await vscode6.window.withProgress(
        {
          location: vscode6.ProgressLocation.Notification,
          title: "IRIS",
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: "Analyzing file..." });
          try {
            logger.info("Sending analysis request");
            const response = await apiClient.analyze(payload);
            if (response.responsibility_blocks.length === 0) {
              logger.warn("Server returned empty responsibility blocks");
              vscode6.window.showWarningMessage("IRIS: No responsibility blocks found in file.");
              stateManager.setError("No responsibility blocks found", fileUri);
              return;
            }
            const normalizedBlocks = response.responsibility_blocks.map((block) => ({
              ...block,
              blockId: (0, import_core4.generateBlockId)(block)
            }));
            stateManager.setAnalyzed({
              fileIntent: response.file_intent,
              metadata: response.metadata,
              responsibilityBlocks: normalizedBlocks,
              rawResponse: {
                file_intent: response.file_intent,
                metadata: response.metadata,
                responsibility_blocks: response.responsibility_blocks
              },
              analyzedFileUri: fileUri,
              analyzedAt: /* @__PURE__ */ new Date()
            });
            logger.info("Analysis completed successfully", {
              blockCount: normalizedBlocks.length,
              fileIntent: response.file_intent.substring(0, 50)
            });
            vscode6.window.showInformationMessage("IRIS: Analysis completed successfully.");
          } catch (error) {
            if (error instanceof import_core4.APIError) {
              const userMessage = import_core4.IRISAPIClient.getUserMessage(error);
              logger.error("API error during analysis", {
                type: error.type,
                statusCode: error.statusCode,
                message: error.message
              });
              stateManager.setError(error.message, fileUri);
              vscode6.window.showErrorMessage(`IRIS: ${userMessage}`);
            } else {
              const message = error instanceof Error ? error.message : "Unknown error";
              logger.errorWithException("Unexpected error during analysis", error);
              stateManager.setError(message, fileUri);
              vscode6.window.showErrorMessage("IRIS: Analysis failed due to an unexpected error.");
            }
          }
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.errorWithException("Command execution failed", error);
      stateManager.setError(message);
      vscode6.window.showErrorMessage("IRIS: Analysis failed.");
    }
  });
  context.subscriptions.push(disposable);
  context.subscriptions.push(
    vscode6.workspace.onDidChangeTextDocument((event) => {
      const currentState = stateManager.getCurrentState();
      if (currentState !== import_core4.IRISAnalysisState.ANALYZED) {
        return;
      }
      const analyzedFileUri = stateManager.getAnalyzedFileUri();
      if (!analyzedFileUri || event.document.uri.toString() !== analyzedFileUri) {
        return;
      }
      if (event.contentChanges.length === 0) {
        return;
      }
      logger.info("File modification detected - invalidating analysis", {
        changedFile: event.document.uri.toString(),
        changeCount: event.contentChanges.length,
        transition: "ANALYZED \u2192 STALE"
      });
      stateManager.setStale();
      logger.info("Analysis invalidated - state updated to STALE");
    })
  );
  context.subscriptions.push(
    vscode6.window.onDidChangeActiveTextEditor((editor) => {
      const selectedBlockId = stateManager.getSelectedBlockId();
      if (selectedBlockId && editor) {
        logger.info("Active editor changed - clearing block selection");
        stateManager.deselectBlock();
        decorationManager.clearBlockSelection(editor);
      }
    })
  );
  logger.info("Extension activation complete", {
    supportedLanguages: Array.from(SUPPORTED_LANGUAGES)
  });
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
