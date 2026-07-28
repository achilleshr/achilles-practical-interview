import { ApiPropertyOptional } from '@nestjs/swagger'
import { RemoteApplicationStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'

export class UpdateRemoteApplicationDto {
  @ApiPropertyOptional({ enum: RemoteApplicationStatus })
  @IsOptional()
  @IsEnum(RemoteApplicationStatus)
  status?: RemoteApplicationStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remoteJobId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remoteCandidateId?: string
}
