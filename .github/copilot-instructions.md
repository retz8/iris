# IRIS
**AI Agent Instructions [Major Pivot: January 9, 2026]**

---

## 🚨 PROJECT PIVOT NOTICE (January 9, 2026)

### Previous State (Jan 4-8, 2026)
- ✅ Noise Eraser v1: Line-by-line pattern matching with regex
- ❌ Limitation: No understanding of code structure, context, or dependencies
- ❌ Problem: Cannot support true "chunking" or structural understanding

### **NEW DIRECTION: AST-Based Structural Analysis**
The project is now pivoting to **Phase 0 (Foundation) and Phase 1 (Section Panel)**:
- **Phase 0**: AST parsing and structural analysis (using Tree-sitter)
- **Phase 1**: Automatic section detection + visual structure panel UI
- **Phase 3 (Later)**: Enhanced noise detection using AST (replaces current regex-based approach)

**Current Focus:** Build the foundation for true code comprehension through abstract syntax tree analysis

---

## 1. Research Insights & Theoretical Foundation

### Key Findings from Cognitive Science Research

#### A. The Bottleneck: Short-Term Memory (STM)
```
LTM (Long-term Memory)
- Capacity: Nearly unlimited
- Content: Syntax, patterns, domain knowledge
- Role: Foundation for chunking

STM (Short-term Memory) ⚠️ BOTTLENECK
- Capacity: Only 2-6 items
- Duration: ~30 seconds
- Problem: Overflow causes confusion

Working Memory
- Role: Where actual thinking happens
- Load: Cognitive Load
```

**Key Insight:** Code reading bottleneck is STM capacity, NOT processing speed.

#### B. Chunking: The Expert's Secret
```
Novice reads:
for (let i=0; i<arr.length; i++) { ... }
→ 14+ items in STM

Expert reads:
"Array iteration pattern"
→ 1 item in STM (chunked!)
```

**Chunking** = Grouping multiple pieces of information into meaningful units.

#### C. Two Types of Cognitive Load
```
Intrinsic Load: Problem's inherent complexity (cannot reduce)
Extraneous Load: Unnecessary complexity (CAN reduce) ← This is NOISE!
```

**Our Goal:** Reduce extraneous load by providing structure and context.

#### D. How Experts Read Code
- **NOT line-by-line** (like novices)
- **Scan and focus** on important parts
- **Pattern recognition** is key
- **Randomizing lines** destroys expert advantage

**Implication:** We need to support scanning behavior with visual structure.

---

## 2. Redefined Concept of "Noise"

### Old Definition (Noise Eraser v1)
```
Noise = Lines matching error handling / logging / import patterns
```

### **New Definition**
```
Noise = Code that increases extraneous cognitive load
        without directly contributing to understanding core logic

Characteristics:
1. Consumes STM slots
2. Causes context switching (scrolling)
3. Prevents chunking
4. Not on the critical dependency path
```

### Example: Context Matters
```javascript
// Same pattern, different contexts

// Context 1: Critical security function
function criticalSecurityCheck(user) {
  if (!user.hasPermission('admin')) {  // ← NOT NOISE (essential guard)
    throw new SecurityError();
  }
  deleteAllData();
}

// Context 2: Simple display function
function displayProfile(user) {
  if (!user) return;  // ← NOISE (defensive check)
  render(user.profile);
}
```

**Key Learning:** AST-based context analysis is essential for accurate noise detection.

---

## 3. Project Vision & Goals

### Core Objective
**"The Auditor's Lens: Optimize Code Perception for the AI Era"**

Bridge the gap between high-speed AI code generation and human code verification bottleneck.

### Design Principles
1. **Reduce STM Load**: Show structure, not details
2. **Support Chunking**: Group related code into meaningful sections
3. **Enable Scanning**: Clear visual hierarchy for expert reading patterns
4. **Minimize Context Switching**: Reduce scrolling through tooltips and panels
5. **Progressive Disclosure**: Start with high-level, drill down as needed

### Target Users
- **PR Reviewers**: Auditing AI-generated or peer code on GitHub
- **Open-Source Explorers**: Understanding unfamiliar codebases

---

