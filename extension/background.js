// Background service worker to handle API calls
// This avoids CORS issues since the extension has host_permissions

// Import config
importScripts("config.js");

// const EXPERIMENT_ROUTE = "/exp-single-llm";
//const EXPERIMENT_ROUTE = "/exp-multi-agents";
const EXPERIMENT_ROUTE = "/api/iris/analyze"

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return;

  (async () => {
    try {
      let result;
      if (request.action === "analyzeCode") {
        result = await handleAnalyzeCode(request.code, request.language);
      } 
      // else if (request.action === "analyzeStructure") {
      //   result = await handleAnalyzeStructure(
      //     request.code,
      //     request.language,
      //     request.filepath
      //   );
      // } 
      else if (request.action === "expLLM") {
        // LLM experimentation endpoints
        // 1st: POST /exp-single-llm [now]
        // 2nd: POST /exp-multi-agents [later]

        // API body format
        // {
        //   "filename": "api.py",
        //   "language": "python",
        //   "lines": [
        //     { "line": 1, "text": "import os" },
        //     { "line": 2, "text": "" },
        //     { "line": 3, "text": "def main():" }
        //   ], 
        //   "metadata": {
        //     "filepath": "/project/api.py",
        //   }
        // }

        result = await handleExpLLM(request.filename, request.language, request.lines, request.metadata);
      }
      
      
      else {
        throw new Error("Unknown action: " + request.action);
      }
      sendResponse({ success: true, data: result });
    } catch (error) {
      sendResponse({
        success: false,
        error: error?.message ? error.message : String(error),
      });
    }
  })();

  // Return true to indicate we'll send a response asynchronously
  return true;
});

async function handleAnalyzeCode(code, language) {
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

async function handleAnalyzeStructure(code, language, filepath) {
  const apiUrl = `${CONFIG.BACKEND_URL}/analyze-structure`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, language, filepath }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// LLM experimentation handler
async function handleExpLLM(filename, language, lines, metadata) {
  const apiUrl = `${CONFIG.BACKEND_URL}${EXPERIMENT_ROUTE}`;

  const reqBody = {
    filename,
    language,
    lines,
    metadata
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {  
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqBody),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  return data;
}