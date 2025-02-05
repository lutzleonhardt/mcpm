import { HostService, HostType } from '@mcpm/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { buildTransportForServer } from './transportHelper.js';
import Ajv from 'ajv';

export async function callToolFunction(
  tool: string,
  functionName: string,
  parameters: any
): Promise<void> {
  const claudeSrv = HostService.getInstanceByType(HostType.CLAUDE);
  const server = await claudeSrv.getMCPServerWithStatus(tool);
  if (!server || !server.enabled) {
    throw new Error(`MCP server with identifier '${tool}' is not available or not enabled.`);
  }

  // Validate parameters
  if (typeof parameters !== 'object' || parameters === null) {
    throw new Error("Invalid parameters: Expected a JSON object. Please check your JSON formatting.");
  }

  // Debug log if environment variable DEBUG is set
  if (process.env.DEBUG) {
    console.debug("Transport configuration (server arguments/env):", {
      args: server.info.appConfig.args,
      env: server.info.appConfig.env,
    });
  }

  // Use the helper to build the transport with proper environment and placeholder replacement
  const transport = buildTransportForServer(server);

  try {
    // Try to start the transport
    try {
      await transport.start();
    } catch (startError) {
      console.error(
        `Could not spawn process using command '${server.info.appConfig.command}'. ` +
        `Please verify the command path, permissions, and that the executable exists.`
      );
      throw startError;
    }

    const client = new Client({ name: tool, version: '1.0.0' });
    await client.connect(transport);

    // Validate parameters against tool schema
    const toolsResponse = await client.listTools();
    const toolInfo = toolsResponse.tools.find(t => t.name === functionName);
    if (toolInfo && toolInfo.inputSchema) {
      const ajv = new Ajv();
      const validate = ajv.compile(toolInfo.inputSchema);
      if (!validate(parameters)) {
        throw new Error('Invalid parameters: ' + ajv.errorsText(validate.errors));
      }
    }

    // Call the tool function
    const result = await client.callTool({ name: functionName, arguments: parameters });
    console.log('Tool call result:', result);
  } catch (error) {
    console.error(
      `Error calling function '${functionName}' on MCP server '${tool}':`,
      error instanceof Error ? error.message : error
    );
    throw error;
  } finally {
    await transport.close();
  }
}
