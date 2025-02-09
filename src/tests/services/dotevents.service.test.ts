import { DotEventsService } from "../../services/dotevents.service";
import axios from "axios";
import https from "https";

jest.mock("axios");

describe("DotEventsService", () => {
    let dotEventsService: DotEventsService;

    beforeEach(() => {
        dotEventsService = new DotEventsService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("SubmissionsEvents - Without Mocking (Real API Call)", () => {
        it("should fetch events from the API", async () => {
            const response = await dotEventsService.SubmissionsEvents();
            
            expect(response).toBeDefined();
            expect(Array.isArray(response)).toBeTruthy();
            
            if (response.length > 0) {
                expect(response[0]).toHaveProperty("id");
            }
        }, 10000); // Increase timeout if needed
    });

    describe("SubmissionsEvents - With Mocking Axios", () => {
        it("should return mock data when API call is successful", async () => {
            const mockData = [
                { id: 1, name: "Event A" },
                { id: 2, name: "Event B" }
            ];

            (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

            const result = await dotEventsService.SubmissionsEvents();

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining("https://view.monday.com/board_data/"),
                expect.objectContaining({
                    maxBodyLength: Infinity,
                    httpsAgent: expect.any(https.Agent)
                })
            );

            expect(result).toEqual(mockData);
        });

        it("should return an empty array when API call fails", async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));

            const result = await dotEventsService.SubmissionsEvents();

            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });
});
