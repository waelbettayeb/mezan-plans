import {
  router,
  trpcError,
  protectedProcedure,
  adminProcedure,
} from "../../trpc/core";
import { z } from "zod";
import { schema, db } from "../../db/client";
import { and, desc, eq } from "drizzle-orm";

export const plans = router({
  read: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const { planId } = input;
      const plan = await db.query.plans.findFirst({
        where: eq(schema.plans.id, planId),
      });

      if (!plan) {
        throw new trpcError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }
      return plan;
    }),
  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        price: z.number(),
        defaultUsers: z.number(),
        pricePerUser: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const { name, price, defaultUsers, pricePerUser } = input;
      const newPlan = await db
        .insert(schema.plans)
        .values({
          createdAt: new Date(),
          updatedAt: new Date(),
          name,
          price,
          defaultUsers,
          pricePerUser,
        })
        .execute();

      return newPlan;
    }),
  update: adminProcedure
    .input(
      z.object({
        planId: z.number(),
        name: z.string().optional(),
        price: z.number().optional(),
        defaultUsers: z.number().optional(),
        pricePerUser: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { planId, ...updates } = input;
      const updatedPlan = await db
        .update(schema.plans)
        .set(updates)
        .where(eq(schema.plans.id, planId))
        .execute();

      return updatedPlan;
    }),
  calculateUpgradePrice: protectedProcedure
    .input(
      z.object({
        currentSubscriptionId: z.number(),
        newPlanId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const { currentSubscriptionId, newPlanId } = input;

      const newPlan = await db.query.plans.findFirst({
        where: eq(schema.plans.id, newPlanId),
      });

      if (!newPlan) {
        throw new trpcError({
          code: "NOT_FOUND",
          message: "Plan not found",
        });
      }

      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(schema.subscriptions.id, currentSubscriptionId),
          eq(schema.subscriptions.isActive, true)
        ),
        with: {
          plan: true,
          orders: {
            orderBy: desc(schema.orders.createdAt),
            limit: 1,
            with: {
              subscriptionActivations: true,
            },
          },
        },
      });

      if (!subscription) {
        throw new trpcError({
          code: "NOT_FOUND",
          message: "No active subscription found",
        });
      }

      const priceDifference = newPlan.price - subscription.plan.price;
      if (priceDifference <= 0) {
        throw new trpcError({
          code: "BAD_REQUEST",
          message: "You can only upgrade to a more expensive plan",
        });
      }

      const activation = subscription.orders?.[0]?.subscriptionActivations;
      if (!activation) {
        throw new trpcError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No subscription activations found",
        });
      }

      const remainingDays = Math.ceil(
        (new Date(activation.expiresAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      );

      if (remainingDays <= 0) {
        throw new trpcError({
          code: "BAD_REQUEST",
          message: "Subscription has expired",
        });
      }

      const proratedPrice = (priceDifference * remainingDays) / 30;

      return proratedPrice;
    }),
});
