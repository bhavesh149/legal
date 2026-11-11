import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Profile } from '@prisma/client';

export interface RiskProfileDto {
  role?: string;
  risk_tolerance?: 'conservative' | 'balanced' | 'aggressive';
  priorities?: string[];
}

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(supabaseUserId: string, email: string): Promise<Profile> {
    return this.prisma.profile.upsert({
      where: { id: supabaseUserId },
      create: { id: supabaseUserId, email },
      update: {},
    });
  }

  async findOne(id: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({ where: { id } });
  }

  async updateRiskProfile(userId: string, dto: RiskProfileDto): Promise<Profile> {
    return this.prisma.profile.update({
      where: { id: userId },
      data: { riskProfile: dto as object },
    });
  }
}
