import { users } from '../mock-db/mock-db';

export const resolvers = {
    Query: {
      users: () => users,
    },
  };
  