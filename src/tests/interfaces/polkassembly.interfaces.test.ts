import { 
    OnChainPostParamsInterface, 
    PostByAddressParamsInterface, 
    ListOnChainPostsParamsInterface, 
    AllOpenGovPostsInterface, 
    ListOffChainPostsParamsInterface, 
    OffChainPostParamsInterface 
} from "../../interfaces/polkassembly.interface";

// Mock the module
jest.mock("../../interfaces/polkassembly.interface", () => ({
  OnChainPostParamsInterface: jest.fn<OnChainPostParamsInterface, []>(() => ({
    proposalType: "mocked-proposal",
    postId: 123,
  })),
  PostByAddressParamsInterface: jest.fn<PostByAddressParamsInterface, []>(() => ({
    proposerAddress: "mocked-address",
  })),
  ListOnChainPostsParamsInterface: jest.fn<ListOnChainPostsParamsInterface, []>(() => ({
    proposalType: "mocked-proposal",
    trackStatus: "active",
    trackNo: 1,
    page: 1,
    listingLimit: 10,
    sortBy: "latest",
  })),
  AllOpenGovPostsInterface: jest.fn<AllOpenGovPostsInterface, []>(() => ({
    govType: "mocked-gov-type",
  })),
  ListOffChainPostsParamsInterface: jest.fn<ListOffChainPostsParamsInterface, []>(() => ({
    proposalType: "mocked-proposal",
    page: 2,
    listingLimit: 5,
  })),
  OffChainPostParamsInterface: jest.fn<OffChainPostParamsInterface, []>(() => ({
    proposalType: "mocked-proposal",
    postId: 456,
  })),
}));

describe("Mocked PostParams Interfaces", () => {
  test("should create a mock OnChainPostParamsInterface", () => {
    const mockParams: OnChainPostParamsInterface = {
      proposalType: "mocked-proposal",
      postId: 123,
    };

    expect(mockParams.proposalType).toBe("mocked-proposal");
    expect(mockParams.postId).toBe(123);
  });

  test("should create a mock PostByAddressParamsInterface", () => {
    const mockParams: PostByAddressParamsInterface = {
      proposerAddress: "mocked-address",
    };

    expect(mockParams.proposerAddress).toBe("mocked-address");
  });

  test("should create a mock ListOnChainPostsParamsInterface", () => {
    const mockParams: ListOnChainPostsParamsInterface = {
      proposalType: "mocked-proposal",
      trackStatus: "active",
      trackNo: 1,
      page: 1,
      listingLimit: 10,
      sortBy: "latest",
    };

    expect(mockParams.trackStatus).toBe("active");
    expect(mockParams.listingLimit).toBe(10);
  });

  test("should create a mock AllOpenGovPostsInterface", () => {
    const mockParams: AllOpenGovPostsInterface = {
      govType: "mocked-gov-type",
    };

    expect(mockParams.govType).toBe("mocked-gov-type");
  });

  test("should create a mock ListOffChainPostsParamsInterface", () => {
    const mockParams: ListOffChainPostsParamsInterface = {
      proposalType: "mocked-proposal",
      page: 2,
      listingLimit: 5,
    };

    expect(mockParams.listingLimit).toBe(5);
    expect(mockParams.page).toBe(2);
  });

  test("should create a mock OffChainPostParamsInterface", () => {
    const mockParams: OffChainPostParamsInterface = {
      proposalType: "mocked-proposal",
      postId: 456,
    };

    expect(mockParams.postId).toBe(456);
  });
});
