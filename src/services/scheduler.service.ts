import { injectable, inject } from "inversify";
import cron from "node-cron";

import { PolkassemblyController } from "../controllers/polkassembly.controller";
import {proposalTypeList} from "../constants/proposalTypes";

@injectable()
export class SchedulerService {
  constructor(
    @inject("PolkassemblyController")
    private taskService: PolkassemblyController
  ) {}

  async updateOnChainPosts() {
    cron.schedule("*/30 * * * *", async () => {
      console.log("Running scheduled task...");

      try {
        // proposalTypeList.map(async (proposalType) => {
        //     await this.taskService._findOnChainPosts(
        //       proposalType,
        //       "All",
        //       "newest"
        //     );
        //     console.log(`Updated ${proposalType}-List`);
            
        // });

        console.log("Scheduled task completed successfully.");
      } catch (err) {
        console.log("Error executing scheduled task:", err);
        throw Error("Error executing scheduled task");
      }
    });
  }
}
