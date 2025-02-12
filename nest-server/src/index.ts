import { ApolloServer } from 'apollo-server';
import { resolvers } from './graphpql/resolvers';
import { typeDefs } from './graphpql/schema';


const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});

