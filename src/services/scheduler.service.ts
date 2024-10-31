import { injectable, inject } from "inversify";
import cron from "node-cron";

import { PolkassemblyController } from "../controllers/polkassembly.controller";

@injectable()
export class SchedulerService {
  constructor(
    @inject("PolkassemblyController")
    private taskService: PolkassemblyController
  ) {}

  async updateOnChainPosts() {
    cron.schedule("*/5 * * * *", async () => {
      console.log("Running scheduled task...");

      const proposalTypeList = [
        "democracy_proposals",
        "tech_committee_proposals",
        "treasury_proposals",
        "referendums",
        "fellowship_referendums",
        "council_motions",
        "bounties",
        "tips",
        "child_bounties",
        "referendums_v2",
      ];

      const trackStatusList = [
        "All",
        "Confirmed",
        "ConfirmStarted",
        "Cancelled",
        "Deciding",
        "DecisionDepositPlaced",
        "Killed",
        "Submitted",
        "Rejected",
        "TimedOut",
      ];

      try {
        // proposalTypeList.map(async (proposalType) => {
        //   trackStatusList.map(async (trackStatus) => {
        //     await this.taskService._findOnChainPosts(
        //       proposalType,
        //       trackStatus,
        //       "newest"
        //     );
        //   });
        // });

        console.log("Scheduled task completed successfully.");
      } catch (err) {
        console.log("Error executing scheduled task:", err);
        throw Error("Error executing scheduled task");
      }
    });
  }
}