## 4. Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Web Page                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Chrome Extension (Frontend)            │  │
│  │  • DOM manipulation                               │  │
│  │  • Section panel UI                               │  │
│  │  • Code highlighting                              │  │
│  │  • User interactions                              │  │
│  └────────────────┬─────────────────────────────────┘  │
└───────────────────┼────────────────────────────────────┘
                    │ HTTP POST /analyze-structure
                    │
         ┌──────────▼──────────────────────────────┐
         │     Flask Backend (Python)              │
         │  ┌───────────────────────────────────┐  │
         │  │  AST Parser (Tree-sitter)         │  │
         │  │  • JavaScript, Python, Go, Java   │  │
         │  └──────────────┬────────────────────┘  │
         │                 │                        │
         │  ┌──────────────▼────────────────────┐  │
         │  │  Function Extractor               │  │
         │  │  • Find all functions in file     │  │
         │  └──────────────┬────────────────────┘  │
         │                 │                        │
         │  ┌──────────────▼────────────────────┐  │
         │  │  Section Detector                 │  │
         │  │  • Classify statements            │  │
         │  │  • Group into sections            │  │
         │  │  • Generate descriptions          │  │
         │  └──────────────┬────────────────────┘  │
         │                 │                        │
         │                 ▼                        │
         │         Structured JSON                  │
         │    (functions, sections, metadata)       │
         └──────────────────────────────────────────┘
```

### Data Flow

```
1. User navigates to GitHub code page
   ↓
2. Extension extracts code from DOM
   ↓
3. POST to /analyze-structure with code + language
   ↓
4. Backend parses code to AST (Tree-sitter)
   ↓
5. Extract all functions from AST
   ↓
6. For each function, detect internal sections
   ↓
7. Return structured JSON
   ↓
8. Extension renders side panel with sections
   ↓
9. User clicks section → Jump to code + highlight
```

---

## 5. Implementation Plan

### **Phase 0: AST Foundation** ⭐ CURRENT PRIORITY
**Goal:** Build the infrastructure for structural code analysis

#### Why AST?
Current regex-based approach has fundamental limitations:
- Cannot understand code structure
- No context awareness
- Cannot support true chunking
- No dependency graph analysis

**Tree-sitter advantages:**
- ✅ Multi-language support (JS, Python, Go, Java, etc.)
- ✅ Fast (written in C)
- ✅ Incremental parsing (future optimization)
- ✅ Battle-tested (used by VS Code, Neovim, GitHub)

#### Phase 0 Components

##### 0.1: AST Parser Setup
```python
# backend/src/ast_parser.py

from tree_sitter import Language, Parser
import tree_sitter_javascript
import tree_sitter_python
import tree_sitter_go

class ASTParser:
    """
    Unified AST parser for multiple languages using Tree-sitter
    """
    
    def __init__(self):
        self.parsers = {
            'javascript': self._init_js_parser(),
            'python': self._init_py_parser(),
            'go': self._init_go_parser(),
        }
    
    def parse(self, code: str, language: str):
        """
        Parse source code into AST
        
        Args:
            code: Source code string
            language: Programming language (javascript, python, go, etc.)
            
        Returns:
            Tree-sitter Tree object
        """
        parser = self.parsers.get(language)
        if not parser:
            raise ValueError(f"Unsupported language: {language}")
        
        tree = parser.parse(bytes(code, "utf8"))
        return tree
    
    def _init_js_parser(self):
        JS_LANGUAGE = Language(tree_sitter_javascript.language())
        parser = Parser()
        parser.set_language(JS_LANGUAGE)
        return parser
    
    def _init_py_parser(self):
        PY_LANGUAGE = Language(tree_sitter_python.language())
        parser = Parser()
        parser.set_language(PY_LANGUAGE)
        return parser
    
    def _init_go_parser(self):
        GO_LANGUAGE = Language(tree_sitter_go.language())
        parser = Parser()
        parser.set_language(GO_LANGUAGE)
        return parser
```

**Dependencies:**
```bash
pip install tree-sitter tree-sitter-javascript tree-sitter-python tree-sitter-go
```

##### 0.2: Function Extractor
```python
# backend/src/function_extractor.py

from typing import List, Dict
from dataclasses import dataclass

@dataclass
class Function:
    name: str
    start_line: int
    end_line: int
    params: List[str]
    body: str
    node: any  # Tree-sitter node for later section analysis
    
    def to_dict(self):
        return {
            'name': self.name,
            'start_line': self.start_line,
            'end_line': self.end_line,
            'params': self.params,
            'line_count': self.end_line - self.start_line + 1
        }

