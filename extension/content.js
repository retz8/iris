// =============================================================================
// IRIS - Intelligent Review & Insight System (Noise Eraser v1)
// =============================================================================
// Cognitive audit lens that reduces noise in code review by dimming
// non-essential code patterns (error handling, logging, imports, guards).
// Approach: Visual hierarchy modification through CSS opacity rather than
// content replacement, allowing quick toggle between focused and full view.
// =============================================================================

(function () {
  "use strict";

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================
  const LENS_CONFIG = {
    pythonColor: "#2563eb",
    buttonActiveColor: "#16a34a",
    buttonInactiveColor: "#2563eb",

    selectors: {
      codeTextarea: '#read-only-cursor-text-area[aria-label="file content"]',
      reactLineContents: ".react-code-line-contents-no-virtualization",
      reactLineById: '[id^="LC"]',
      reactCodeContainer: ".react-code-lines",
      reactBlobCode: '[data-testid="blob-code"]',
      legacyBlobCode: ".blob-wrapper table td.blob-code",
      legacyBlobPre: ".blob-wrapper pre",
    },

    supportedExtensions: [".cpp", ".cc", ".cxx", ".hpp", ".h"],
  };

  // ===========================================================================
  // STATE
  // ===========================================================================
  const lensState = {
    active: false,
    noiseLines: [],           // [3, 4, 5, 12, 13]
    noiseRanges: [],          // [{start, end, type}]
    dimmedElements: new WeakMap(),  // element -> {originalOpacity, originalClassName}
    language: null,

    // Legacy state maintained for backward compatibility during transition
    pythonLines: [],
    pythonFullCode: "",

    originalState: {
      textareaValue: "",
      // WeakMap allows garbage collection when elements are removed from DOM
      elementData: new WeakMap(),  // element -> { originalHTML, originalWhiteSpace, originalTabSize, lineNum }
      lineNumbers: [],  // Track which line numbers we've processed
    },

    observer: null,
    button: null,
    isConverting: false,
  };

  // ===========================================================================
  // INITIALIZE HANDLERS
  // ===========================================================================
  const textareaHandler = new TextareaHandler(LENS_CONFIG.selectors);
  const eventHandlers = new EventHandlers(LENS_CONFIG, lensState, {
    onToggle: handleButtonClick,
  });

  // ===========================================================================
  // CORE LENS FUNCTIONS
  // ===========================================================================

  function storeOriginalState() {
    const textarea = document.querySelector(LENS_CONFIG.selectors.codeTextarea);
    if (textarea) {
      lensState.originalState.textareaValue = textarea.value;
    }

    const lineElements = DOMHelpers.getCodeLineElements(LENS_CONFIG.selectors);
    
    lineElements.forEach((el) => {
      const lineNum = DOMHelpers.getLineNumber(el);
      
      lensState.originalState.elementData.set(el, {
        originalHTML: el.innerHTML,
        originalWhiteSpace: el.style.whiteSpace,
        originalTabSize: el.style.tabSize,
        lineNum: lineNum,
      });
      
      if (!lensState.originalState.lineNumbers.includes(lineNum)) {
        lensState.originalState.lineNumbers.push(lineNum);
      }
    });

    console.log(
      "[Lens] Stored original state for",
      lineElements.length,
      "lines"
    );
  }

  function replaceWithPython() {
    const lineElements = DOMHelpers.getCodeLineElements(LENS_CONFIG.selectors);

    lineElements.forEach((el) => {
      const lineNum = DOMHelpers.getLineNumber(el);
      if (lineNum === null || lineNum < 1) return;

      const pythonLine = lensState.pythonLines[lineNum - 1];
      const displayText = pythonLine !== undefined ? pythonLine : "";

      DOMHelpers.applyPythonToElement(el, displayText, LENS_CONFIG.pythonColor);
    });

    // Update the textarea
    textareaHandler.replaceWithPython(lensState.pythonFullCode);

    console.log("[Lens] Replaced", lineElements.length, "lines with Python");
  }

  function restoreOriginal() {
    const lineElements = DOMHelpers.getCodeLineElements(LENS_CONFIG.selectors);
    
    lineElements.forEach((element) => {
      const data = lensState.originalState.elementData.get(element);
      if (data && element.isConnected) {
        element.innerHTML = data.originalHTML;
        element.style.whiteSpace = data.originalWhiteSpace || "";
        element.style.tabSize = data.originalTabSize || "";
      }
    });

    textareaHandler.restore();

    console.log("[Lens] Restored original C++ code");
  }

  // ===========================================================================
  // NOISE DIMMING FUNCTIONS (Noise Eraser v1)
  // ===========================================================================

  function applyNoiseDimming(noiseLines) {
    const lineElements = DOMHelpers.getCodeLineElements(LENS_CONFIG.selectors);
    
    lineElements.forEach((el) => {
      const lineNum = DOMHelpers.getLineNumber(el);
      
      if (lineNum !== null && noiseLines.includes(lineNum)) {
        // Store original state
        lensState.dimmedElements.set(el, {
          opacity: el.style.opacity || '1',
          className: el.className
        });
        
        // Apply dimming
        el.style.opacity = '0.2';
        el.classList.add('iris-noise-dimmed');
      }
    });

    console.log("[Lens] Dimmed", noiseLines.length, "noise lines");
  }

  function removeDimming() {
    const lineElements = DOMHelpers.getCodeLineElements(LENS_CONFIG.selectors);
    
    lineElements.forEach((el) => {
      const original = lensState.dimmedElements.get(el);
      if (original) {
        el.style.opacity = original.opacity;
        el.classList.remove('iris-noise-dimmed');
      }
    });
    
    lensState.dimmedElements = new WeakMap();
    console.log("[Lens] Removed all dimming");
  }

  // ===========================================================================
  // MUTATION HANDLER
  // ===========================================================================

  function handleNewLines() {
    if (!lensState.active) return;

    // Re-apply dimming to any new lines that match our noise pattern
    applyNoiseDimming(lensState.noiseLines);
  }

  function activateLens() {
    console.log("[Lens] Activating Focus Mode with", lensState.noiseLines.length, "noise lines");

    applyNoiseDimming(lensState.noiseLines);
    eventHandlers.setupMutationObserver(handleNewLines);

    lensState.active = true;
    eventHandlers.updateButtonState();

    console.log("[Lens] Focus Mode activated - Noise dimmed");
  }

  function deactivateLens() {
    eventHandlers.disconnectObserver();

    removeDimming();

    lensState.active = false;
    eventHandlers.updateButtonState();

    console.log("[Lens] Focus Mode deactivated - All code visible");
  }

  // ===========================================================================
  // BACKEND COMMUNICATION
  // ===========================================================================

  async function analyzeCode(code, language) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { 
          action: "analyzeCode",
          code: code,
          language: language 
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || "Analysis failed"));
          }
        }
      );
    });
  }

  // Legacy convert function (maintained for backward compatibility)
  async function convertCode(cppCode) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "convertCode", code: cppCode },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.success) {
            const data = response.data;
            let lines = data.lines;
            if (!lines || lines.length === 0) {
              lines = data.python.split("\n");
            }
            resolve({
              python: data.python,
              lines: lines,
            });
          } else {
            reject(new Error(response?.error || "Conversion failed"));
          }
        }
      );
    });
  }

  // ===========================================================================
  // BUTTON HANDLER
  // ===========================================================================

  async function handleButtonClick() {
    if (lensState.isConverting) return;

    if (lensState.active) {
      // Deactivate: remove dimming
      deactivateLens();
    } else {
      // Check if we already have noise data (for re-activation)
      if (lensState.noiseLines.length > 0) {
        activateLens();
      } else {
        // First activation: analyze code
        const code = DOMHelpers.extractCode(LENS_CONFIG.selectors);
        if (!code) {
          console.error("[Lens] Could not extract code");
          alert("Could not extract code from this page.");
          return;
        }

        const language = DOMHelpers.detectLanguage();
        console.log("[Lens] Analyzing code...", "Language:", language);
        
        lensState.isConverting = true;
        eventHandlers.updateButtonState();

        try {
          const result = await analyzeCode(code, language);
          lensState.isConverting = false;
          
          // Store noise data
          lensState.noiseLines = result.noise_lines || [];
          lensState.noiseRanges = result.noise_ranges || [];
          lensState.language = result.language || language;
          
          console.log("[Lens] Analysis complete:", lensState.noiseLines.length, "noise lines detected");
          
          activateLens();
        } catch (error) {
          lensState.isConverting = false;
          eventHandlers.updateButtonState();
          console.error("[Lens] Analysis error:", error);
          alert(`Analysis failed: ${error.message}`);
        }
      }
    }
  }

  // ===========================================================================
  // NAVIGATION HANDLING
  // ===========================================================================

  function resetLensState() {
    if (lensState.active) {
      deactivateLens();
    }
    
    // Reset noise-related state
    lensState.noiseLines = [];
    lensState.noiseRanges = [];
    lensState.dimmedElements = new WeakMap();
    lensState.language = null;
    
    // Reset legacy state
    lensState.pythonLines = [];
    lensState.pythonFullCode = "";
    lensState.originalState.elementData = new WeakMap();
    lensState.originalState.lineNumbers = [];
    lensState.originalState.textareaValue = "";

    textareaHandler.reset();
  }

  function initializeLens() {
    resetLensState();

    if (!DOMHelpers.isGitHubBlobPage()) {
      eventHandlers.removeButton();
      return;
    }

    // Show button for all code files (not just C++)
    const language = DOMHelpers.detectLanguage();
    if (!language) {
      eventHandlers.removeButton();
      return;
    }

    if (!lensState.button || !lensState.button.isConnected) {
      eventHandlers.createButton(handleButtonClick);
    }

    eventHandlers.updateButtonState();
    console.log("[Lens] Initialized for", language, "file");
  }

  function setupNavigationDetection() {
    let lastUrl = window.location.href;

    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log("[Lens] Navigation detected");
        setTimeout(initializeLens, 500);
      }
    }, 500);

    window.addEventListener("popstate", () => {
      setTimeout(initializeLens, 500);
    });

    document.addEventListener("turbo:load", () => {
      setTimeout(initializeLens, 100);
    });

    document.addEventListener("turbo:render", () => {
      setTimeout(initializeLens, 100);
    });
  }

  // ===========================================================================
  // MAIN
  // ===========================================================================

  function main() {
    console.log("[Lens] C++ to Python Lens loaded");
    initializeLens();
    setupNavigationDetection();
    eventHandlers.setupKeyboardShortcuts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
