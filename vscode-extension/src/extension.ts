// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { IRISStateManager, IRISAnalysisState } from './state/irisState';
import { IRISSidePanelProvider } from './webview/sidePanel';
import { generateBlockId } from './utils/blockId';
import { DecorationManager } from './decorations/decorationManager';
import { createLogger } from './utils/logger';
import { IRISAPIClient, APIError, APIErrorType } from './api/irisClient';

/**
 * Phase 10: UX Polish & Stability
 * TASK-0104: Structured logging per LOG-001, LOG-002
 * TASK-0101: Global error boundary for server calls
 * TASK-0102: Loading and disabled states
 * TASK-0105: Full cleanup on deactivation
 */

const OUTPUT_CHANNEL_NAME = 'IRIS';
const SUPPORTED_LANGUAGES = new Set([
	'python',
	'javascript',
	'javascriptreact',
	'typescript',
	'typescriptreact',
]);

const ANALYZE_ENDPOINT = 'http://localhost:8080/api/iris/analyze';
const REQUEST_TIMEOUT_MS = 15000;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
	context.subscriptions.push(outputChannel);

	// TASK-0104: Initialize structured logging per LOG-001, LOG-002
	const logger = createLogger(outputChannel, 'Extension');
	logger.info('Extension activated', { version: context.extension.packageJSON.version });

	// Initialize state manager (TASK-0042, STATE-001)
	const stateManager = new IRISStateManager(outputChannel);
	context.subscriptions.push(stateManager);

	// Initialize decoration manager (Phase 7: GOAL-007)
	const decorationManager = new DecorationManager(outputChannel);
	context.subscriptions.push(decorationManager);

	// TASK-0101: Initialize API client with error boundary
	const apiClient = new IRISAPIClient(
		{
			endpoint: ANALYZE_ENDPOINT,
			timeout: REQUEST_TIMEOUT_MS
		},
		createLogger(outputChannel, 'APIClient')
	);

	// Listen to state changes to manage decorations (ED-003)
	stateManager.onStateChange((newState) => {
		const activeEditor = vscode.window.activeTextEditor;
		
		// Clear decorations on IDLE or STALE state per ED-003, TASK-0075
		// Phase 8: Also exit Focus Mode per TASK-0086
		if (newState === IRISAnalysisState.IDLE || newState === IRISAnalysisState.STALE) {
			if (activeEditor) {
				decorationManager.clearAllDecorations(activeEditor);
			}
			decorationManager.disposeAllDecorations();
			logger.info('Cleared decorations', { state: newState });
		}
	});

	// Register webview side panel provider (TASK-0052)
	const sidePanelProvider = new IRISSidePanelProvider(
		context.extensionUri,
		stateManager,
		decorationManager,
		outputChannel
	);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			IRISSidePanelProvider.viewType,
			sidePanelProvider
		)
	);
	context.subscriptions.push(sidePanelProvider);

	// TASK-040, TASK-041: Register Esc key command for exiting Focus Mode
	// Per REQ-009: Esc key must exit focus mode and unfold any folded lines
	const exitFocusModeCommand = vscode.commands.registerCommand('iris.exitFocusMode', async () => {
		try {
			logger.info('Command executed: iris.exitFocusMode');

			const activeEditor = vscode.window.activeTextEditor;
			if (!activeEditor) {
				logger.warn('No active editor for exit focus mode');
				return;
			}

			// TASK-042: Clear focus state in state manager
			if (stateManager.isFocusModeActive()) {
				logger.info('Exiting Focus Mode via Esc key');
				
				// TASK-043: Unfold any previously folded ranges
				if (stateManager.isFoldActive()) {
					const foldedRanges = stateManager.getFoldedRanges();
					if (foldedRanges && foldedRanges.length > 0) {
						await vscode.commands.executeCommand('editor.unfold', {
							selectionLines: foldedRanges.map(([start]) => start)
						});
						logger.info('Unfolded ranges via Esc key', { unfoldCount: foldedRanges.length });
					}
					stateManager.clearFold();
				}

				// Clear focus state
				stateManager.clearFocus();

				// TASK-044: Clear focus decorations
				decorationManager.clearFocusMode(activeEditor);

				// Notify webview to update UI
				sidePanelProvider.notifyFocusCleared();
			} else {
				logger.info('No active focus mode to exit');
			}
		} catch (error) {
			logger.error('Failed to exit focus mode', { error: String(error) });
		}
	});
	context.subscriptions.push(exitFocusModeCommand);

	// Update context when focus mode changes
	const updateFocusModeContext = () => {
		vscode.commands.executeCommand('setContext', 'iris.focusModeActive', stateManager.isFocusModeActive());
	};
	// Set initial context
	updateFocusModeContext();
	// Update context on state changes (simplified - would need event listener in production)
	
	const disposable = vscode.commands.registerCommand('iris.runAnalysis', async () => {
		try {
			outputChannel.show(true);
			logger.info('Command executed: iris.runAnalysis');

			// TASK-0102: Check if already analyzing (prevent duplicate triggers)
			if (stateManager.isAnalyzing()) {
				logger.warn('Analysis already in progress, ignoring duplicate trigger');
				vscode.window.showWarningMessage('IRIS: Analysis already in progress.');
				return;
			}

			// Edge case: No active editor
			const activeEditor = vscode.window.activeTextEditor;
			if (!activeEditor) {
				logger.warn('No active editor found');
				vscode.window.showInformationMessage('IRIS: No active editor to analyze.');
				return;
			}

			const document = activeEditor.document;
			const filePath = document.uri.fsPath;
			const fileUri = document.uri.toString();
			const fileName = path.basename(filePath);
			const languageId = document.languageId;
			const sourceCode = document.getText();
			const lineCount = document.lineCount;

			logger.info('Analyzing file', {
				fileName,
				languageId,
				filePath,
				lineCount,
				sourceLength: sourceCode.length
			});

			// Edge case: Unsupported language
			if (!SUPPORTED_LANGUAGES.has(languageId)) {
				logger.warn('Unsupported language detected', { languageId });
				vscode.window.showWarningMessage(
					`IRIS: Unsupported language "${languageId}". Supported: ${Array.from(SUPPORTED_LANGUAGES).join(', ')}`
				);
				return;
			}

			// Add line numbers to source code per API contract (TASK-0034)
			const sourceWithLineNumbers = sourceCode
				.split('\n')
				.map((line, idx) => `${idx + 1} | ${line}`)
				.join('\n');

			const payload = {
				filename: fileName,
				language: languageId,
				source_code: sourceWithLineNumbers,
				metadata: {
					filepath: filePath,
					line_count: lineCount,
				},
			};

			// Transition to ANALYZING state (TASK-0045)
			// TASK-0102: This sets loading state for UI
			stateManager.startAnalysis(fileUri);
			
			// Show progress notification
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'IRIS',
					cancellable: false
				},
				async (progress) => {
					progress.report({ message: 'Analyzing file...' });

					try {
						// TASK-0101: Use API client with error boundary
						logger.info('Sending analysis request');
						const response = await apiClient.analyze(payload);

						// Edge case: Empty response (no blocks)
						if (response.responsibility_blocks.length === 0) {
							logger.warn('Server returned empty responsibility blocks');
							vscode.window.showWarningMessage('IRIS: No responsibility blocks found in file.');
							stateManager.setError('No responsibility blocks found', fileUri);
							return;
						}

						// Normalize and store analysis data (TASK-0046)
						// Generate blockId for each block per TASK-0062, REQ-005
						const normalizedBlocks = response.responsibility_blocks.map((block) => ({
							...block,
							blockId: generateBlockId(block)  // Deterministic blockId generation per Phase 6
						}));

						stateManager.setAnalyzed({
							fileIntent: response.file_intent,
							metadata: response.metadata,
							responsibilityBlocks: normalizedBlocks,
							rawResponse: {
								file_intent: response.file_intent,
								metadata: response.metadata,
								responsibility_blocks: response.responsibility_blocks
							},
							analyzedFileUri: fileUri,
							analyzedAt: new Date()
						});

						logger.info('Analysis completed successfully', {
							blockCount: normalizedBlocks.length,
							fileIntent: response.file_intent.substring(0, 50)
						});
						
						vscode.window.showInformationMessage('IRIS: Analysis completed successfully.');

					} catch (error) {
						// TASK-0101: Handle API errors with proper user messaging
						if (error instanceof APIError) {
							const userMessage = IRISAPIClient.getUserMessage(error);
							logger.error('API error during analysis', {
								type: error.type,
								statusCode: error.statusCode,
								message: error.message
							});
							stateManager.setError(error.message, fileUri);
							vscode.window.showErrorMessage(`IRIS: ${userMessage}`);
						} else {
							// Unexpected error
							const message = error instanceof Error ? error.message : 'Unknown error';
							logger.errorWithException('Unexpected error during analysis', error);
							stateManager.setError(message, fileUri);
							vscode.window.showErrorMessage('IRIS: Analysis failed due to an unexpected error.');
						}
					}
				}
			);

		} catch (error) {
			// Top-level error boundary per LOG-003
			const message = error instanceof Error ? error.message : 'Unknown error';
			logger.errorWithException('Command execution failed', error);
			stateManager.setError(message);
			vscode.window.showErrorMessage('IRIS: Analysis failed.');
		}
	});

	context.subscriptions.push(disposable);

	// Document change listener for STALE state transition (Phase 9: GOAL-009)
	// Per STATE-003: Any edit invalidates analysis immediately (no diffing, no heuristics)
	// TASK-0091: Register document change listeners scoped to active file
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => {
			const currentState = stateManager.getCurrentState();
			
			// TASK-0095: Prevent redundant STALE transitions
			// Only transition to STALE if currently ANALYZED (single-shot)
			if (currentState !== IRISAnalysisState.ANALYZED) {
				return;
			}

			// Check if the changed document matches the analyzed file
			const analyzedFileUri = stateManager.getAnalyzedFileUri();
			if (!analyzedFileUri || event.document.uri.toString() !== analyzedFileUri) {
				return;
			}

			// Ignore empty changes (e.g., format-only operations with no content change)
			if (event.contentChanges.length === 0) {
				return;
			}

			// TASK-0096: Log file invalidation per LOG-001
			logger.info('File modification detected - invalidating analysis', {
				changedFile: event.document.uri.toString(),
				changeCount: event.contentChanges.length,
				transition: 'ANALYZED → STALE'
			});
			
			// TASK-0092: Transition to STALE state per STATE-003
			// This will trigger:
			// 1. State transition to STALE (setStale() in state manager)
			// 2. TASK-0093: Clear all decorations per ED-003 (via onStateChange listener)
			// 3. TASK-0093: Exit Focus Mode (via setStale() calling clearFocus())
			// 4. TASK-0094: Send ANALYSIS_STALE message to webview per UX-001 (via webview's handleStateChange)
			stateManager.setStale();
			
			logger.info('Analysis invalidated - state updated to STALE');
		})
	);

	// Active editor change listener for Phase 8: Exit Focus Mode per TASK-0086
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			// Exit Focus Mode when switching editors
			if (stateManager.isFocusModeActive()) {
				logger.info('Active editor changed - exiting Focus Mode');
				stateManager.clearFocus();
				
				// Clear focus decorations if we have an editor
				if (editor) {
					decorationManager.clearFocusMode(editor);
				}
			}
		})
	);

	logger.info('Extension activation complete', {
		supportedLanguages: Array.from(SUPPORTED_LANGUAGES)
	});
}

// This method is called when your extension is deactivated
// TASK-0105: Ensure full cleanup on extension deactivation per ED-003
export function deactivate() {
	// Cleanup is handled automatically through context.subscriptions
	// All disposables registered via context.subscriptions.push() will be disposed
	// This includes:
	// - Output channel
	// - State manager (disposes event emitters)
	// - Decoration manager (disposes all decoration types per ED-003)
	// - Webview provider (clears state, removes listeners)
	// - Event listeners (document changes, editor changes)
	// 
	// No explicit cleanup needed here per VS Code extension lifecycle
}
