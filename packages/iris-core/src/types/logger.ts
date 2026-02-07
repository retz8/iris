/**
 * Platform-agnostic logger interface.
 * iris-core internals and adapters program against this contract.
 * VS Code adapter implements this via OutputChannel.
 * Future browser adapter would use console.
 */
export interface Logger {
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
  errorWithException(message: string, error: unknown, context?: Record<string, any>): void;
}
