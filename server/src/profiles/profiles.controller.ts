import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RiskProfileDto } from './profiles.service';
import { ProfilesService } from './profiles.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.profilesService.findOne(user.id);
  }

  @Put('risk-profile')
  async updateRiskProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: RiskProfileDto,
  ) {
    return this.profilesService.updateRiskProfile(user.id, dto);
  }
}
