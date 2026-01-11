// =============================================================================
// IRIS - Intelligent Review & Insight System
// Minimal version: Button + Analysis Request
// =============================================================================

(function () {
  "use strict";

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================
  const CONFIG = {
    selectors: {
      codeTextarea: '#read-only-cursor-text-area[aria-label="file content"]',
      reactLineContents: ".react-code-line-contents-no-virtualization",
      reactLineById: '[id^="LC"]',
      reactCodeContainer: ".react-code-lines",
      reactBlobCode: '[data-testid="blob-code"]',
      legacyBlobCode: ".blob-wrapper table td.blob-code",
      legacyBlobPre: ".blob-wrapper pre",
    },
  };

  // ===========================================================================
  // STATE
  // ===========================================================================
  let analyzeButton = null;
  let isAnalyzing = false;

  // ===========================================================================
  // IRIS ANALYSIS REQUEST
  // ===========================================================================

  /**
   * Send code to IRIS backend for analysis
   */
  async function analyzeWithIRIS(filename, language, code) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "analyzeCodeWithIris",
          filename: filename,
          language: language,
          code: code,
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

  // ===========================================================================
  // BUTTON HANDLER
  // ===========================================================================

  async function handleAnalyzeClick() {
    if (isAnalyzing) return;

    // Extract code from page
    const code = DOMHelpers.extractCode(CONFIG.selectors);
    if (!code) {
      console.error("[IRIS] Could not extract code from page");
      return;
    }

    // Get file metadata
    const filename = DOMHelpers.getFilename() || "unknown.txt";
    const language = DOMHelpers.detectLanguage();

    console.log("[IRIS] Analyzing:", filename, "Language:", language);

    // Update button state
    isAnalyzing = true;
    if (analyzeButton) {
      analyzeButton.textContent = "⏳ Analyzing...";
      analyzeButton.disabled = true;
    }

    try {
      const result = await analyzeWithIRIS(filename, language, code);
      console.log("[IRIS] Analysis complete:", result);
    } catch (error) {
      console.error("[IRIS] Analysis error:", error);
    } finally {
      isAnalyzing = false;
      if (analyzeButton) {
        analyzeButton.textContent = "🤖 Analyze";
        analyzeButton.disabled = false;
      }
    }
  }

  // ===========================================================================
  // BUTTON CREATION
  // ===========================================================================

  function createAnalyzeButton() {
    // Remove existing button if any
    if (analyzeButton && analyzeButton.isConnected) {
      analyzeButton.remove();
    }

    const button = document.createElement("button");
    button.id = "iris-analyze-btn";
    button.textContent = "🤖 Analyze";
    button.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      padding: 10px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      width: 200px;
      height: 40px;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      transition: all 0.2s ease;
    `;

    button.addEventListener("mouseenter", () => {
      if (!isAnalyzing) {
        button.style.transform = "translateY(-2px)";
        button.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.15)";
      }
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    });

    button.addEventListener("click", handleAnalyzeClick);

    document.body.appendChild(button);
    analyzeButton = button;

    console.log("[IRIS] Analyze button created");
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  function initialize() {
    // Only show button on GitHub blob pages
    if (!DOMHelpers.isGitHubBlobPage()) {
      console.log("[IRIS] Not a GitHub blob page, skipping initialization");
      return;
    }

    createAnalyzeButton();
  }

  function cleanup() {
    if (analyzeButton && analyzeButton.isConnected) {
      analyzeButton.remove();
      analyzeButton = null;
    }
  }

  // ===========================================================================
  // NAVIGATION HANDLING
  // ===========================================================================

  function setupNavigationDetection() {
    let lastUrl = window.location.href;

    // Poll for URL changes
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log("[IRIS] Navigation detected");
        cleanup();
        setTimeout(initialize, 500);
      }
    }, 500);

    // Listen for browser navigation events
    window.addEventListener("popstate", () => {
      cleanup();
      setTimeout(initialize, 500);
    });

    // Listen for Turbo (GitHub's navigation library)
    document.addEventListener("turbo:load", () => {
      cleanup();
      setTimeout(initialize, 100);
    });

    document.addEventListener("turbo:render", () => {
      cleanup();
      setTimeout(initialize, 100);
    });
  }

  // ===========================================================================
  // MAIN
  // ===========================================================================

  function main() {
    console.log("[IRIS] Extension loaded");

    initialize();
    setupNavigationDetection();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
