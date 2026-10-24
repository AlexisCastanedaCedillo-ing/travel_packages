import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Package } from '../database/entities/package.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { PackagesModule } from '../packages/packages.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package, Reservation]),
    AuthModule,
    InfrastructureModule,
    PackagesModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
