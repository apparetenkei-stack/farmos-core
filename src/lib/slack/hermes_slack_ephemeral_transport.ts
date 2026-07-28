export const SLACK_CHAT_POST_EPHEMERAL_URL =
  "https://slack.com/api/chat.postEphemeral" as const;

const SLACK_HTTP_TIMEOUT_MS = 10_000;

export type HermesSlackEphemeralPost = {
  channel: string;
  user: string;
  text: string;
  botToken: string;
};

export function createHermesSlackEphemeralPoster(input?: {
  fetchImpl?: typeof fetch;
}): (request: HermesSlackEphemeralPost) => Promise<void> {
  const fetchImpl = input?.fetchImpl ?? fetch;

  return async (request) => {
    const response = await fetchImpl(SLACK_CHAT_POST_EPHEMERAL_URL, {
      method: "POST",
      signal: AbortSignal.timeout(SLACK_HTTP_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${request.botToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: request.channel,
        user: request.user,
        text: request.text,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const result = (await response.json().catch(() => null)) as {
      ok?: unknown;
    } | null;
    if (!response.ok || result?.ok !== true) {
      throw new Error("slack_ephemeral_response_failed");
    }
  };
}
