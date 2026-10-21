import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export interface JobOptions {
  signal?: AbortSignal;
  onProgress?: (progress: number, message: string) => Promise<void>;
}

export function toolJob(extra: RequestHandlerExtra<ServerRequest, ServerNotification>): JobOptions {
  const token = extra._meta?.progressToken;
  return {
    signal: extra.signal,
    onProgress: async (progress, message) => {
      extra.signal.throwIfAborted();
      if (token !== undefined) await extra.sendNotification({ method: 'notifications/progress', params: { progressToken: token, progress, total: 100, message } });
    },
  };
}
