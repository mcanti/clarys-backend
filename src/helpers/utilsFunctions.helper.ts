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
  const results: R[] = new Array(array.length);
  const executing: Promise<void>[] = [];
  
  let i = 0;
  
  const executeTask = async (index: number) => {
    results[index] = await iteratorFn(array[index]);
  };

  for (; i < array.length; i++) {
    const task = executeTask(i);
    executing.push(task);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === task),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
};
