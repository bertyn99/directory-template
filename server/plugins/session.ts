import { getUserById } from "../db/queries/users";
import { getActiveSubscription } from "../db/queries/subscription";

// server/plugins/session.ts
export default defineNitroPlugin(() => {
  sessionHooks.hook("fetch", async (session, _event) => {
    if (session.user?.id) {
      const [user, subscriptionActive] = await Promise.all([
        getUserById(session.user.id),
        getActiveSubscription(session.user.id),
      ]);

      if (user) {
        session.user = {
          ...session.user,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          email: user.email,
          role: user.role,
        };
      }

      const hasPaid = !!subscriptionActive && subscriptionActive.plan !== "free";
      if (session.user?.hasPaidSubscription !== hasPaid) {
        session.user!.hasPaidSubscription = hasPaid;
      }
    }
  });

  // Called when we call useUserSession().clear() or clearUserSession(event)
  sessionHooks.hook("clear", async (_session, _event) => {
    // Log that user logged out
  });
});
