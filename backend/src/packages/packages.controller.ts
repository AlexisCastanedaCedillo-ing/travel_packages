import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreatePackageDto } from './dto/create-package.dto';
import { ListPackagesDto } from './dto/list-packages.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PackagesService } from './packages.service';

// Although the routes are usually defined in English, they are kept in Spanish to adhere to the technical specifications.
@Controller('paquetes')
@ApiTags('packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  list(@Query() query: ListPackagesDto) {
    return this.packages.list(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.CUSTOMER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.packages.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreatePackageDto) {
    return this.packages.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.packages.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.packages.remove(id);
  }
}
