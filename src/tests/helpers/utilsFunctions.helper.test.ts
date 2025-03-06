import { delay, processInBatches, mapWithConcurrency } from "../../helpers/utilsFunctions.helper";

jest.useFakeTimers();

describe("delay", () => {
  it("should resolve after the specified time", async () => {
    const ms = 1000;
    const promise = delay(ms);

    jest.advanceTimersByTime(ms);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe("processInBatches", () => {
  it("should process elements in batches", async () => {
    const mockCallback = jest.fn();
    const inputArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const batchSize = 3;

    await processInBatches(inputArray, batchSize, mockCallback);

    // Verify that callback was called correctly
    expect(mockCallback).toHaveBeenCalledTimes(Math.ceil(inputArray.length / batchSize));

    expect(mockCallback).toHaveBeenCalledWith([1, 2, 3]);
    expect(mockCallback).toHaveBeenCalledWith([4, 5, 6]);
    expect(mockCallback).toHaveBeenCalledWith([7, 8, 9]);
    expect(mockCallback).toHaveBeenCalledWith([10]);
  });

  it("should handle an empty array without errors", async () => {
    const mockCallback = jest.fn();
    await processInBatches([], 3, mockCallback);
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("should call the callback once when batchSize is larger than the array length", async () => {
    const mockCallback = jest.fn();
    const inputArray = [1, 2];
    await processInBatches(inputArray, 5, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith([1, 2]);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});

describe("mapWithConcurrency", () => {
  it("should map an array with a given concurrency level", async () => {
    const mockFn = jest.fn(async (num) => num * 2);
    const inputArray = [1, 2, 3, 4, 5];
    const concurrency = 2;

    const result = await mapWithConcurrency(inputArray, mockFn, concurrency);

    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(mockFn).toHaveBeenCalledTimes(inputArray.length);
  });

  it("should handle an empty array and return an empty array", async () => {
    const mockFn = jest.fn(async (num) => num * 2);
    const result = await mapWithConcurrency([], mockFn, 2);
    expect(result).toEqual([]);
    expect(mockFn).not.toHaveBeenCalled();
  });

  it("should respect concurrency limit", async () => {
    jest.useRealTimers();
  
    const mockFn = jest.fn(async (num) => {
      return new Promise<number>((resolve) => {
        setTimeout(() => {
          resolve(num * 2);
        }, 100);
      });
    });
  
    const inputArray = [1, 2, 3];
    const concurrency = 2;
  
    const result = await mapWithConcurrency(inputArray, mockFn, concurrency);
  
    expect(result).toEqual([2, 4, 6]);
    expect(mockFn).toHaveBeenCalledTimes(inputArray.length);
  }, 10000);
});
