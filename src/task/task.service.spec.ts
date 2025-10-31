import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskService } from './task.service';
import { Tasks } from './task.entity';
import { TaskCategory } from './task-category.enum';
import { TaskStatus } from './task-status.enum';

describe('TaskService', () => {
  let service: TaskService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Tasks),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a task successfully', async () => {
      const createTaskDto = {
        category: TaskCategory.REQUEST_REVIEW,
        userId: 'user-id',
      };

      const mockTask = {
        id: 'task-id',
        ...createTaskDto,
        status: TaskStatus.PENDING,
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockTask);
      mockRepository.save.mockResolvedValue(mockTask);

      const result = await service.create(createTaskDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTask);
      expect(mockRepository.create).toHaveBeenCalledWith(createTaskDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockTask);
    });
  });

  describe('findOne', () => {
    it('should return a task when found', async () => {
      const taskId = 'task-id';
      const mockTask = {
        id: taskId,
        category: TaskCategory.REQUEST_REVIEW,
        userId: 'user-id',
        status: TaskStatus.PENDING,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.findOne(taskId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTask);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: taskId },
      });
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskId = 'non-existent-id';
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(taskId)).rejects.toThrow(
        'Task with ID non-existent-id not found',
      );
    });
  });

  describe('markAsCompleted', () => {
    it('should mark task as completed', async () => {
      const taskId = 'task-id';
      const mockTask = {
        id: taskId,
        category: TaskCategory.REQUEST_REVIEW,
        userId: 'user-id',
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        completedAt: null,
      };

      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completedAt: expect.any(Date),
      };

      mockRepository.findOne.mockResolvedValue(mockTask);
      mockRepository.save.mockResolvedValue(completedTask);

      const result = await service.markAsCompleted(taskId);

      expect(result.success).toBe(true);
      expect((result.data as Tasks).status).toBe(TaskStatus.COMPLETED);
      expect((result.data as Tasks).completedAt).toBeDefined();
    });
  });
});
