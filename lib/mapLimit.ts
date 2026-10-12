// Run `fn` over `items` with at most `limit` calls in flight at once. Results
// come back in input order. Used where firing everything at once would trip a
// server-side concurrency cap — e.g. the service-worker warm-up, whose page
// fetches each take a Lambda instance on AWS.
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
}
