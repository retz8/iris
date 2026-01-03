// Configuration for the Chrome Extension
const CONFIG = {
  // NOTE: 사지방 dev env is based on vscode tunnel
  BACKEND_URL: "https://vnw20xbg-8080.asse.devtunnels.ms",
  API_ENDPOINTS: {
    CONVERT: "/convert",
    HEALTH: "/health",
  },
};

// Make it available globally for both content scripts and service workers
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
}
// Inject content.js as an ES6 module
(function () {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("content.js");
  script.type = "module";
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
})();
