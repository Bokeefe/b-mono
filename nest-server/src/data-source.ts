import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity/user.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'bokeefe96',
  password: 'postgres',
  database: 'bverse',
  entities: [User],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
