import { gql } from "apollo-server";

export const typeDefs = gql`
    type Project {
    title: String
    active: Boolean!
    members: [User]
    }

    type User {
    name: String
    email: String
    projects: [Project]
    }

    type Query {
    users: [User]
    }
`;

