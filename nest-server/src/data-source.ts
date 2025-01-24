import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity/user.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
});
