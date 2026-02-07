// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { IRISAnalysisState, generateBlockId, IRISAPIClient, APIError, APIErrorType } from '@iris/core';
import { IRISStateManager } from './state/irisState';
import { IRISSidePanelProvider } from './webview/sidePanel';
import { DecorationManager } from './decorations/decorationManager';
import { createLogger } from './utils/logger';


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

	const logger = createLogger(outputChannel, 'Extension');
	logger.info('Extension activated', { version: context.extension.packageJSON.version });

	// Initialize state manager
	const stateManager = new IRISStateManager(outputChannel);
	context.subscriptions.push(stateManager);

	// Initialize decoration manager
	const decorationManager = new DecorationManager(outputChannel);
	context.subscriptions.push(decorationManager);

	// Initialize API client with error boundary
	const apiClient = new IRISAPIClient(
		{
			endpoint: ANALYZE_ENDPOINT,
			timeout: REQUEST_TIMEOUT_MS
		},
		createLogger(outputChannel, 'APIClient')
	);

	// Listen to state changes to manage decorations
	stateManager.onStateChange((newState) => {
		const activeEditor = vscode.window.activeTextEditor;
		
		// Clear decorations on IDLE or STALE state
		if (newState === IRISAnalysisState.IDLE || newState === IRISAnalysisState.STALE) {
			if (activeEditor) {
				decorationManager.clearAllDecorations(activeEditor);
			}
			decorationManager.disposeAllDecorations();
			logger.info('Cleared decorations', { state: newState });
		}
	});

	// Register webview side panel provider
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

	// Register Esc key command for exiting block selection
	// Esc key deselects currently selected block
	const exitFocusModeCommand = vscode.commands.registerCommand('iris.exitFocusMode', async () => {
		try {
			logger.info('Command executed: iris.exitFocusMode (deselect block)');

			const activeEditor = vscode.window.activeTextEditor;
			if (!activeEditor) {
				logger.warn('No active editor for deselect block');
				return;
			}

			// Check if block is selected
			const selectedBlockId = stateManager.getSelectedBlockId();
			if (selectedBlockId) {
				logger.info('Deselecting block via Esc key', { blockId: selectedBlockId });
				
				// Deselect block and clear state
				stateManager.deselectBlock();

				// Clear decorations
				decorationManager.clearCurrentHighlight(activeEditor);

				// Update VS Code context
				vscode.commands.executeCommand('setContext', 'iris.blockSelected', false);

				// Notify webview of deselection via STATE_UPDATE message
				sidePanelProvider.sendStateUpdate();
				logger.info('Block deselected via Esc key');
			} else {
				logger.info('No selected block to deselect');
			}
		} catch (error) {
			logger.error('Failed to deselect block', { error: String(error) });
		}
	});
	context.subscriptions.push(exitFocusModeCommand);

	// Register command for navigating to previous segment (Ctrl+Up)
	const navigatePreviousSegmentCommand = vscode.commands.registerCommand('iris.navigatePreviousSegment', async () => {
		try {
			logger.info('Command executed: iris.navigatePreviousSegment');

			const selectedBlockId = stateManager.getSelectedBlockId();
			if (!selectedBlockId) {
				logger.warn('No selected block for segment navigation');
				return;
			}

			// Send message to webview to navigate to previous segment
			sidePanelProvider.sendNavigationCommand('prev');
			logger.info('Sent navigate previous segment command to webview', { blockId: selectedBlockId });
		} catch (error) {
			logger.error('Failed to navigate to previous segment', { error: String(error) });
		}
	});
	context.subscriptions.push(navigatePreviousSegmentCommand);

	// Register command for navigating to next segment (Ctrl+Down)
	const navigateNextSegmentCommand = vscode.commands.registerCommand('iris.navigateNextSegment', async () => {
		try {
			logger.info('Command executed: iris.navigateNextSegment');

			const selectedBlockId = stateManager.getSelectedBlockId();
			if (!selectedBlockId) {
				logger.warn('No selected block for segment navigation');
				return;
			}

			// Send message to webview to navigate to next segment
			sidePanelProvider.sendNavigationCommand('next');
			logger.info('Sent navigate next segment command to webview', { blockId: selectedBlockId });
		} catch (error) {
			logger.error('Failed to navigate to next segment', { error: String(error) });
		}
	});
	context.subscriptions.push(navigateNextSegmentCommand);

	// Set initial context for block selection
	vscode.commands.executeCommand('setContext', 'iris.blockSelected', false);
	
	const disposable = vscode.commands.registerCommand('iris.runAnalysis', async () => {
		try {
			outputChannel.show(true);
			logger.info('Command executed: iris.runAnalysis');

			// Check if already analyzing (prevent duplicate triggers)
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

			// Add line numbers to source code per API contract
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

			// Reveal the IRIS side panel so the user can see results
			vscode.commands.executeCommand('iris.sidePanel.focus');

			// Transition to ANALYZING state
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
						logger.info('Sending analysis request');
						const response = await apiClient.analyze(payload);

						// Edge case: Empty response (no blocks)
						if (response.responsibility_blocks.length === 0) {
							logger.warn('Server returned empty responsibility blocks');
							vscode.window.showWarningMessage('IRIS: No responsibility blocks found in file.');
							stateManager.setError('No responsibility blocks found', fileUri);
							return;
						}

						// Normalize and store analysis data with deterministic blockIds
						const normalizedBlocks = response.responsibility_blocks.map((block) => ({
							...block,
							blockId: generateBlockId(block)
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
						// Handle API errors with proper user messaging
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
			// Top-level error boundary
			const message = error instanceof Error ? error.message : 'Unknown error';
			logger.errorWithException('Command execution failed', error);
			stateManager.setError(message);
			vscode.window.showErrorMessage('IRIS: Analysis failed.');
		}
	});

	context.subscriptions.push(disposable);

	// Document change listener for STALE state transition
	// Any edit invalidates analysis immediately (no diffing, no heuristics)
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => {
			const currentState = stateManager.getCurrentState();
			
			// Prevent redundant STALE transitions
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

			logger.info('File modification detected - invalidating analysis', {
				changedFile: event.document.uri.toString(),
				changeCount: event.contentChanges.length,
				transition: 'ANALYZED → STALE'
			});
			
			// Transition to STALE state
			stateManager.setStale();
			
			logger.info('Analysis invalidated - state updated to STALE');
		})
	);

	// Active editor change listener: Clear block selection when switching editors
	// UI Refinement 2: Pin/unpin selection model automatically deselects on editor switch
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			const selectedBlockId = stateManager.getSelectedBlockId();
			if (selectedBlockId && editor) {
				logger.info('Active editor changed - clearing block selection');
				stateManager.deselectBlock();
				decorationManager.clearBlockSelection(editor);
			}
		})
	);

	logger.info('Extension activation complete', {
		supportedLanguages: Array.from(SUPPORTED_LANGUAGES)
	});
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Cleanup is handled automatically through context.subscriptions
	// All disposables registered via context.subscriptions.push() will be disposed
	// This includes:
	// - Output channel
	// - State manager (disposes event emitters)
	// - Decoration manager (disposes all decoration types)
	// - Webview provider (clears state, removes listeners)
	// - Event listeners (document changes, editor changes)
	// 
	// No explicit cleanup needed here
}
