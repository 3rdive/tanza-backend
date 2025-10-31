import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tasks } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { StandardResponse } from '../commons/standard-response';
import { TaskStatus } from './task-status.enum';
import { UsersService } from '../users/services/users.service';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Tasks)
    private taskRepository: Repository<Tasks>,
    private readonly userService: UsersService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<StandardResponse<Tasks>> {
    try {
      const user = await this.userService.getProfile(createTaskDto.reference);
      const task = this.taskRepository.create({
        ...createTaskDto,
        reference: JSON.stringify({
          userId: user.id,
          profilePic: user.profilePic,
          firstName: user.firstName,
          lastName: user.lastName,
        }),
      });
      const savedTask = await this.taskRepository.save(task);
      return StandardResponse.ok(savedTask, 'Task created successfully');
    } catch (e) {
      console.log('error creating task: ', e);
      return StandardResponse.fail('Failed to create task');
    }
  }

  async findAll(filterDto: FilterTaskDto): Promise<StandardResponse<Tasks>> {
    try {
      const { page = 1, limit = 10, category, status, userId } = filterDto;
      const skip = (page - 1) * limit;

      const query = this.taskRepository.createQueryBuilder('task');

      if (category) {
        query.andWhere('task.category = :category', { category });
      }

      if (status) {
        query.andWhere('task.status = :status', { status });
      }

      if (userId) {
        query.andWhere('task.userId = :userId', { userId });
      }

      query.orderBy('task.createdAt', 'DESC').skip(skip).take(limit);

      const [tasks, total] = await query.getManyAndCount();

      const pagination = {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      return StandardResponse.withPagination(
        tasks,
        'Tasks retrieved successfully',
        pagination,
      );
    } catch {
      return StandardResponse.fail('Failed to retrieve tasks');
    }
  }

  async findOne(id: string): Promise<StandardResponse<Tasks>> {
    try {
      const task = await this.taskRepository.findOne({ where: { id } });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      return StandardResponse.ok(task, 'Task retrieved successfully');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      return StandardResponse.fail('Failed to retrieve task');
    }
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<StandardResponse<Tasks>> {
    try {
      const task = await this.taskRepository.findOne({ where: { id } });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      Object.assign(task, updateTaskDto);
      const updatedTask = await this.taskRepository.save(task);

      return StandardResponse.ok(updatedTask, 'Task updated successfully');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      return StandardResponse.fail('Failed to update task');
    }
  }

  async remove(id: string): Promise<StandardResponse<null>> {
    try {
      const task = await this.taskRepository.findOne({ where: { id } });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      await this.taskRepository.remove(task);

      return StandardResponse.ok(null, 'Task deleted successfully');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      return StandardResponse.fail('Failed to delete task');
    }
  }

  async findByUserId(userId: string): Promise<StandardResponse<Tasks[]>> {
    try {
      const tasks = await this.taskRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      return StandardResponse.ok(tasks, 'User tasks retrieved successfully');
    } catch {
      return StandardResponse.fail('Failed to retrieve user tasks');
    }
  }

  async markAsCompleted(id: string): Promise<StandardResponse<Tasks>> {
    try {
      const task = await this.taskRepository.findOne({ where: { id } });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      const updatedTask = await this.taskRepository.save(task);

      return StandardResponse.ok(updatedTask, 'Task marked as completed');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      return StandardResponse.fail('Failed to mark task as completed');
    }
  }

  async cancelTask(id: string): Promise<StandardResponse<Tasks>> {
    try {
      const task = await this.taskRepository.findOne({ where: { id } });

      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      task.status = TaskStatus.CANCELLED;
      task.completedAt = new Date();
      const updatedTask = await this.taskRepository.save(task);

      return StandardResponse.ok(updatedTask, 'Task marked as cancelled');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      return StandardResponse.fail('Failed to mark task as cancelled');
    }
  }
}
