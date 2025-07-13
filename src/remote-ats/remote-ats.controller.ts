import { Controller } from '@nestjs/common'

import { RemoteAtsService } from './remote-ats.service'

@Controller('remote-ats')
export class RemoteAtsController {
  constructor(private readonly remoteAtsService: RemoteAtsService) {}
}
