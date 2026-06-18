type UpstashResponse = { result: number };

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ success: boolean; remaining: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return { success: true, remaining: limit };
  }

  const redisKey = `rl:${key}`;

  try {
    const res = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Upstash INCR failed: ${res.status}`);
    }

    const { result: count } = (await res.json()) as UpstashResponse;

    if (count === 1) {
      await fetch(
        `${url}/expire/${encodeURIComponent(redisKey)}/${windowSeconds}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
    }

    return { success: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (error) {
    console.error("rateLimit failed, failing open:", error);
    return { success: true, remaining: limit };
  }
}
