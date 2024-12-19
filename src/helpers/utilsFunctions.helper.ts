export const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const processInBatches = async (array, batchSize, callback) => {
    for (let i = 0; i < array.length; i += batchSize) {
      const batch = array.slice(i, i + batchSize);
      await callback(batch);
    }
  }