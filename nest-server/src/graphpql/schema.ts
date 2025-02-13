import { gql } from "apollo-server";

export interface Project {
  id?: number;
  title?: string;
  active: boolean;
  members?: User[];
}

export interface User {
  id?: number;
  name?: string;
  email?: string;
  password?: string;
  projects?: Project[];
}

export const typeDefs = gql`
    type Project {
        id: Int
        title: String
        active: Boolean!
        members: [User]
    }

    type User {
        id: Int
        name: String
        email: String
        password: String
        projects: [Project]
    }

    type Query {
        users: [User]
    }
`;

