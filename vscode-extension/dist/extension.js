"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var path = __toESM(require("path"));
var vscode = __toESM(require("vscode"));
var OUTPUT_CHANNEL_NAME = "IRIS";
var SUPPORTED_LANGUAGES = /* @__PURE__ */ new Set([
  "python",
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact"
]);
var ANALYZE_ENDPOINT = "http://localhost:8080/api/iris/analyze";
var REQUEST_TIMEOUT_MS = 15e3;
function logInfo(channel, message) {
  channel.appendLine(`[INFO] ${message}`);
}
function logError(channel, message) {
  channel.appendLine(`[ERROR] ${message}`);
}
async function postAnalysisRequest(channel, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    logInfo(channel, `POST ${ANALYZE_ENDPOINT}`);
    const response = await fetch(ANALYZE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    logInfo(channel, `Response status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
function isValidAnalysisResponse(response) {
  if (!response || typeof response !== "object") {
    return false;
  }
  const record = response;
  if (typeof record.success !== "boolean") {
    return false;
  }
  if (record.success) {
    if (typeof record.file_intent !== "string") {
      return false;
    }
    if (!Array.isArray(record.responsibility_blocks)) {
      return false;
    }
  }
  return true;
}
function activate(context) {
  const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(outputChannel);
  logInfo(outputChannel, "Extension activated.");
  const disposable = vscode.commands.registerCommand("iris.runAnalysis", async () => {
    try {
      outputChannel.show(true);
      logInfo(outputChannel, "Command executed: iris.runAnalysis");
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        logInfo(outputChannel, "No active editor found.");
        vscode.window.showInformationMessage("IRIS: No active editor to analyze.");
        return;
      }
      const document = activeEditor.document;
      const filePath = document.uri.fsPath;
      const fileName = path.basename(filePath);
      const languageId = document.languageId;
      const sourceCode = document.getText();
      const lineCount = document.lineCount;
      logInfo(outputChannel, `Active file: ${fileName}`);
      logInfo(outputChannel, `Language ID: ${languageId}`);
      logInfo(outputChannel, `File path: ${filePath}`);
      logInfo(outputChannel, `Line count: ${lineCount}`);
      logInfo(outputChannel, `Source length: ${sourceCode.length} chars`);
      if (!SUPPORTED_LANGUAGES.has(languageId)) {
        logInfo(outputChannel, `Unsupported language: ${languageId}`);
        vscode.window.showWarningMessage(
          `IRIS: Unsupported language "${languageId}".`
        );
        return;
      }
      const payload = {
        filename: fileName,
        language: languageId,
        source_code: sourceCode,
        metadata: {
          filepath: filePath,
          line_count: lineCount
        }
      };
      logInfo(outputChannel, "Sending analysis request...");
      const response = await postAnalysisRequest(outputChannel, payload);
      if (!isValidAnalysisResponse(response)) {
        logError(outputChannel, "Invalid response schema from server.");
        vscode.window.showErrorMessage("IRIS analysis failed: invalid response.");
        return;
      }
      if (!response.success) {
        logError(outputChannel, "Server returned success=false.");
        vscode.window.showErrorMessage("IRIS analysis failed on server.");
        return;
      }
      logInfo(outputChannel, "Analysis completed successfully.");
      vscode.window.showInformationMessage("IRIS analysis completed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logError(outputChannel, `Command failed: ${message}`);
      vscode.window.showErrorMessage("IRIS analysis failed.");
    }
  });
  context.subscriptions.push(disposable);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
