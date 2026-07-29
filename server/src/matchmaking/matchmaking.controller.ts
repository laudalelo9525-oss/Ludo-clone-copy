import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { type CreateTicketRequest, type Ticket } from './matchmaking.types';

/** REST surface from `docs/api-contracts.md`. */
@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmaking: MatchmakingService) {}

  @Post('ticket')
  async createTicket(@Body() body: CreateTicketRequest): Promise<Ticket> {
    try {
      return await this.matchmaking.createTicket(body);
    } catch (error) {
      if (error instanceof RangeError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Get('status/:ticketId')
  getStatus(@Param('ticketId') ticketId: string): Ticket {
    const ticket = this.matchmaking.getTicket(ticketId);

    if (!ticket) {
      throw new NotFoundException('Unknown or expired ticket.');
    }

    return ticket;
  }
}
