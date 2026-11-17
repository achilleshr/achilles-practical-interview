import { Injectable } from '@nestjs/common'

import {
  CandidateEventDto,
  CandidateEventType,
} from './dto/candidate-event.dto'

@Injectable()
export class CandidatesService {
  async handleEvent(event: CandidateEventDto) {
    switch (event.type) {
      case CandidateEventType.OPTED_OUT:
        return this.handleOptedOut(event.candidateId)
      case CandidateEventType.OPTED_IN:
        return this.handleOptedIn(event.candidateId)
    }
  }

  private async handleOptedOut(_candidateId: string) {}

  private async handleOptedIn(_candidateId: string) {}
}
