import { ApolloServer } from 'apollo-server';
import { resolvers } from './graphpql/resolvers';
import { typeDefs } from './graphpql/schema';
const db = require('../models');
console.log('Imported DB:', db);
console.log('Sequelize from DB:', db.sequelize);
const server = new ApolloServer({ typeDefs, resolvers });

db.sequelize.sync().then(() => {
  server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
});