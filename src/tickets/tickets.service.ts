import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tickets } from './tickets.entity';
import {
  CreateTicketDto,
  TicketStatus,
  UpdateTicketStatusDto,
} from './ticket.dto';

/**
 * TicketsService
 *
 * Lightweight service to manage `Tickets`.
 *
 * Methods:
 * - create: create a new ticket
 * - findById: fetch a single ticket by id
 * - findAllForUser: fetch all tickets for a given user
 * - findAll: fetch all tickets (admin use)
 * - updateStatus: change status of a ticket
 * - remove: delete a ticket
 */
@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Tickets)
    private readonly ticketsRepository: Repository<Tickets>,
  ) {}

  async create(userId: string, dto: CreateTicketDto): Promise<Tickets> {
    const ticket = this.ticketsRepository.create({
      userId,
      title: dto.title,
      description: dto.description,
      status: TicketStatus.OPEN,
    });
    return this.ticketsRepository.save(ticket);
  }

  async findById(id: string): Promise<Tickets> {
    const ticket = await this.ticketsRepository.findOneBy({ id });
    if (!ticket) {
      throw new NotFoundException(`Ticket with id ${id} not found`);
    }
    return ticket;
  }

  async findAllForUser(userId: string): Promise<Tickets[]> {
    return this.ticketsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Tickets[]> {
    return this.ticketsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto): Promise<Tickets> {
    const ticket = await this.findById(id);
    ticket.status = dto.status;
    return this.ticketsRepository.save(ticket);
  }

  async remove(id: string): Promise<void> {
    const res = await this.ticketsRepository.delete({ id });
    if (res.affected === 0) {
      throw new NotFoundException(`Ticket with id ${id} not found`);
    }
  }
}
