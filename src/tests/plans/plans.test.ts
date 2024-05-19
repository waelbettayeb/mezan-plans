import { beforeAll, describe, expect, it } from "vitest";
import { setupAdminUser } from "../helpers/utils";
import type { createAuthenticatedCaller } from "../helpers/utils";
import resetDb from "../helpers/resetDb";
import db from "../../db/client";
import {
  orders,
  subscriptionActivations,
  subscriptions,
} from "../../db/schema";

const admin = {
  id: 1,
  email: "admin@mail.com",
  password: "P@ssw0rd",
  name: "test",
  timezone: "Asia/Riyadh",
  locale: "en",
};

describe("Plans Router", () => {
  let caller: ReturnType<typeof createAuthenticatedCaller>;
  let teamId: number = 0;

  beforeAll(async () => {
    await resetDb();
    const { teamId: adminTeamId, caller: authCaller } =
      await setupAdminUser(admin);
    teamId = adminTeamId;
    caller = authCaller;
  });

  it("should create a plan", async () => {
    const newPlan = {
      name: "Test Plan",
      price: 100,
      defaultUsers: 10,
      pricePerUser: 10,
    };
    const plan = await caller.plans.create(newPlan);
    expect(plan).toHaveProperty("lastInsertRowid");
  });

  it("should read a plan", async () => {
    const plan = await caller.plans.read({ planId: 1 });
    expect(plan).toHaveProperty("name");
  });

  it("should update a plan", async () => {
    const updatedPlan = {
      planId: 1,
      name: "Updated Plan",
    };
    await caller.plans.update(updatedPlan);
    const plan = await caller.plans.read({ planId: updatedPlan.planId });

    expect(plan.name).toEqual("Updated Plan");
  });

  it("should calculate upgrade price", async () => {
    const subscriptionDate = new Date("2024-05-01");
    const expireDate = new Date("2024-06-01");
    await db.insert(subscriptions).values({
      id: 1,
      planId: 1,
      userId: 1,
      teamId,
      createdAt: subscriptionDate,
      updatedAt: subscriptionDate,
      isActive: true,
    });

    await db.insert(orders).values({
      id: 1,
      amount: 100,
      subscriptionId: 1,
      createdAt: subscriptionDate,
    });

    await db.insert(subscriptionActivations).values({
      id: 1,
      orderId: 1,
      createdAt: subscriptionDate,
      expiresAt: expireDate,
    });

    const newPlan = {
      name: "new Plan",
      price: 1000,
      defaultUsers: 20,
      pricePerUser: 10,
    };
    await caller.plans.create(newPlan);
    const upgradePrice = await caller.plans.calculateUpgradePrice({
      currentSubscriptionId: 1,
      newPlanId: 2,
    });
    expect(upgradePrice).toBe(390);
  });

  it("should create a subscription for a user", async () => {
    throw new Error("Not implemented");
  });

  it("should create an order", () => {
    throw new Error("Not implemented");
  });

  it("should activate a subscription", () => {
    throw new Error("Not implemented");
  });

  it("should upgrade a subscription", () => {
    throw new Error("Not implemented");
  });

  it("should desactivate an upgraded subscription", () => {
    throw new Error("Not implemented");
  });
});
