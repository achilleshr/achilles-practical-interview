import { Body, Controller, Param, Patch } from '@nestjs/common'

import { UpdateRemoteApplicationDto } from './dto/update-remote-application.dto'
import { UpdateRemoteCandidateDto } from './dto/update-remote-candidate.dto'
import { RemoteAtsService } from './remote-ats.service'

@Controller('remote-ats')
export class RemoteAtsController {
  constructor(private readonly remoteAtsService: RemoteAtsService) {}

  @Patch('candidates/:id')
  async updateCandidate(
    @Param('id') id: string,
    @Body() body: UpdateRemoteCandidateDto,
  ) {
    return this.remoteAtsService.updateCandidate(id, body)
  }

  @Patch('applications/:id')
  async updateApplication(
    @Param('id') id: string,
    @Body() body: UpdateRemoteApplicationDto,
  ) {
    return this.remoteAtsService.updateApplication(id, body)
  }
}
