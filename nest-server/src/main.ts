import { NestFactory } from '@nestjs/core';
import { ApolloServer } from 'apollo-server-express';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { resolvers } from './graphpql/resolvers';
import { typeDefs } from './graphpql/schema';
const db = require('../models');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Initialize Apollo Server
  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();
  
  // Apply Apollo middleware to Express app
  apolloServer.applyMiddleware({ app: app.getHttpAdapter().getInstance() });

  // Serve static files but exclude /api and /graphql routes
  app.use(
    /^(?!\/api|\/graphql)/,
    express.static(join(__dirname, '..', '..', 'react-fe', 'dist')),
  );

  // Handle React Router routes but exclude /api and /graphql routes
  app.use(/^(?!\/api|\/graphql).*/, (req, res) => {
    res.sendFile(join(__dirname, '..', '..', 'react-fe', 'dist', 'index.html'));
  });

  // Add Sequelize sync
  await db.sequelize.sync();
  
  await app.listen(4171, '0.0.0.0');
}

bootstrap();
