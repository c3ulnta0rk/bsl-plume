import { and, eq } from "drizzle-orm";
import type { Database } from "../index";
import { notifications } from "../schema/notifications";

export function listNotificationsByUser(
  db: Database,
  userId: string,
) {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
  });
}

export function listUnreadNotifications(
  db: Database,
  userId: string,
) {
  return db.query.notifications.findMany({
    where: and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false),
    ),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
  });
}

export function createNotification(
  db: Database,
  data: typeof notifications.$inferInsert,
) {
  return db.insert(notifications).values(data).returning();
}

export function markNotificationRead(db: Database, id: string) {
  return db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id))
    .returning();
}

export function markAllNotificationsRead(
  db: Database,
  userId: string,
) {
  return db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
      ),
    )
    .returning();
}
