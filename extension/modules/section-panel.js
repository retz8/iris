// =============================================================================
// IRIS - Section Panel Module (Phase 1.2)
// =============================================================================
// Displays code structure analysis in a sidebar panel with:
// - File overview statistics
// - Function list with sections
// - Click-to-jump navigation
// - Visual highlighting
// =============================================================================

class SectionPanel {
  constructor() {
    this.panel = null;
    this.data = null;
    this.isVisible = false;
    
    // GitHub DOM selectors (must be defined here since LENS_CONFIG is in content.js IIFE)
    this.selectors = {
      codeTextarea: '#read-only-cursor-text-area[aria-label="file content"]',
      reactLineContents: ".react-code-line-contents-no-virtualization",
      reactLineById: '[id^="LC"]',
      reactCodeContainer: ".react-code-lines",
      reactBlobCode: '[data-testid="blob-code"]',
      legacyBlobCode: ".blob-wrapper table td.blob-code",
      legacyBlobPre: ".blob-wrapper pre",
    };
  }
  
  async analyze() {
    console.log('[IRIS] Starting structure analysis...');
    
    // 1. Extract code from GitHub page
    const code = DOMHelpers.extractCode(this.selectors);
    const language = DOMHelpers.detectLanguage();
    const filepath = window.location.pathname;
    
    if (!code) {
      console.error('[IRIS] Could not extract code');
      alert('Failed to extract code from page. Please refresh and try again.');
      return;
    }
    
    // Validate language is supported
    const supportedLanguages = ['javascript', 'typescript', 'python', 'go', 'java', 'c', 'cpp'];
    if (!supportedLanguages.includes(language)) {
      console.warn('[IRIS] Unsupported language:', language);
      alert(`Language "${language}" is not yet supported.\n\nSupported languages:\n• JavaScript (.js, .jsx, .mjs, .cjs)\n• TypeScript (.ts, .tsx)\n• Python (.py, .pyw, .pyi)\n• Go (.go)\n• Java (.java)\n• C (.c, .h)\n• C++ (.cpp, .cc, .cxx, .hpp)`);
      return;
    }
    
    console.log('[IRIS] ✅ Detected language:', language.toUpperCase(), '| Code length:', code.length, 'chars');
    console.log('[IRIS] File path:', filepath);
    
    // 2. Call backend API via background script
    try {
      const response = await chrome.runtime.sendMessage({
        action: "analyzeStructure",
        code: code,
        language: language,
        filepath: filepath
      });
      
      if (response.success) {
        this.data = response.data;
        console.log('[IRIS] Analysis complete:', this.data);
        this.render();
      } else {
        console.error('[IRIS] Analysis failed:', response.error);
        alert('Structure analysis failed: ' + response.error);
      }
    } catch (error) {
      console.error('[IRIS] API call failed:', error);
      alert('Failed to communicate with backend. Is the server running?');
    }
  }
  
  render() {
    // Remove existing panel if any
    if (this.panel) {
      this.panel.remove();
    }
    
    // Create panel container
    this.panel = document.createElement('div');
    this.panel.id = 'iris-section-panel';
    this.panel.className = 'iris-panel';
    
    // Styling
    Object.assign(this.panel.style, {
      position: 'fixed',
      right: '0',
      top: '60px',
      width: '360px',
      height: 'calc(100vh - 60px)',
      background: '#1e1e1e',
      borderLeft: '1px solid #3d3d3d',
      zIndex: '9998',
      overflowY: 'auto',
      boxShadow: '-4px 0 12px rgba(0,0,0,0.3)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'transform 0.3s ease',
      transform: 'translateX(0)'
    });
    
    // Header
    const header = this._createHeader();
    this.panel.appendChild(header);
    
    // Language badge
    const languageBadge = this._createLanguageBadge();
    this.panel.appendChild(languageBadge);
    
    // File summary
    const summary = this._createFileSummary();
    this.panel.appendChild(summary);
    
    // Functions list
    const functionsList = this._createFunctionsList();
    this.panel.appendChild(functionsList);
    
    // Add to page
    document.body.appendChild(this.panel);
    this.isVisible = true;
    
    // Adjust code view width
    this._adjustCodeViewWidth(true);
    
    console.log('[IRIS] Panel rendered');
  }
  
