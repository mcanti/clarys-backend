import { SchedulerInterface } from "../../interfaces/scheduler.interface";

// Mock the module
jest.mock("../../interfaces/scheduler.interface", () => ({
  SchedulerInterface: jest.fn<SchedulerInterface, []>(() => ({
    scheduleTasks: jest.fn(),
  })),
}));

describe("Mocked SchedulerInterface", () => {
  test("should create a mock SchedulerInterface and call scheduleTasks", () => {
    // Create a mock scheduler instance
    const mockScheduler: SchedulerInterface = {
      scheduleTasks: jest.fn(),
    };

    // Call the method
    mockScheduler.scheduleTasks();

    // Ensure the function was called
    expect(mockScheduler.scheduleTasks).toHaveBeenCalled();
  });

  test("should verify that scheduleTasks can be called multiple times", () => {
    const mockScheduler: SchedulerInterface = {
      scheduleTasks: jest.fn(),
    };

    // Call the function multiple times
    mockScheduler.scheduleTasks();
    mockScheduler.scheduleTasks();

    // Ensure it was called twice
    expect(mockScheduler.scheduleTasks).toHaveBeenCalledTimes(2);
  });
});
