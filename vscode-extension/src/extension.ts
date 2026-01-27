// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';

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

function logInfo(channel: vscode.OutputChannel, message: string): void {
	channel.appendLine(`[INFO] ${message}`);
}

function logError(channel: vscode.OutputChannel, message: string): void {
	channel.appendLine(`[ERROR] ${message}`);
}

async function postAnalysisRequest(
	channel: vscode.OutputChannel,
	payload: unknown,
): Promise<unknown> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		logInfo(channel, `POST ${ANALYZE_ENDPOINT}`);
		const response = await fetch(ANALYZE_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
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

function isValidAnalysisResponse(response: unknown): response is {
	success: boolean;
	file_intent?: string;
	responsibility_blocks?: unknown[];
	metadata?: unknown;
} {
	if (!response || typeof response !== 'object') {
		return false;
	}

	const record = response as {
		success?: unknown;
		file_intent?: unknown;
		responsibility_blocks?: unknown;
	};

	if (typeof record.success !== 'boolean') {
		return false;
	}

	if (record.success) {
		if (typeof record.file_intent !== 'string') {
			return false;
		}
		if (!Array.isArray(record.responsibility_blocks)) {
			return false;
		}
	}

	return true;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
	context.subscriptions.push(outputChannel);

	logInfo(outputChannel, 'Extension activated.');

	const disposable = vscode.commands.registerCommand('iris.runAnalysis', async () => {
		try {
			outputChannel.show(true);
			logInfo(outputChannel, 'Command executed: iris.runAnalysis');

			const activeEditor = vscode.window.activeTextEditor;
			if (!activeEditor) {
				logInfo(outputChannel, 'No active editor found.');
				vscode.window.showInformationMessage('IRIS: No active editor to analyze.');
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
					`IRIS: Unsupported language "${languageId}".`,
				);
				return;
			}

			const payload = {
				filename: fileName,
				language: languageId,
				source_code: sourceCode,
				metadata: {
					filepath: filePath,
					line_count: lineCount,
				},
			};

			logInfo(outputChannel, 'Sending analysis request...');
			const response = await postAnalysisRequest(outputChannel, payload);

			if (!isValidAnalysisResponse(response)) {
				logError(outputChannel, 'Invalid response schema from server.');
				vscode.window.showErrorMessage('IRIS analysis failed: invalid response.');
				return;
			}

			if (!response.success) {
				logError(outputChannel, 'Server returned success=false.');
				vscode.window.showErrorMessage('IRIS analysis failed on server.');
				return;
			}

			logInfo(outputChannel, 'Analysis completed successfully.');
			vscode.window.showInformationMessage('IRIS analysis completed.');

		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			logError(outputChannel, `Command failed: ${message}`);
			vscode.window.showErrorMessage('IRIS analysis failed.');
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
