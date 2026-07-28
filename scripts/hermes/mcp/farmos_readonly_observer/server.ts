import { pathToFileURL } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  executeFarmStatusTool,
  FARMOS_READONLY_SERVER_NAME,
  FARMOS_READONLY_TOOL_INPUT_SCHEMA,
  FARMOS_READONLY_TOOL_NAME,
  serializeFarmStatusToolResult,
} from "./contract";

export function createFarmosReadonlyMcpServer(): Server {
  const server = new Server(
    {
      name: FARMOS_READONLY_SERVER_NAME,
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: FARMOS_READONLY_TOOL_NAME,
        description:
          "FarmOSの読み取り専用農場状況を取得する。presentation_jaは検証済み事実から生成された利用者向け日本語である。日付を言い換えたり再計算せず意味を維持する。作業完了、確定予定、補充必要性を推測しない。データ変更、Proposal、Approval、Applyは提供しない。",
        inputSchema: FARMOS_READONLY_TOOL_INPUT_SCHEMA,
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== FARMOS_READONLY_TOOL_NAME) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: serializeFarmStatusToolResult(
              await executeFarmStatusTool(null),
            ),
          },
        ],
      };
    }
    const result = await executeFarmStatusTool(request.params.arguments);
    return {
      isError: result.schema_version.endsWith(".error.v1"),
      content: [
        {
          type: "text",
          text: serializeFarmStatusToolResult(result),
        },
      ],
    };
  });

  return server;
}

export async function startFarmosReadonlyMcpServer(): Promise<void> {
  const server = createFarmosReadonlyMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await startFarmosReadonlyMcpServer();
}
