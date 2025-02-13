import { getUsers } from "../utils";
export const resolvers = {
    Query: {
      users: () => getUsers(),
    },
  };
  