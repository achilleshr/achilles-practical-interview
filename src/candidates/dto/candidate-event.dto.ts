import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsString } from 'class-validator'

export enum CandidateEventType {
  OPTED_OUT = 'candidate.opted_out',
  OPTED_IN = 'candidate.opted_in',
}

export class CandidateEventDto {
  @ApiProperty({ enum: CandidateEventType })
  @IsEnum(CandidateEventType)
  type!: CandidateEventType

  @ApiProperty()
  @IsString()
  candidateId!: string
}