class FunctionExtractor:
    """
    Extract all function definitions from AST
    """
    
    # Language-specific function node types
    FUNCTION_TYPES = {
        'javascript': [
            'function_declaration', 
            'arrow_function', 
            'method_definition',
            'function_expression'
        ],
        'python': ['function_definition'],
        'go': ['function_declaration', 'method_declaration'],
    }
    
    def extract_functions(self, ast_tree, language: str) -> List[Function]:
        """
        Extract all functions from AST
        
        Args:
            ast_tree: Tree-sitter Tree object
            language: Programming language
            
        Returns:
            List of Function objects
        """
        functions = []
        function_types = self.FUNCTION_TYPES.get(language, [])
        
        root_node = ast_tree.root_node
        
        for node in self._traverse(root_node):
            if node.type in function_types:
                func = self._parse_function(node, language)
                if func:
                    functions.append(func)
        
        return functions
    
    def _traverse(self, node):
        """Depth-first traversal of AST"""
        yield node
        for child in node.children:
            yield from self._traverse(child)
    
    def _parse_function(self, node, language) -> Function:
        """Parse individual function node"""
        name = self._get_function_name(node, language)
        params = self._get_parameters(node, language)
        
        return Function(
            name=name,
            start_line=node.start_point[0] + 1,  # 1-indexed
            end_line=node.end_point[0] + 1,
            params=params,
            body=node.text.decode('utf8'),
            node=node
        )
    
    def _get_function_name(self, node, language) -> str:
        """Extract function name from node"""
        if language == 'javascript':
            # Try to find 'identifier' child
            for child in node.children:
                if child.type == 'identifier':
                    return child.text.decode('utf8')
            return '<anonymous>'
        
        elif language == 'python':
            # Python function_definition has 'name' field
            name_node = node.child_by_field_name('name')
            if name_node:
                return name_node.text.decode('utf8')
            return '<unknown>'
        
        elif language == 'go':
            name_node = node.child_by_field_name('name')
            if name_node:
                return name_node.text.decode('utf8')
            return '<unknown>'
        
        return '<unknown>'
    
    def _get_parameters(self, node, language) -> List[str]:
        """Extract parameter names"""
        params = []
        
        if language == 'javascript':
            for child in node.children:
                if child.type == 'formal_parameters':
                    for param in child.children:
                        if param.type == 'identifier':
                            params.append(param.text.decode('utf8'))
        
        elif language == 'python':
            params_node = node.child_by_field_name('parameters')
            if params_node:
                for param in params_node.children:
                    if param.type == 'identifier':
                        params.append(param.text.decode('utf8'))
        
        return params
```

##### 0.3: Section Detector
```python
# backend/src/section_detector.py

import re
from typing import List, Dict
from dataclasses import dataclass

@dataclass
class Section:
    type: str           # setup, validation, processing, etc.
    icon: str           # Emoji icon
    start_line: int
    end_line: int
    description: str
    key_operations: List[str]
    statements: List[any]  # Tree-sitter nodes
    
    def to_dict(self):
        return {
            'type': self.type,
            'icon': self.icon,
            'start_line': self.start_line,
            'end_line': self.end_line,
            'line_count': self.end_line - self.start_line + 1,
            'description': self.description,
            'key_operations': self.key_operations
        }

