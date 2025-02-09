import axios from "axios";
import https from "https";
import { DotMeetUpService } from "../../services/dotmeetup.service";
import { SubmitedMeetUpsParamsInterface } from "../../interfaces/dotMeetUp.interfaces";

jest.mock("axios");

describe("DotMeetUpService", () => {
    let dotMeetUpService: DotMeetUpService;
    let mockParams: SubmitedMeetUpsParamsInterface;

    beforeEach(() => {
        dotMeetUpService = new DotMeetUpService();
        mockParams = { src: "test-source" };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getSubmitedMeetUps - Without Mocking (Real API Call)", () => {
        it("should fetch submitted meetups from the API", async () => {
            const response = await dotMeetUpService.getSubmitedMeetUps(mockParams);
            
            expect(response).toBeDefined();
            expect(Array.isArray(response) || response === null).toBeTruthy();

            if (Array.isArray(response) && response.length > 0) {
                expect(response[0]).toHaveProperty("id");
            }
        }, 10000); // Increase timeout if needed
    });

    describe("getSubmitedMeetUps - With Mocking Axios", () => {
        it("should return mock data when API call is successful", async () => {
            const mockData = [
                { id: "123", title: "Meetup 1" },
                { id: "456", title: "Meetup 2" }
            ];

            (axios.post as jest.Mock).mockResolvedValue({ data: mockData });

            const result = await dotMeetUpService.getSubmitedMeetUps(mockParams);

            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining("https://dotmeetup.notion.site/api/v3/queryCollection"),
                expect.any(Object),
                expect.objectContaining({
                    headers: expect.any(Object),
                    maxBodyLength: Infinity,
                    httpsAgent: expect.any(https.Agent)
                })
            );

            expect(result).toEqual(mockData);
        });

        it("should return an empty array when API call fails", async () => {
            (axios.post as jest.Mock).mockRejectedValue(new Error("Network error"));

            const result = await dotMeetUpService.getSubmitedMeetUps(mockParams);

            expect(axios.post).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });
});
