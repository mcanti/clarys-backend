import axios from "axios";
import https from "https";
import { PolkassemblyService } from "../../services/polkassembly.service";
import {
    OnChainPostParamsInterface,
    PostByAddressParamsInterface,
    ListOnChainPostsParamsInterface,
    AllOpenGovPostsInterface,
    ListOffChainPostsParamsInterface,
    OffChainPostParamsInterface
} from "../../interfaces/polkassembly.interface";

jest.mock("axios");

describe("PolkassemblyService", () => {
    let polkassemblyService: PolkassemblyService;

    beforeEach(() => {
        polkassemblyService = new PolkassemblyService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // Without Mocking (Real API Call)

    describe("PolkassemblyService - Without Mocking (Real API Call)", () => {
        let polkassemblyService: PolkassemblyService;
    
        beforeEach(() => {
            polkassemblyService = new PolkassemblyService();
        });
    
        afterEach(() => {
            jest.clearAllMocks();
        });
    
        it("should fetch an on-chain post from the API", async () => {
            const params: OnChainPostParamsInterface = {
                proposalType: "referendum",
                postId: 123
            };
    
            const response = await polkassemblyService.OnChainPost(params);
            expect(response).toBeDefined();
            expect(Array.isArray(response)).toBeTruthy();
        }, 10000);
    
        it("should fetch posts by proposer address", async () => {
            const params: PostByAddressParamsInterface = {
                proposerAddress: "5D..."
            };
    
            const response = await polkassemblyService.PostByAddress(params);
            expect(response).toBeDefined();
            expect(Array.isArray(response)).toBeTruthy();
        }, 10000);
    
        it("should fetch a list of on-chain posts", async () => {
            const params: ListOnChainPostsParamsInterface = { proposalType: 'bounties', page: 1, listingLimit: 100, sortBy: 'newest' };
    
            const response = await polkassemblyService.ListOnChainPosts(params);
            expect(response).toBeDefined();
            expect(Array.isArray(response)).toBeTruthy();
        }, 10000);
    
        it("should fetch all open governance posts", async () => {
            const params: AllOpenGovPostsInterface = { govType: "referendum" };
    
            const response = await polkassemblyService.AllOpenGovPosts(params);
            expect(response).toBeDefined();
            expect(Array.isArray(response)).toBeTruthy();
        }, 10000);
    
        it("should fetch an off-chain post", async () => {
            const params: OffChainPostParamsInterface = {
                proposalType: "discussion",
                postId: 456
            };
    
            const response = await polkassemblyService.OffChainPost(params);
            expect(response).toBeDefined();
            expect(typeof response).toBe("object");
        }, 10000);
    });

    // With Mocking Axios

    describe("OnChainPost - With Mocking Axios", () => {
        it("should return mock data when API call is successful", async () => {
            const mockData = { id: 1, title: "Mock On-Chain Post" };
            (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

            const params: OnChainPostParamsInterface = {
                proposalType: "referendum",
                postId: 123
            };

            const result = await polkassemblyService.OnChainPost(params);

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining("https://polkadot.polkassembly.io/api/v1/posts/on-chain-post"),
                expect.objectContaining({
                    params: expect.any(Object),
                    maxBodyLength: Infinity,
                    headers: { "x-network": "polkadot" },
                    httpsAgent: expect.any(https.Agent)
                })
            );

            expect(result).toEqual(mockData);
        });

        it("should return an empty array when API call fails", async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

            const params: OnChainPostParamsInterface = {
                proposalType: "referendum",
                postId: 123
            };

            const result = await polkassemblyService.OnChainPost(params);

            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe("PostByAddress - With Mocking Axios", () => {
        it("should return mock data when API call is successful", async () => {
            const mockData = [{ id: 1, proposerAddress: "5D..." }];
            (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

            const params: PostByAddressParamsInterface = {
                proposerAddress: "5D..."
            };

            const result = await polkassemblyService.PostByAddress(params);

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining("https://polkadot.polkassembly.io/api/v1/listing/posts-by-address"),
                expect.objectContaining({
                    params: expect.any(Object),
                    maxBodyLength: Infinity,
                    headers: { "x-network": "polkadot" },
                    httpsAgent: expect.any(https.Agent)
                })
            );

            expect(result).toEqual(mockData);
        });

        it("should return an empty array when API call fails", async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

            const params: PostByAddressParamsInterface = {
                proposerAddress: "5D..."
            };

            const result = await polkassemblyService.PostByAddress(params);

            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe("ListOnChainPosts - With Mocking Axios", () => {
        it("should return mock data when API call is successful", async () => {
            const mockData = [{ id: 1, trackNo: 10 }];
            (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

            const params: ListOnChainPostsParamsInterface = { proposalType: 'bounties', page: 1, listingLimit: 100, sortBy: 'newest' };

            const result = await polkassemblyService.ListOnChainPosts(params);

            expect(axios.get).toHaveBeenCalled();
            expect(result).toEqual(mockData);
        });

        it("should return an empty array when API call fails", async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

            const params: ListOnChainPostsParamsInterface = { proposalType: 'bounties', page: 1, listingLimit: 100, sortBy: 'newest'};

            const result = await polkassemblyService.ListOnChainPosts(params);

            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe("AllOpenGovPosts - With Mocking Axios", () => {
        it("should return mock data when API call is successful", async () => {
            const mockData = [{ id: 1, govType: "referendum" }];
            (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

            const params: AllOpenGovPostsInterface = { govType: "referendum" };

            const result = await polkassemblyService.AllOpenGovPosts(params);

            expect(axios.get).toHaveBeenCalled();
            expect(result).toEqual(mockData);
        });

        it("should return an empty array when API call fails", async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

            const params: AllOpenGovPostsInterface = { govType: "referendum" };

            const result = await polkassemblyService.AllOpenGovPosts(params);

            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe("OffChainPost - With Mocking Axios", () => {
        it("should return mock data when API call is successful", async () => {
            const mockData = { id: 1, title: "Mock Off-Chain Post" };
            (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

            const params: OffChainPostParamsInterface = {
                proposalType: "proposal",
                postId: 456
            };

            const result = await polkassemblyService.OffChainPost(params);

            expect(axios.get).toHaveBeenCalled();
            expect(result).toEqual(mockData);
        });

        it("should return an empty array when API call fails", async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

            const params: OffChainPostParamsInterface = {
                proposalType: "proposal",
                postId: 456
            };

            const result = await polkassemblyService.OffChainPost(params);

            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });
});
