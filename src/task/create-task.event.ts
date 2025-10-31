import { TaskCategory } from './task-category.enum';

export class CreateTaskEvent {
  constructor(
    public readonly category: TaskCategory,
    public readonly userId: string,
    public readonly reference: string,
  ) {}
}
