export const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const processInBatches = async (array, batchSize, callback) => {
  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    await callback(batch);
  }
};

export const mapWithConcurrency = async <T, R>(
  array: T[],
  iteratorFn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> => {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of array) {
    const p = (async () => {
      results.push(await iteratorFn(item));
    })();

    executing.push(p);
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(0, executing.length - concurrency + 1);
    }
  }

  await Promise.allSettled(executing);
  return results;
};
