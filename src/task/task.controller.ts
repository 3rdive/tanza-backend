import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { StandardResponse } from '../commons/standard-response';
import { Tasks } from './task.entity';
import { BaseUrl } from '../constants';

@Controller(BaseUrl.TASK)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<StandardResponse<Tasks>> {
    return this.taskService.create(createTaskDto);
  }

  @Get()
  findAll(@Query() filterDto: FilterTaskDto): Promise<StandardResponse<Tasks>> {
    return this.taskService.findAll(filterDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponse<Tasks>> {
    return this.taskService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<StandardResponse<Tasks>> {
    return this.taskService.update(id, updateTaskDto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponse<null>> {
    return this.taskService.remove(id);
  }

  @Get('user/:userId')
  findByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<StandardResponse<Tasks[]>> {
    return this.taskService.findByUserId(userId);
  }

  @Patch(':id/complete')
  markAsCompleted(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponse<Tasks>> {
    return this.taskService.markAsCompleted(id);
  }
  @Patch(':id/cancel')
  cancelTask(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponse<Tasks>> {
    return this.taskService.cancelTask(id);
  }
}
