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

    // Settings
    settings: {
      noiseOpacity: 0.2,
      enabledNoiseTypes: {
        error_handling: true,
        logging: true,
        imports: true,
        guards: true,
        boilerplate: true,
      },
    },

    // Analytics
    analytics: {
      totalActivations: 0,
      languageUsage: {},
      totalNoiseLines: 0,
      totalCodeLines: 0,
    },

    observer: null,
    button: null,
    settingsPanel: null,
    isConverting: false,
  };

  // ===========================================================================
  // INITIALIZE HANDLERS
  // ===========================================================================
  const eventHandlers = new EventHandlers(LENS_CONFIG, lensState, {
    onToggle: handleButtonClick,
  });

  // ===========================================================================
  // SETTINGS & ANALYTICS
  // ===========================================================================

  function loadSettings() {
    try {
      const savedSettings = localStorage.getItem('iris-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        lensState.settings = { ...lensState.settings, ...parsed };
      }
    } catch (e) {
      console.error('[Lens] Failed to load settings:', e);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem('iris-settings', JSON.stringify(lensState.settings));
      console.log('[Lens] Settings saved');
    } catch (e) {
      console.error('[Lens] Failed to save settings:', e);
    }
  }

  function loadAnalytics() {
    try {
      const savedAnalytics = localStorage.getItem('iris-analytics');
      if (savedAnalytics) {
        const parsed = JSON.parse(savedAnalytics);
        lensState.analytics = { ...lensState.analytics, ...parsed };
      }
    } catch (e) {
      console.error('[Lens] Failed to load analytics:', e);
    }
  }

  function saveAnalytics() {
    try {
      localStorage.setItem('iris-analytics', JSON.stringify(lensState.analytics));
    } catch (e) {
      console.error('[Lens] Failed to save analytics:', e);
    }
  }

  function trackActivation(language, noiseLines, totalLines) {
    lensState.analytics.totalActivations++;
    lensState.analytics.languageUsage[language] = 
      (lensState.analytics.languageUsage[language] || 0) + 1;
    lensState.analytics.totalNoiseLines += noiseLines;
    lensState.analytics.totalCodeLines += totalLines;
    saveAnalytics();
  }

  function getAverageNoisePercentage() {
    if (lensState.analytics.totalCodeLines === 0) return 0;
    return ((lensState.analytics.totalNoiseLines / lensState.analytics.totalCodeLines) * 100).toFixed(1);
  }

  function createSettingsPanel() {
    if (lensState.settingsPanel && lensState.settingsPanel.isConnected) {
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'iris-settings-panel';
    panel.innerHTML = `
      <div class="iris-settings-header">
        <h3>⚙️ Focus Mode Settings</h3>
        <button class="iris-settings-close-btn">×</button>
      </div>
      <div class="iris-settings-content">
        <div class="iris-settings-section">
          <div class="iris-settings-section-title">Noise Intensity</div>
          <div class="iris-slider-container">
            <div class="iris-slider-label">
              <span>Opacity Level</span>
              <span class="iris-slider-value">${(lensState.settings.noiseOpacity * 100).toFixed(0)}%</span>
            </div>
            <input type="range" class="iris-slider" id="iris-opacity-slider" 
              min="10" max="50" step="5" value="${lensState.settings.noiseOpacity * 100}">
          </div>
        </div>
        
        <div class="iris-settings-section">
          <div class="iris-settings-section-title">Noise Types</div>
          ${createNoiseTypeToggles()}
        </div>

        <div class="iris-settings-section">
          <div class="iris-settings-section-title">Usage Statistics</div>
          <div class="iris-analytics-stats">
            <div class="iris-stat-card">
              <div class="iris-stat-label">Total Uses</div>
              <div class="iris-stat-value">${lensState.analytics.totalActivations}</div>
            </div>
            <div class="iris-stat-card">
              <div class="iris-stat-label">Avg Noise</div>
              <div class="iris-stat-value">${getAverageNoisePercentage()}%</div>
            </div>
          </div>
          <div class="iris-language-stats">
            ${createLanguageStats()}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    lensState.settingsPanel = panel;

    // Event listeners
    panel.querySelector('.iris-settings-close-btn').addEventListener('click', () => {
      panel.classList.remove('show');
    });

    const opacitySlider = panel.querySelector('#iris-opacity-slider');
    opacitySlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) / 100;
      lensState.settings.noiseOpacity = value;
      panel.querySelector('.iris-slider-value').textContent = `${e.target.value}%`;
      document.documentElement.style.setProperty('--iris-noise-opacity', value);
      saveSettings();
    });

    // Noise type toggles
    Object.keys(lensState.settings.enabledNoiseTypes).forEach(type => {
      const toggle = panel.querySelector(`#iris-toggle-${type}`);
      if (toggle) {
        toggle.addEventListener('click', () => {
          lensState.settings.enabledNoiseTypes[type] = !lensState.settings.enabledNoiseTypes[type];
          toggle.classList.toggle('active');
          saveSettings();
          
          // Reapply dimming if active
          if (lensState.active) {
            removeDimming();
            applyNoiseDimming(filterNoiseLinesByType(lensState.noiseRanges));
          }
        });
      }
    });

    console.log('[Lens] Settings panel created');
  }

  function createNoiseTypeToggles() {
    const typeIcons = {
      error_handling: '⚠️',
      logging: '📝',
      imports: '📦',
      guards: '🛡️',
      boilerplate: '🔧',
    };

    const typeLabels = {
      error_handling: 'Error Handling',
      logging: 'Logging',
      imports: 'Imports',
      guards: 'Guard Clauses',
      boilerplate: 'Boilerplate',
    };

    return Object.entries(lensState.settings.enabledNoiseTypes)
      .map(([type, enabled]) => `
        <div class="iris-noise-type-toggle">
          <div class="iris-noise-type-label">
            <span class="iris-noise-type-icon">${typeIcons[type]}</span>
            <span>${typeLabels[type]}</span>
          </div>
          <div class="iris-toggle-switch ${enabled ? 'active' : ''}" id="iris-toggle-${type}">
            <div class="iris-toggle-slider"></div>
          </div>
        </div>
      `).join('');
  }

  function createLanguageStats() {
    const entries = Object.entries(lensState.analytics.languageUsage)
      .sort((a, b) => b[1] - a[1]);
    
    if (entries.length === 0) {
      return '<div class="iris-language-stat"><span class="iris-language-name">No data yet</span></div>';
    }

    return entries.map(([lang, count]) => `
      <div class="iris-language-stat">
        <span class="iris-language-name">${lang}</span>
        <span class="iris-language-count">${count}</span>
      </div>
    `).join('');
  }

  function toggleSettingsPanel() {
    if (!lensState.settingsPanel) {
      createSettingsPanel();
    }
    lensState.settingsPanel.classList.toggle('show');
  }

  function filterNoiseLinesByType(noiseRanges) {
    const enabledTypes = Object.keys(lensState.settings.enabledNoiseTypes)
      .filter(type => lensState.settings.enabledNoiseTypes[type]);
    
    const filteredLines = [];
    noiseRanges.forEach(range => {
      if (enabledTypes.includes(range.type)) {
        for (let i = range.start; i <= range.end; i++) {
          filteredLines.push(i);
        }
      }
    });
    
    return [...new Set(filteredLines)].sort((a, b) => a - b);
  }

  // ===========================================================================
  // NOISE DIMMING FUNCTIONS (Noise Eraser v1)
  // ===========================================================================

  function applyNoiseDimming(noiseLines) {
    const lineElements = DOMHelpers.getCodeLineElements(LENS_CONFIG.selectors);
    console.log("[Lens] Applying dimming to", noiseLines.length, "lines");
    // Apply custom opacity from settings
    document.documentElement.style.setProperty('--iris-noise-opacity', lensState.settings.noiseOpacity);
    
    lineElements.forEach((el) => {
      const lineNum = DOMHelpers.getLineNumber(el);
      
      if (lineNum !== null && noiseLines.includes(lineNum)) {
        // Store original state
        lensState.dimmedElements.set(el, {
          opacity: el.style.opacity || '1',
          className: el.className
        });
        
        // Apply dimming with CSS class (uses CSS variable for opacity)
        el.classList.add('iris-noise-dimmed');
      }
    });

    console.log("[Lens] Dimmed", noiseLines.length, "noise lines with opacity", lensState.settings.noiseOpacity);
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

    // Re-apply dimming to noise lines
    applyNoiseDimming(lensState.noiseLines);
  }

  function activateLens() {
    console.log("[Lens] Activating Focus Mode with", lensState.noiseLines.length, "noise lines");

    // Use noise lines directly (heuristic scoring doesn't use type filtering)
    applyNoiseDimming(lensState.noiseLines);
    eventHandlers.setupMutationObserver(handleNewLines);

    lensState.active = true;
    eventHandlers.updateButtonState();

    // Track analytics
    const totalLines = DOMHelpers.getCodeLineElements(LENS_CONFIG.selectors).length;
    trackActivation(lensState.language, lensState.noiseLines.length, totalLines);

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
      eventHandlers.createButton(handleButtonClick, toggleSettingsPanel);
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
    console.log("[Lens] IRIS Noise Eraser v1 loaded");
    
    // Load saved settings and analytics
    loadSettings();
    loadAnalytics();
    
    // Apply saved opacity setting
    document.documentElement.style.setProperty('--iris-noise-opacity', lensState.settings.noiseOpacity);
    
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