class SectionDetector:
    """
    Detect logical sections within a function body
    """
    
    # Section type definitions
    SECTION_ICONS = {
        'setup': '📦',
        'validation': '✅',
        'processing': '🔧',
        'api_call': '🌐',
        'error_handling': '⚠️',
        'cleanup': '🧹',
        'assignment': '📝',
        'return': '↩️',
        'other': '📄'
    }
    
    # Patterns for statement classification
    CLASSIFICATION_PATTERNS = {
        'setup': [r'new\s+\w+', r'create', r'initialize', r'const.*=.*new'],
        'validation': [r'if.*null', r'if.*undefined', r'if\s*\(!\w+\)', r'check', r'validate'],
        'processing': [r'for\s*\(', r'while\s*\(', r'\.map\(', r'\.forEach\(', r'\.filter\(', r'\.reduce\('],
        'api_call': [r'fetch\(', r'axios\.', r'http\.', r'request\(', r'\.load\('],
        'error_handling': [r'try\s*{', r'catch\s*\(', r'throw\s+', r'error'],
        'cleanup': [r'remove', r'delete', r'clear', r'destroy', r'dispose'],
        'assignment': [r'\w+\s*=\s*', r'let\s+', r'var\s+', r'const\s+'],
        'return': [r'return\s+']
    }
    
    def detect_sections(self, function, language: str) -> List[Section]:
        """
        Divide function body into logical sections
        
        Args:
            function: Function object with AST node
            language: Programming language
            
        Returns:
            List of Section objects
        """
        sections = []
        body_node = function.node.child_by_field_name('body')
        
        if not body_node:
            return []
        
        # 1. Get top-level statements
        statements = self._get_statements(body_node, language)
        
        if not statements:
            return []
        
        # 2. Group statements into sections
        current_section = None
        
        for stmt in statements:
            stmt_type = self._classify_statement(stmt, language)
            
            # Same type → extend current section
            if current_section and current_section.type == stmt_type:
                current_section.end_line = stmt['end_line']
                current_section.statements.append(stmt)
            else:
                # New type → start new section
                if current_section:
                    sections.append(current_section)
                
                current_section = Section(
                    type=stmt_type,
                    icon=self.SECTION_ICONS.get(stmt_type, '📄'),
                    start_line=stmt['start_line'],
                    end_line=stmt['end_line'],
                    description='',  # Will be filled later
                    key_operations=[],
                    statements=[stmt]
                )
        
        # Add last section
        if current_section:
            sections.append(current_section)
        
        # 3. Generate metadata for each section
        for section in sections:
            section.description = self._generate_description(section, language)
            section.key_operations = self._extract_key_operations(section)
        
        return sections
    
    def _get_statements(self, body_node, language) -> List[Dict]:
        """Extract top-level statements from function body"""
        statements = []
        
        for child in body_node.children:
            # Skip braces and whitespace
            if child.type in ['{', '}', 'comment']:
                continue
            
            # Valid statement
            if child.start_point[0] != child.end_point[0] or child.text.strip():
                statements.append({
                    'node': child,
                    'text': child.text.decode('utf8'),
                    'start_line': child.start_point[0] + 1,
                    'end_line': child.end_point[0] + 1,
                    'type': child.type
                })
        
        return statements
    
    def _classify_statement(self, stmt: Dict, language: str) -> str:
        """Classify statement into section type"""
        stmt_text = stmt['text'].lower()
        
        # Check patterns
        for section_type, patterns in self.CLASSIFICATION_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, stmt_text, re.IGNORECASE):
                    return section_type
        
        return 'other'
    
    def _generate_description(self, section: Section, language: str) -> str:
        """Generate human-readable description of section"""
        
        # Template-based descriptions
        templates = {
            'setup': "Initializes variables and creates necessary objects",
            'validation': "Validates input parameters and checks preconditions",
            'processing': "Processes data through iteration or transformation",
            'api_call': "Makes external API or service calls",
            'error_handling': "Handles errors and exceptional cases",
            'cleanup': "Cleans up resources and removes temporary data",
            'assignment': "Assigns values to variables",
            'return': "Returns the result",
            'other': "Performs operations"
        }
        
        base = templates.get(section.type, "Performs operations")
        
        # TODO: Add more specific details based on actual code
        # (Can be enhanced with LLM in Phase 6)
        
        return base
    
    def _extract_key_operations(self, section: Section) -> List[str]:
        """Extract key operations from section (simplified heuristic)"""
        operations = []
        
        # Simple heuristic: extract function calls
        for stmt in section.statements:
            text = stmt['text']
            # Find function calls (simplified regex)
            calls = re.findall(r'(\w+(?:\.\w+)*)\s*\(', text)
            operations.extend(calls[:3])  # Max 3 operations
        
        return operations[:5]  # Max 5 total
```

##### 0.4: API Endpoint
```python
# backend/src/server.py

from analyzer.ast_parser import ASTParser
from analyzer.function_extractor import FunctionExtractor
from analyzer.section_detector import SectionDetector

@app.route('/analyze-structure', methods=['POST'])
def analyze_structure():
    """
    NEW ENDPOINT: Analyze code structure using AST
    
    Request:
    {
        "code": "function foo() { ... }",
        "language": "javascript",
        "filepath": "src/loader.js"  // optional
    }
    
    Response:
    {
        "success": true,
        "language": "javascript",
        "filepath": "src/loader.js",
        "file_summary": {
            "total_lines": 150,
            "total_functions": 3,
            "complexity": "medium"
        },
        "functions": [
            {
                "name": "loadHumanModel",
                "start_line": 1,
                "end_line": 70,
                "params": ["humanModelFile", "humanPosX", ...],
                "sections": [
                    {
                        "type": "setup",
                        "icon": "📦",
                        "start_line": 1,
                        "end_line": 7,
                        "description": "Initializes PLYLoader...",
                        "key_operations": ["PLYLoader", "load"]
                    },
                    // ... more sections
                ]
            },
            // ... more functions
        ]
    }
    """
    
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', 'javascript')
    filepath = data.get('filepath', '')
    
    try:
        # 1. Parse AST
        parser = ASTParser()
        ast_tree = parser.parse(code, language)
        
        # 2. Extract functions
        extractor = FunctionExtractor()
        functions = extractor.extract_functions(ast_tree, language)
        
        # 3. Detect sections for each function
        detector = SectionDetector()
        for func in functions:
            func.sections = detector.detect_sections(func, language)
        
        # 4. Generate file summary
        total_lines = len(code.split('\n'))
        file_summary = {
            "total_lines": total_lines,
            "total_functions": len(functions),
            "complexity": _estimate_complexity(total_lines, len(functions))
        }
        
        # 5. Return structured data
        return jsonify({
            "success": True,
            "language": language,
            "filepath": filepath,
            "file_summary": file_summary,
            "functions": [
                {
                    **func.to_dict(),
                    'sections': [s.to_dict() for s in func.sections]
                }
                for func in functions
            ]
        }), 200
        
    except ValueError as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Analysis failed: {str(e)}"
        }), 500

