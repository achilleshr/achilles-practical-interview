import { Body, Controller, HttpCode, Post } from '@nestjs/common'

import { CandidatesService } from './candidates.service'
import { CandidateEventDto } from './dto/candidate-event.dto'
import { CreateInterviewDto } from './dto/create-interview.dto'

@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post('create-interview')
  async createInterview(@Body() body: CreateInterviewDto) {
    return this.candidatesService.createInterview(body)
  }

  @Post('handle-event')
  @HttpCode(204)
  async handleEvent(@Body() body: CandidateEventDto) {
    await this.candidatesService.handleEvent(body)
  }
}