  _createHeader() {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      border-bottom: 1px solid #3d3d3d;
      position: sticky;
      top: 0;
      background: #1e1e1e;
      z-index: 10;
    `;
    
    header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 20px;">🤖</span>
          <span style="font-weight: 600; margin-left: 8px; color: #fff;">IRIS</span>
          <span style="font-size: 12px; color: #999; margin-left: 8px;">Structure View</span>
        </div>
        <button id="iris-close-panel" style="
          background: none;
          border: none;
          color: #999;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          line-height: 1;
        ">×</button>
      </div>
    `;
    
    // Close button handler
    header.querySelector('#iris-close-panel').addEventListener('click', () => {
      this.hide();
    });
    
    return header;
  }
  
  _createLanguageBadge() {
    const container = document.createElement('div');
    container.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid #3d3d3d;';
    
    const languageColors = {
      'javascript': '#f7df1e',
      'typescript': '#3178c6',
      'python': '#3776ab',
      'go': '#00add8',
      'java': '#b07219',
      'c': '#555555',
      'cpp': '#f34b7d'
    };
    
    const languageNames = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'go': 'Go',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++'
    };
    
    const language = this.data.language || 'javascript';
    const color = languageColors[language] || '#999';
    const displayName = languageNames[language] || language;
    
    container.innerHTML = `
      <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; background: #2d2d2d; border-radius: 6px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color};"></div>
        <span style="font-size: 13px; color: #d4d4d4; font-weight: 500;">${displayName}</span>
      </div>
    `;
    
