import type { MCPServerWithStatus } from '@mcpm/sdk';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Replace placeholders in an argument using the provided arguments object.
 */
export function replacePlaceholders(arg: string, argumentsObj: Record<string, string>): string {
  const placeholderMatch = arg.match(/^\*\*(.+)\*\*$/);
  return placeholderMatch ? argumentsObj[placeholderMatch[1]] ?? arg : arg;
}

/**
 * Provides fallback arguments from the server configuration.
 */
export function getArgumentsWithFallback(server: MCPServerWithStatus): Record<string, string> {
  return server.info.arguments ?? {};
}

/**
 * Builds and returns a configured StdioClientTransport instance for the given MCPServerWithStatus.
 */
export function buildTransportForServer(server: MCPServerWithStatus): StdioClientTransport {
  const args = getArgumentsWithFallback(server);
  const env = server.info.appConfig?.env || {};


  return new StdioClientTransport({
    command: server.info.appConfig.command,
    args: (server.info.appConfig.args || []).map(arg =>
      replacePlaceholders(arg, args)
    ),
    env: {
      ...getDefaultEnvironment(),
      ...env
    },
  });
}
