import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tasks } from './task.entity';
import { CreateTaskEventHandler } from './create-task-event.handler';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tasks]), UsersModule],
  providers: [TaskService, CreateTaskEventHandler],
  controllers: [TaskController],
})
export class TaskModule {}
