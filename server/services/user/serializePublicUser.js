import { serializeMembership } from "../subscription/serializeMembership.js";

export const serializePublicUser = (user, options = {}) => {
  const { subscription = null, extra = {} } = options;

  return {
    ...user,
    membership: serializeMembership(subscription),
    ...extra,
  };
};
