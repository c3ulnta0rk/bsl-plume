import { describe, it, expect } from "vitest";
import { withRollback } from "../test-utils";
import {
  createNotification,
  listNotificationsByUser,
  listUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notifications";

describe("notifications queries", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440060";

  const notifData = {
    userId,
    type: "match_scheduled",
    title: "Match scheduled",
    body: "Your match is scheduled for 3pm",
    isRead: false,
  };

  it("should create and list notifications by user", async () => {
    await withRollback(async (tx) => {
      await createNotification(tx, notifData);
      await createNotification(tx, {
        ...notifData,
        title: "Second notification",
      });

      const list = await listNotificationsByUser(tx, userId);
      expect(list.length).toBe(2);
    });
  });

  it("should list only unread notifications", async () => {
    await withRollback(async (tx) => {
      await createNotification(tx, notifData);
      await createNotification(tx, { ...notifData, isRead: true });

      const unread = await listUnreadNotifications(tx, userId);
      expect(unread.length).toBe(1);
      expect(unread[0]!.isRead).toBe(false);
    });
  });

  it("should mark a single notification as read", async () => {
    await withRollback(async (tx) => {
      const [notif] = await createNotification(tx, notifData);
      expect(notif!.isRead).toBe(false);

      const [updated] = await markNotificationRead(tx, notif!.id);
      expect(updated!.isRead).toBe(true);
    });
  });

  it("should mark all user notifications as read", async () => {
    await withRollback(async (tx) => {
      await createNotification(tx, notifData);
      await createNotification(tx, {
        ...notifData,
        title: "Another one",
      });

      const updated = await markAllNotificationsRead(tx, userId);
      expect(updated.length).toBe(2);
      expect(updated.every((n) => n.isRead)).toBe(true);
    });
  });

  it("should return empty array for user with no notifications", async () => {
    await withRollback(async (tx) => {
      const list = await listNotificationsByUser(
        tx,
        "00000000-0000-0000-0000-000000000000",
      );
      expect(list).toHaveLength(0);
    });
  });

  it("should order notifications by createdAt DESC", async () => {
    await withRollback(async (tx) => {
      await createNotification(tx, notifData);
      await createNotification(tx, {
        ...notifData,
        title: "Later notification",
      });

      const list = await listNotificationsByUser(tx, userId);
      expect(list.length).toBe(2);
      // Newest first
      expect(list[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
        list[1]!.createdAt.getTime(),
      );
    });
  });
});
