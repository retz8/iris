/**
 * IRIS API Endpoint Configuration
 *
 * Centralized endpoint configuration for all UI layer applications
 * (VS Code extension, Chrome extension, web app, etc.)
 *
 * This ensures consistent API endpoint across all clients and makes
 * environment-specific deployments easier to manage.
 */

/**
 * Production IRIS API endpoint (EC2 deployment)
 */
export const DEFAULT_IRIS_API_ENDPOINT = 'https://api.iris-codes.com/api/iris/analyze';

/**
 * Default request timeout in milliseconds
 */
export const DEFAULT_IRIS_API_TIMEOUT = 15000;

/**
 * Legacy Lambda endpoint (deprecated, for reference only)
 * @deprecated Use DEFAULT_IRIS_API_ENDPOINT instead
 */
export const LEGACY_LAMBDA_ENDPOINT = 'https://ejg9mydfzi.execute-api.us-east-2.amazonaws.com/api/iris/analyze';
