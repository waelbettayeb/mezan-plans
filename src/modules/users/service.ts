import { eq } from "drizzle-orm";
import db, { schema } from "../../db/client";

export async function findUserById(id: number) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, id),
  });
  return user;
}
