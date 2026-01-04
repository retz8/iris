// Background service worker to handle API calls
// This avoids CORS issues since the extension has host_permissions

// Import config
importScripts("config.js");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return;

  (async () => {
    try {
      let result;
      if (request.action === "analyzeCode") {
        result = await handleAnalyzeCode(request.code, request.language);
      } else if (request.action === "convertCode") {
        result = await handleConvertCode(request.code);
      } else {
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

async function handleConvertCode(code) {
  const apiUrl = `${CONFIG.BACKEND_URL}${CONFIG.API_ENDPOINTS.CONVERT}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}
