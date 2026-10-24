import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Package } from '../database/entities/package.entity';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { PackageCacheService } from './package-cache.service';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package]),
    AuthModule,
    InfrastructureModule,
  ],
  controllers: [PackagesController],
  providers: [PackagesService, PackageCacheService],
  exports: [PackagesService, PackageCacheService],
})
export class PackagesModule {}
