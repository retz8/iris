import * as vscode from 'vscode';
import type { Logger as ILogger } from '@iris/core';

/**
 * Structured logging utility
 *
 * Features:
 * - Centralized Output Channel routing
 * - Explicit severity levels (INFO, WARN, ERROR, DEBUG)
 * - Timestamps and structured context
 */

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export class Logger implements ILogger {
  private outputChannel: vscode.OutputChannel;
  private componentName: string;

  constructor(outputChannel: vscode.OutputChannel, componentName: string) {
    this.outputChannel = outputChannel;
    this.componentName = componentName;
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log a debug message (verbose)
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an error with exception details
   */
  errorWithException(message: string, error: unknown, context?: Record<string, any>): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: errorMessage,
      stack: errorStack
    });
  }

  /**
   * Core logging function with structured format
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context, null, 0)}` : '';
    const logLine = `[${timestamp}] [${level}] [${this.componentName}] ${message}${contextStr}`;
    
    this.outputChannel.appendLine(logLine);
    
    // For ERROR level, also show to user
    if (level === LogLevel.ERROR) {
      // Don't block on user interaction
      void vscode.window.showErrorMessage(`IRIS: ${message}`);
    }
  }

  /**
   * Show output channel to user
   */
  show(preserveFocus: boolean = true): void {
    this.outputChannel.show(preserveFocus);
  }
}

/**
 * Create a logger instance for a component
 */
export function createLogger(outputChannel: vscode.OutputChannel, componentName: string): Logger {
  return new Logger(outputChannel, componentName);
}
