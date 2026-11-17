import { Module } from '@nestjs/common'

import { CandidatesController } from './candidates.controller'
import { CandidatesService } from './candidates.service'

@Module({
  providers: [CandidatesService],
  controllers: [CandidatesController],
})
export class CandidatesModule {}
