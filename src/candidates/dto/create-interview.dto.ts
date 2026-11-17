import { ApiProperty } from '@nestjs/swagger'
import { IsISO8601, IsString } from 'class-validator'

export class CreateInterviewDto {
  @ApiProperty()
  @IsString()
  applicationId!: string

  @ApiProperty({ example: '2026-12-01T15:00:00Z' })
  @IsISO8601()
  startsAt!: string
}