def _estimate_complexity(total_lines: int, num_functions: int) -> str:
    """Simple complexity heuristic"""
    if total_lines < 100:
        return "low"
    elif total_lines < 300:
        return "medium"
    else:
        return "high"
```

---

### **Phase 1: Section Panel UI** ⭐ NEXT PRIORITY
**Goal:** Visual sidebar that displays code structure

#### Phase 1 Components

##### 1.1: Feature Flag System
```javascript
// extension/content.js

// Feature flags for gradual rollout
const FEATURES = {
  noiseEraser: false,      // Phase 3 (later)
  sectionPanel: true,      // Phase 1 (NOW)
  variableTracking: false  // Phase 2 (later)
};

// Conditional initialization
if (FEATURES.sectionPanel) {
  initSectionPanel();
}

if (FEATURES.noiseEraser) {
  // Keep existing code, but disabled for now
  initNoiseEraser();
}
```

**Note:** Do NOT delete existing noise eraser code. It will be upgraded in Phase 3.

##### 1.2: Section Panel Class
```javascript
// extension/modules/section-panel.js

class SectionPanel {
  constructor() {
    this.panel = null;
    this.data = null;
    this.isVisible = false;
  }
  
  async analyze() {
    console.log('[IRIS] Starting structure analysis...');
    
    // 1. Extract code from GitHub page
    const code = DOMHelpers.extractCode(LENS_CONFIG.selectors);
    const language = DOMHelpers.detectLanguage();
    const filepath = window.location.pathname;
    
    if (!code) {
      console.error('[IRIS] Could not extract code');
      return;
    }
    
    // 2. Call backend API
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
  
  _createFileSummary() {
    const summary = this.data.file_summary;
    const container = document.createElement('div');
    container.style.cssText = 'padding: 16px;';
    
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
          <span><strong>${summary.complexity}</strong> complexity</span>
        </div>
      </div>
    `;
    
    return container;
  }
  
  _createFunctionsList() {
    const container = document.createElement('div');
    container.style.cssText = 'padding: 0 16px 16px 16px;';
    
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
    header.innerHTML = `
      <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">
        ${func.name}()
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
      // TODO: Show detailed tooltip
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
  
  _scrollToLine(lineNumber) {
    const lineElement = document.querySelector(`#LC${lineNumber}`);
    if (lineElement) {
      lineElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
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
        this.panel.remove();
        this.panel = null;
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

// CSS for highlights
const style = document.createElement('style');
style.textContent = `
  .iris-highlighted {
    background: rgba(102, 126, 234, 0.2) !important;
    animation: iris-pulse 1.5s ease-in-out;
  }
  
  @keyframes iris-pulse {
    0%, 100% { 
      background: rgba(102, 126, 234, 0.2); 
    }
    50% { 
      background: rgba(102, 126, 234, 0.4); 
    }
  }
`;
document.head.appendChild(style);
```

##### 1.3: Background Script Handler
```javascript
// extension/background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return;

  (async () => {
    try {
      let result;
      
      if (request.action === "analyzeStructure") {
        result = await handleAnalyzeStructure(
          request.code, 
          request.language,
          request.filepath
        );
      } else if (request.action === "analyzeCode") {
        // Keep existing noise analysis (for later)
        result = await handleAnalyzeCode(request.code, request.language);
      } else {
        throw new Error("Unknown action: " + request.action);
      }
      
      sendResponse({ success: true, data: result });
    } catch (error) {
      sendResponse({
        success: false,
        error: error?.message || String(error),
      });
    }
  })();

  return true; // Async response
});

async function handleAnalyzeStructure(code, language, filepath) {
  const apiUrl = `${CONFIG.BACKEND_URL}/analyze-structure`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      code, 
      language,
      filepath 
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

async function handleAnalyzeCode(code, language) {
  // Existing noise analysis endpoint (keep for Phase 3)
  const apiUrl = `${CONFIG.BACKEND_URL}${CONFIG.API_ENDPOINTS.ANALYZE}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, language }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}
```

##### 1.4: Main Content Script Integration
```javascript
// extension/content.js

// Global state
const FEATURES = {
  noiseEraser: false,
  sectionPanel: true,
};

let sectionPanel = null;

function initSectionPanel() {
  if (!DOMHelpers.isGitHubBlobPage()) {
    console.log('[IRIS] Not a GitHub blob page, skipping');
    return;
  }
  
  // Create section panel instance
  sectionPanel = new SectionPanel();
  
  // Create "Analyze Structure" button
  createAnalyzeButton();
  
  console.log('[IRIS] Section Panel initialized');
}

function createAnalyzeButton() {
  // Remove existing button
  const existing = document.getElementById('iris-analyze-btn');
  if (existing) existing.remove();
  
  const button = document.createElement('button');
  button.id = 'iris-analyze-btn';
  button.innerHTML = `
    <span>🤖</span>
    <span style="margin-left: 8px;">Analyze Structure</span>
  `;
  
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '10000',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  });
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
  });
  
  button.addEventListener('click', () => {
    if (sectionPanel) {
      sectionPanel.toggle();
    }
  });
  
  document.body.appendChild(button);
}

// Initialize on page load
function main() {
  console.log('[IRIS] Loading...');
  
  if (FEATURES.sectionPanel) {
    initSectionPanel();
  }
  
  // TODO: Add navigation detection for SPA behavior
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
```

---

## 6. Priority & Rationale

### Why Phase 0 & Phase 1 First?

#### **1. Foundation for Everything**
```
Without AST:
- Cannot understand structure
- Cannot detect true sections
- Cannot support chunking
- Cannot analyze dependencies

With AST:
- ✅ All of the above become possible
- ✅ Foundation for Phase 2, 3, 4, 5...
```

#### **2. Immediate User Value**
```
User opens large file (1000+ lines)
↓
Clicks "Analyze Structure"
↓
Sees: 5 functions, each with 3-6 sections
↓
STM load: 1000 lines → 20 sections (95% reduction!)
↓
"Wow, now I can see the structure!"
```

#### **3. Section Panel = Reading Aid**
Research shows experts scan code, not read line-by-line.
→ Visual structure supports expert reading patterns.

#### **4. Independent Value**
- Works without any other features
- Useful even if Phase 2/3/4 never happen
- Clear "before/after" demonstration

#### **5. Enables Future Phases**
```
Phase 1 (Sections) enables:
→ Phase 2: Variable tracking within sections
→ Phase 3: AST-based noise detection
→ Phase 4: Execution path visualization
→ Phase 5: Semantic intent overlay
```

---

## 7. Implementation Checklist

### Phase 0: Backend AST Foundation (2-3 weeks)

**Week 1: Setup & Parsing**
- [ ] Install Tree-sitter dependencies
- [ ] Implement `ASTParser` class
- [ ] Test parsing for JavaScript, Python, Go
- [ ] Handle parse errors gracefully

**Week 2: Extraction & Detection**
- [ ] Implement `FunctionExtractor`
- [ ] Test with real GitHub files
- [ ] Implement `SectionDetector`
- [ ] Refine section classification patterns

**Week 3: API & Testing**
- [ ] Create `/analyze-structure` endpoint
- [ ] Test with sample files (loadHumanModel, etc.)
- [ ] Performance testing (large files)
- [ ] Error handling & edge cases

### Phase 1: Frontend Section Panel (2-3 weeks)

**Week 1: Core UI**
- [ ] Add feature flags
- [ ] Implement `SectionPanel` class
- [ ] Create basic sidebar UI
- [ ] Test on GitHub pages

**Week 2: Interactions**
- [ ] Click section → Jump to code
- [ ] Highlight lines on click
- [ ] Hover effects
- [ ] Smooth animations

**Week 3: Polish & Integration**
- [ ] Update background script
- [ ] Handle edge cases (empty files, parse errors)
- [ ] Responsive design (different screen sizes)
- [ ] Final testing on diverse GitHub repos

### Integration Testing (1 week)
- [ ] Test on 10+ different GitHub repos
- [ ] Performance profiling
- [ ] Bug fixes
- [ ] Documentation updates

**Total Estimated Time: 5-7 weeks**

---

## 8. Success Metrics

### Quantitative
- **STM Reduction**: 70 lines → 5 sections (93% reduction)
- **Scan Time**: 30 seconds → 5 seconds (83% faster)
- **Accuracy**: 85%+ section classification accuracy

### Qualitative
- User reaction: "Now I can see the structure!"
- Supports expert scanning behavior
- Reduces need to scroll
- Makes large files less intimidating

---

## 9. Future Phases (Roadmap)

### Phase 2: Variable Lifecycle Tracking
- Click variable → Highlight all uses
- Show declaration, modifications, reads
- Eliminate scrolling to find variable definitions

### Phase 3: AST-Based Noise Detection
- Replace regex patterns with structural analysis
- Context-aware noise classification
- Block-level chunking (not line-by-line)
- 85%+ accuracy (vs current 60%)

### Phase 4: Execution Path Visualization
- Select scenario → Show only relevant code
- Dim unreachable paths
- Track control flow

### Phase 5: Dependency Graph
- Visualize function call relationships
- Data flow analysis
- Critical path highlighting

### Phase 6: Semantic Intent Overlay
- LLM-generated section summaries
- "Why" explanations for complex logic
- Caching for cost efficiency

---

## 10. Development Context

### Remote Development Environment
- Developed via VS Code Tunnel from military service computer lab
- Limited access → Simple architecture preferred
- No complex build systems
- Minimal dependencies

### Tech Stack
- **Backend**: Flask + Tree-sitter
- **Frontend**: Vanilla JavaScript (Chrome Extension)
- **No build tools**: Direct file loading

### Current Codebase State
- Noise Eraser v1 exists (regex-based)
- Will be replaced by AST-based version in Phase 3
- Keep existing code, but disable via feature flag

---

## 11. Critical Reminders for AI Agents

### When Implementing Backend Code
1. **Always use Tree-sitter** for parsing (not regex)
2. **Handle multiple languages** (JS, Python, Go minimum)
3. **Fail gracefully** on parse errors
4. **Return structured JSON** (not raw AST)
5. **Test with real files** from GitHub

### When Implementing Frontend Code
1. **Do NOT delete noise eraser code** (disable via flag)
2. **Use existing DOM helpers** (DOMHelpers class)
3. **Follow GitHub's DOM structure** (elements have IDs like #LC123)
4. **Smooth animations** (300ms transitions)
5. **Handle SPA behavior** (GitHub uses Turbo)

### Priority Decision Framework
```
When choosing what to implement:
1. Does it reduce STM load? (most important)
2. Does it support chunking?
3. Does it minimize context switching?
4. Does it have independent value?
5. Does it enable future phases?

If YES to 3+, it's high priority.
```

---

## 12. Example: Expected Output

### Sample Code
```javascript
function loadHumanModel(
  humanModelFile,
  humanPosX, humanPosY, humanPosZ,
  callback
) {
  const loader = new PLYLoader();
  loader.load(humanModelFile, function (geometry) {
    humanGeometry = geometry;
    
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    
    if (geometry.isBufferGeometry) {
      var positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        var x = positions.getX(i);
        var y = positions.getY(i);
        var z = positions.getZ(i);
        geometryZero.push(new THREE.Vector3(x, y, z));
        centerPoint.add(new THREE.Vector3(x, y, z));
      }
    }
    
    humanMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0xaaaaaa,
      shininess: 20,
      opacity: 1.0,
      transparent: true,
    });
    
    if (humanMesh) {
      scene.remove(humanMesh);
    }
    
    humanMesh = new THREE.Mesh(geometry, humanMaterial);
    humanMesh.rotation.set(humanRotation.x, humanRotation.y, humanRotation.z);
    
    const humanPosition = calculateHumanPositionOnWheelchair(
      wheelchairParams, wheelchairMesh, wheelchairType,
      humanPosX, humanPosY, humanPosZ
    );
    
    humanMesh.position.set(humanPosition.humanX, humanPosition.humanY, humanPosition.humanZ);
    humanMesh.scale.set(0.001, 0.001, 0.001);
    humanMesh.castShadow = true;
    humanMesh.receiveShadow = true;
    humanMesh.updateMatrixWorld();
    
    centerPoint.add(new THREE.Vector3(humanPosition.humanX, humanPosition.humanY, humanPosition.humanZ));
    scene.add(humanMesh);
    optimizeHumanAlignment(humanMesh, wheelchairMesh);
    
    if (callback) callback();
  });
}
```

### Expected API Response
```json
{
  "success": true,
  "language": "javascript",
  "file_summary": {
    "total_lines": 70,
    "total_functions": 1,
    "complexity": "medium"
  },
  "functions": [
    {
      "name": "loadHumanModel",
      "start_line": 1,
      "end_line": 70,
      "params": ["humanModelFile", "humanPosX", "humanPosY", "humanPosZ", "callback"],
      "line_count": 70,
      "sections": [
        {
          "type": "setup",
          "icon": "📦",
          "start_line": 6,
          "end_line": 7,
          "line_count": 2,
          "description": "Initializes variables and creates necessary objects",
          "key_operations": ["PLYLoader", "load"]
        },
        {
          "type": "validation",
          "icon": "✅",
          "start_line": 10,
          "end_line": 12,
          "line_count": 3,
          "description": "Validates input parameters and checks preconditions",
          "key_operations": ["computeVertexNormals"]
        },
        {
          "type": "processing",
          "icon": "🔧",
          "start_line": 14,
          "end_line": 23,
          "line_count": 10,
          "description": "Processes data through iteration or transformation",
          "key_operations": ["getX", "getY", "getZ", "push", "add"]
        },
        {
          "type": "setup",
          "icon": "📦",
          "start_line": 25,
          "end_line": 32,
          "line_count": 8,
          "description": "Initializes variables and creates necessary objects",
          "key_operations": ["MeshPhongMaterial"]
        },
        {
          "type": "cleanup",
          "icon": "🧹",
          "start_line": 34,
          "end_line": 36,
          "line_count": 3,
          "description": "Cleans up resources and removes temporary data",
          "key_operations": ["remove"]
        },
        {
          "type": "setup",
          "icon": "📦",
          "start_line": 38,
          "end_line": 49,
          "line_count": 12,
          "description": "Initializes variables and creates necessary objects",
          "key_operations": ["Mesh", "set", "calculateHumanPositionOnWheelchair"]
        },
        {
          "type": "other",
          "icon": "📄",
          "start_line": 51,
          "end_line": 56,
          "line_count": 6,
          "description": "Performs operations",
          "key_operations": ["add", "optimizeHumanAlignment"]
        }
      ]
    }
  ]
}
```

### Expected UI in Browser
```
┌────────────────────────────────────────────────────────┐
│ GitHub: username/repo > blob > main > loader.js       │
├────────────────┬───────────────────────────────────────┤
│                │  Code View                            │
│  🤖 IRIS       │                                       │
│  Structure     │   1  function loadHumanModel(         │
│  ────────────  │   2    humanModelFile, ...            │
│                │   3  ) {                              │
│  📊 Overview   │   4                                   │
│  70 lines      │   5  📦 const loader = new PLY...    │
│  1 function    │   6     loader.load(..., fn => {      │
│  medium        │   7                                   │
│                │   8  ✅   if (!geometry.attr...) {    │
│  loadHumanModel│   9         geometry.compute...       │
│  Lines 1-70    │  10       }                           │
│  7 sections    │  11                                   │
│    📦 Setup    │  12  🔧   if (geometry.isBuf...) {    │
│    ✅ Valid    │  13         var positions = ...       │
│    🔧 Process  │  14         for (let i = 0; ...) {    │
│    📦 Setup    │  15           // process vertices     │
│    🧹 Cleanup  │  16         }                         │
│    📦 Setup    │  17       }                           │
│    📄 Other    │  18                                   │
│                │  19  📦   humanMaterial = new...      │
│                │  ...                                  │
│                │                                       │
│ [Analyze]      │                                       │
└────────────────┴───────────────────────────────────────┘
```

Click section → Jump to code and highlight.

---

## 13. Resources & References

### Tree-sitter Documentation
- Official: https://tree-sitter.github.io/tree-sitter/
- Python bindings: https://github.com/tree-sitter/py-tree-sitter
- Language grammars: https://github.com/tree-sitter

### Chrome Extension API
- Manifest V3: https://developer.chrome.com/docs/extensions/mv3/
- Content Scripts: https://developer.chrome.com/docs/extensions/mv3/content_scripts/
- Message Passing: https://developer.chrome.com/docs/extensions/mv3/messaging/

### Research Papers
- "The Programmer's Brain" by Felienne Hermans
- Code Reading Club: https://www.felienne.com/archives/6472
- Cognitive Load Theory in programming

---

**Last Updated:** January 9, 2026  
**Current Phase:** Phase 0 & Phase 1 (AST + Section Panel)  
**Next Milestone:** First working demo with structure analysis

---

## QUICK START FOR NEW AI AGENTS

If you're just joining:

1. **Read Section 2** (Redefined Noise) - Core concept
2. **Read Section 4** (Architecture) - System overview
3. **Read Section 5** (Implementation Plan) - What to build
4. **Check Section 12** (Example Output) - Expected results
5. **Follow Section 7** (Checklist) - Step by step

**Most Important Files:**
- `backend/src/analyzer/ast_parser.py` - AST parsing (START HERE)
- `backend/src/analyzer/section_detector.py` - Core logic
- `extension/modules/section-panel.js` - UI component
- `backend/src/server.py` - API endpoint

Good luck! 🚀