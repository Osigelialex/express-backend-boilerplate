import { MAINTENANCE_JOB } from "@/config/constants/maintenance";
import { MaintenanceService } from "@/services/maintenance.service";
import { processMaintenanceJob } from "@/workers/maintenance.worker";

jest.mock("@/config/database", () => ({
  __esModule: true,
  default: { user: { deleteMany: jest.fn() } },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const prisma = require("@/config/database").default as {
  user: { deleteMany: jest.Mock };
};

describe("MaintenanceService.purgeUnverifiedUsers", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deletes unverified users older than the TTL and reports the count", async () => {
    prisma.user.deleteMany.mockResolvedValue({ count: 4 });
    const now = new Date("2026-02-10T00:00:00Z");

    const deleted = await new MaintenanceService().purgeUnverifiedUsers(now);

    expect(deleted).toBe(4);
    const { where } = prisma.user.deleteMany.mock.calls[0][0];
    expect(where.emailVerified).toBeNull();
    expect(where.createdAt.lt).toEqual(new Date("2026-02-03T00:00:00Z")); // 7 days
  });
});

describe("processMaintenanceJob", () => {
  it("dispatches known jobs and rejects unknown ones", async () => {
    const service = {
      purgeUnverifiedUsers: jest.fn().mockResolvedValue(2),
    } as unknown as MaintenanceService;

    await processMaintenanceJob(MAINTENANCE_JOB.purgeUnverifiedUsers, service);
    expect(service.purgeUnverifiedUsers).toHaveBeenCalledTimes(1);

    await expect(processMaintenanceJob("mystery", service)).rejects.toThrow(
      /Unknown maintenance job/,
    );
  });
});
