import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../database/entities/user.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.reservations.create(dto, actor);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  list(
    @Query() query: ListReservationsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.reservations.list(query, actor);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.reservations.findOne(id, actor);
  }

  @Patch(':id/estado')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.reservations.updateStatus(id, dto, actor);
  }
}
