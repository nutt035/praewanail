type CachedReply = {
  token: string;
  receivedAt: number;
};

const REPLY_WINDOW_MS = 50_000;
const globalCache = globalThis as typeof globalThis & {
  __lineReplyTokens?: Map<string, CachedReply>;
};

const replyTokens = globalCache.__lineReplyTokens ?? new Map<string, CachedReply>();
globalCache.__lineReplyTokens = replyTokens;

export function rememberLineReplyToken(chatUserId: string, token: string) {
  replyTokens.set(chatUserId, { token, receivedAt: Date.now() });
}

export function takeLineReplyToken(chatUserId: string): string | null {
  const cached = replyTokens.get(chatUserId);
  replyTokens.delete(chatUserId);
  if (!cached || Date.now() - cached.receivedAt > REPLY_WINDOW_MS) return null;
  return cached.token;
}
