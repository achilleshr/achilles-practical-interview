import { Body, Controller, HttpCode, Post } from '@nestjs/common'

import { CandidatesService } from './candidates.service'
import { CandidateEventDto } from './dto/candidate-event.dto'

@Controller()
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post('events')
  @HttpCode(204)
  async handleEvent(@Body() body: CandidateEventDto) {
    await this.candidatesService.handleEvent(body)
  }
}
