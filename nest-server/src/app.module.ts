import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FakerModule } from './faker/faker.module';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { User } from './users/entities/user.entity/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'bokeefe96',
      password: 'postgres',
      database: 'bverse',
      entities: [User],
      synchronize: false,
      autoLoadEntities: true,
      migrationsRun: true,
      migrations: [join(__dirname, 'migrations', '*.ts')],
    }),
    FakerModule,
    UsersModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, HealthService],
})
export class AppModule {}
