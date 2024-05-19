import { initTRPC, TRPCError } from "@trpc/server";
import type { createContext } from "./context";
import { clearTokens, verifyAccessToken } from "../modules/auth/model";
import { findUserById } from "../modules/users/service";
const t = initTRPC.context<typeof createContext>().create();

export const middleware = t.middleware;
export const router = t.router;
export const publicProcedure = t.procedure;
export const trpcError = TRPCError;
export const createCallerFactory = t.createCallerFactory;

export interface UserContext {
  user?: {
    userId: number;
  };
}

// user procedure
const isUser = middleware(({ ctx: { req, res }, next }) => {
  try {
    const { userId } = verifyAccessToken({ req });
    return next({
      ctx: {
        user: { userId },
      },
    });
  } catch (error) {
    if (!!res) clearTokens({ res });
    throw new trpcError({
      code: "UNAUTHORIZED",
    });
  }
});

const isAdmin = middleware(async ({ ctx, next }) => {
  const { user } = ctx as UserContext;
  if (!user)
    throw new trpcError({
      code: "UNAUTHORIZED",
    });

  const fetchedUser = await findUserById(user.userId);

  if (!fetchedUser) {
    throw new trpcError({
      code: "INTERNAL_SERVER_ERROR",
    });
  }

  if (!fetchedUser.isAdmin) {
    throw new trpcError({
      code: "UNAUTHORIZED",
    });
  }

  return next();
});

export const protectedProcedure = publicProcedure.use(isUser);
export const adminProcedure = protectedProcedure.use(isAdmin);
