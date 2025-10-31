import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CreateTaskEvent } from './create-task.event';
import { TaskService } from './task.service';
import { Injectable } from '@nestjs/common';

@Injectable()
@EventsHandler(CreateTaskEvent)
export class CreateTaskEventHandler implements IEventHandler<CreateTaskEvent> {
  constructor(private readonly taskService: TaskService) {}
  async handle(event: CreateTaskEvent) {
    const task = await this.taskService.create(event);
    console.log('new task created: ', task.data);
  }
}
