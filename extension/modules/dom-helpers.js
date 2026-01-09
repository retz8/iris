// =============================================================================
// DOM Helpers - GitHub DOM queries and code manipulation
// =============================================================================

window.DOMHelpers = {
  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Create the HTML for a Python line, matching GitHub's code structure
   */
  createPythonLineHTML(displayText, pythonColor) {
    if (displayText === "") {
      return `<span class="pl-lens-python" style="color: ${pythonColor};"> </span>`;
    } else {
      const escapedContent = this.escapeHtml(displayText);
      return `<span class="pl-lens-python" style="color: ${pythonColor}; white-space: pre;">${escapedContent}</span>`;
    }
  },

  /**
   * Apply Python content to a line element
   */
  applyPythonToElement(el, displayText, pythonColor) {
    el.innerHTML = this.createPythonLineHTML(displayText, pythonColor);
    el.style.whiteSpace = "pre";
    el.style.tabSize = "4";
  },

  /**
   * Check if current page is a C++ file
   */
  isCppFile(supportedExtensions) {
    const path = window.location.pathname;
    return supportedExtensions.some((ext) => path.toLowerCase().endsWith(ext));
  },

  /**
   * Check if current page is a GitHub blob page
   */
  isGitHubBlobPage() {
    return (
      window.location.hostname === "github.com" &&
      window.location.pathname.includes("/blob/")
    );
  },

  /**
   * Extract line number from element
   */
  getLineNumber(el) {
    if (el.id) {
      const idMatch = el.id.match(/^LC(\d+)$/);
      if (idMatch) return parseInt(idMatch[1], 10);
    }

    if (el.dataset?.lineNumber) {
      return parseInt(el.dataset.lineNumber, 10);
    }

    const rowWithData = el.closest("[data-line-number]");
    if (rowWithData) {
      return parseInt(rowWithData.dataset.lineNumber, 10);
    }

    const parentRow = el.closest(".react-code-line");
    if (parentRow) {
      const lineNumEl = parentRow.querySelector(".react-line-number");
      if (lineNumEl) {
        return parseInt(lineNumEl.textContent, 10);
      }
    }

    const tableRow = el.closest("tr");
    if (tableRow) {
      const lineNumCell = tableRow.querySelector(".blob-num");
      if (lineNumCell) {
        const num = parseInt(
          lineNumCell.textContent || lineNumCell.dataset?.lineNumber,
          10
        );
        if (!isNaN(num)) return num;
      }
    }

    return null;
  },

  /**
   * Extract code from the page
   */
  extractCodeFromPage(selectors) {
    const textarea = document.querySelector(selectors.codeTextarea);
    if (textarea && textarea.value) {
      return textarea.value;
    }

    const lineSelectors = [
      selectors.reactLineContents,
      selectors.reactLineById,
      selectors.legacyBlobCode,
    ];

    for (const selector of lineSelectors) {
      const lines = document.querySelectorAll(selector);
      if (lines.length > 0) {
        const codeLines = [];
        lines.forEach((el) => {
          const lineNum = this.getLineNumber(el);
          if (lineNum !== null) {
            while (codeLines.length < lineNum) {
              codeLines.push("");
            }
            codeLines[lineNum - 1] = el.textContent || "";
          }
        });
        return codeLines.join("\n");
      }
    }

    const preBlock = document.querySelector(selectors.legacyBlobPre);
    if (preBlock) {
      return preBlock.textContent;
    }

    return null;
  },

  /**
   * Get all code line elements
   */
  getCodeLineElements(selectors) {
    let elements = document.querySelectorAll(selectors.reactLineContents);
    if (elements.length > 0) return Array.from(elements);

    elements = document.querySelectorAll(selectors.reactLineById);
    if (elements.length > 0) return Array.from(elements);

    elements = document.querySelectorAll(selectors.legacyBlobCode);
    if (elements.length > 0) return Array.from(elements);

    return [];
  },

  /**
   * Get code container element
   */
  getCodeContainer(selectors) {
    return (
      document.querySelector(selectors.reactBlobCode) ||
      document.querySelector(selectors.reactCodeContainer) ||
      document.querySelector(".blob-wrapper")
    );
  },

  /**
   * Detect programming language from file extension in URL
   * Supports: JavaScript, TypeScript, Python, Go, Java, C, C++
   * 
   * IMPORTANT: Language identifiers must match backend AST parser:
   * - Backend expects: 'javascript', 'typescript', 'python', 'go', 'java', 'c', 'cpp'
   * - Do NOT use 'js', 'ts', 'py', etc. - use full names
   * - TypeScript MUST be separate from JavaScript for proper AST parsing
   * 
   * @returns {string} Language identifier (lowercase)
   */
  detectLanguage() {
    const path = window.location.pathname;
    
    // Language mappings aligned with backend AST parser
    // Backend supports: javascript, typescript, python, go, java, c, cpp
    const langMap = {
      // JavaScript
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.mjs': 'javascript',
      '.cjs': 'javascript',
      
      // TypeScript (must be separate from JavaScript for AST parsing)
      '.ts': 'typescript',
      '.tsx': 'typescript',
      
      // Python
      '.py': 'python',
      '.pyw': 'python',
      '.pyi': 'python',
      
      // Go
      '.go': 'go',
      
      // Java
      '.java': 'java',
      
      // C++
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.hpp': 'cpp',
      '.hxx': 'cpp',
      '.hh': 'cpp',
      
      // C
      '.c': 'c',
      '.h': 'c',  // Note: .h could be C or C++, defaulting to C
    };
    
    // Check file extension (case-insensitive)
    const lowerPath = path.toLowerCase();
    for (const [ext, lang] of Object.entries(langMap)) {
      if (lowerPath.endsWith(ext)) {
        return lang;
      }
    }
    
    // Default fallback
    console.warn('[IRIS] Unknown file extension, defaulting to javascript');
    return 'javascript';
  },

  /**
   * Extract code from the page (language-agnostic, renamed from extractCodeFromPage)
   */
  extractCode(selectors) {
    return this.extractCodeFromPage(selectors);
  },
};
