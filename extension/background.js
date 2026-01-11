// Background service worker to handle API calls
// This avoids CORS issues since the extension has host_permissions

importScripts("config.js");

const IRIS_ANALYZE_ROUTE = "/api/iris/analyze"

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return;

  (async () => {
    try {
      let result;
      if (request.action === "analyzeCodeWithIris") {
         result = await handleIrisAnalyze(request.filename, request.language, request.source_code, request.metadata);
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


async function handleIrisAnalyze(filename, language, source_code, metadata) {
  const apiUrl = `${CONFIG.BACKEND_URL}${IRIS_ANALYZE_ROUTE}`;

  const reqBody = {
    filename,
    language,
    source_code,
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