type SseEvent = { event: string; data: string };

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: number;
  result?: unknown;
  error?: unknown;
};

class SseReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder = new TextDecoder();
  private buffer = '';

  constructor(body: ReadableStream<Uint8Array>) {
    this.reader = body.getReader();
  }

  async next(): Promise<SseEvent> {
    while (true) {
      const boundary = this.buffer.indexOf('\n\n');
      if (boundary >= 0) {
        const block = this.buffer.slice(0, boundary);
        this.buffer = this.buffer.slice(boundary + 2);
        let event = 'message';
        const data: string[] = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
        }
        if (data.length) return { event, data: data.join('\n') };
        continue;
      }
      const { done, value } = await this.reader.read();
      if (done) throw new Error('MCP SSE stream closed');
      this.buffer += this.decoder.decode(value, { stream: true });
      this.buffer = this.buffer.replaceAll('\r\n', '\n');
    }
  }

  async jsonRpc(id: number): Promise<JsonRpcMessage> {
    while (true) {
      const event = await this.next();
      if (event.event !== 'message') continue;
      const parsed = JSON.parse(event.data) as JsonRpcMessage;
      if (parsed.id === id) {
        if (parsed.error) throw new Error('MCP JSON-RPC request failed');
        return parsed;
      }
    }
  }

  async endpoint(): Promise<string> {
    while (true) {
      const event = await this.next();
      if (event.event === 'endpoint') return event.data;
    }
  }
}

async function postJson(
  url: URL,
  authorization: string,
  payload: unknown,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) throw new Error(`MCP POST failed with ${response.status}`);
}

export async function callMayarReadTool(
  authorization: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<JsonRpcMessage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const sseUrl = new URL('https://mcp.mayar.id/sse');

  try {
    const response = await fetch(sseUrl, {
      headers: { Authorization: authorization, Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error('MCP SSE connection failed');

    const reader = new SseReader(response.body);
    const endpoint = new URL(await reader.endpoint(), sseUrl);

    await postJson(endpoint, authorization, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'dana-kuliah-webhook', version: '1.0.0' },
      },
    }, controller.signal);
    await reader.jsonRpc(1);

    await postJson(endpoint, authorization, {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    }, controller.signal);

    await postJson(endpoint, authorization, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }, controller.signal);
    return await reader.jsonRpc(2);
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