    return container;
  }
  
  _createFileSummary() {
    const summary = this.data.file_summary;
    const container = document.createElement('div');
    container.style.cssText = 'padding: 16px;';
    
    const complexityColor = {
      'low': '#3fb950',
      'medium': '#d29922',
      'high': '#f85149'
    }[summary.complexity] || '#8b949e';
    
    container.innerHTML = `
      <div style="
        padding: 12px;
        background: #2d2d2d;
        border-radius: 8px;
        margin-bottom: 16px;
      ">
        <div style="font-size: 12px; color: #999; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          📊 File Overview
        </div>
        <div style="display: flex; gap: 16px; font-size: 13px; color: #d4d4d4;">
          <span><strong>${summary.total_lines}</strong> lines</span>
          <span><strong>${summary.total_functions}</strong> functions</span>
          <span style="color: ${complexityColor}"><strong>${summary.complexity}</strong> complexity</span>
        </div>
      </div>
    `;
    
    return container;
  }
  
  _createFunctionsList() {
    const container = document.createElement('div');
    container.style.cssText = 'padding: 0 16px 16px 16px;';
    
    if (this.data.functions.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #8b949e;">
          <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
          <div style="font-size: 14px;">No functions detected in this file</div>
        </div>
      `;
      return container;
    }
    
    this.data.functions.forEach(func => {
      const funcCard = this._createFunctionCard(func);
      container.appendChild(funcCard);
    });
    
    return container;
  }
  
  _createFunctionCard(func) {
    const card = document.createElement('div');
    card.className = 'iris-function-card';
    card.style.cssText = `
      margin-bottom: 16px;
      background: #2d2d2d;
      border-radius: 8px;
      overflow: hidden;
    `;
    
    // Function header
    const header = document.createElement('div');
    header.className = 'iris-function-header';
    header.style.cssText = `
      padding: 12px;
      border-bottom: 1px solid #1e1e1e;
      cursor: pointer;
      transition: background 0.2s ease;
    `;
    
    const paramsList = func.params && func.params.length > 0 
      ? func.params.join(', ') 
      : '';
    const paramsDisplay = paramsList.length > 30 
      ? paramsList.substring(0, 30) + '...' 
      : paramsList;
    
    header.innerHTML = `
      <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">
        ${this._escapeHtml(func.name)}(${this._escapeHtml(paramsDisplay)})
      </div>
      <div style="font-size: 12px; color: #999;">
        Lines ${func.start_line}-${func.end_line} • ${func.sections.length} sections
      </div>
    `;
    
    // Hover effect
    header.addEventListener('mouseenter', () => {
      header.style.background = '#3d3d3d';
    });
    header.addEventListener('mouseleave', () => {
      header.style.background = 'transparent';
    });
    
    // Click to jump to function
    header.addEventListener('click', () => {
      this._scrollToLine(func.start_line);
      this._highlightLines(func.start_line, func.end_line);
    });
    
    card.appendChild(header);
    
    // Sections
    const sectionsContainer = document.createElement('div');
    sectionsContainer.style.cssText = 'padding: 8px;';
    
    func.sections.forEach(section => {
      const sectionItem = this._createSectionItem(section);
      sectionsContainer.appendChild(sectionItem);
    });
    
    card.appendChild(sectionsContainer);
    
    return card;
  }
  
  _createSectionItem(section) {
    const item = document.createElement('div');
    item.className = 'iris-section-item';
    item.dataset.start = section.start_line;
    item.dataset.end = section.end_line;
    
    item.style.cssText = `
      padding: 10px;
      margin-bottom: 6px;
      background: #1e1e1e;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      border-left: 3px solid ${this._getSectionColor(section.type)};
    `;
    
    item.innerHTML = `
      <div style="display: flex; align-items: start; gap: 10px;">
        <div style="font-size: 18px; line-height: 1;">${section.icon}</div>
        <div style="flex: 1;">
          <div style="font-size: 13px; font-weight: 500; color: #fff; margin-bottom: 4px;">
            ${this._formatSectionType(section.type)}
          </div>
          <div style="font-size: 11px; color: #999;">
            Lines ${section.start_line}-${section.end_line} • ${section.line_count} lines
          </div>
        </div>
      </div>
    `;
    
    // Hover effect
    item.addEventListener('mouseenter', () => {
      item.style.background = '#2d2d2d';
      item.style.transform = 'translateX(-4px)';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.background = '#1e1e1e';
      item.style.transform = 'translateX(0)';
    });
    
    // Click to jump
    item.addEventListener('click', () => {
      const start = parseInt(item.dataset.start);
      const end = parseInt(item.dataset.end);
      this._scrollToLine(start);
      this._highlightLines(start, end);
    });
    
    return item;
  }
  
  _formatSectionType(type) {
    const names = {
      'setup': 'Setup',
      'validation': 'Validation',
      'processing': 'Processing',
      'api_call': 'API Call',
      'error_handling': 'Error Handling',
      'cleanup': 'Cleanup',
      'assignment': 'Assignment',
      'return': 'Return',
      'other': 'Other'
    };
    return names[type] || type;
  }
  
  _getSectionColor(type) {
    const colors = {
      'setup': '#58a6ff',
      'validation': '#3fb950',
      'processing': '#d29922',
      'api_call': '#a371f7',
      'error_handling': '#f85149',
      'cleanup': '#8b949e',
      'assignment': '#79c0ff',
      'return': '#bc8cff',
      'other': '#6e7681'
    };
    return colors[type] || '#6e7681';
  }
  
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  _scrollToLine(lineNumber) {
    const lineElement = document.querySelector(`#LC${lineNumber}`);
    if (lineElement) {
      lineElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      console.log('[IRIS] Scrolled to line', lineNumber);
    } else {
      console.warn(`[IRIS] Line element #LC${lineNumber} not found`);
    }
  }
  
  _highlightLines(start, end) {
    // Remove existing highlights
    document.querySelectorAll('.iris-highlighted').forEach(el => {
      el.classList.remove('iris-highlighted');
    });
    
    // Add new highlights
    for (let i = start; i <= end; i++) {
      const line = document.querySelector(`#LC${i}`);
      if (line) {
        line.classList.add('iris-highlighted');
      }
    }
    
    console.log('[IRIS] Highlighted lines', start, '-', end);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      document.querySelectorAll('.iris-highlighted').forEach(el => {
        el.classList.remove('iris-highlighted');
      });
    }, 3000);
  }
  
  _adjustCodeViewWidth(expand) {
    const container = document.querySelector('.repository-content');
    if (container) {
      container.style.marginRight = expand ? '380px' : '0';
      container.style.transition = 'margin-right 0.3s ease';
    }
  }
  
  hide() {
    if (this.panel) {
      this.panel.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (this.panel) {
          this.panel.remove();
          this.panel = null;
        }
        this.isVisible = false;
        this._adjustCodeViewWidth(false);
      }, 300);
    }
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else if (this.data) {
      this.render();
    } else {
      this.analyze();
    }
  }
}
