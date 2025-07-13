import { Controller, Post } from '@nestjs/common'

import { SeedService } from './seed.service'

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('')
  async seed() {
    await this.seedService.seed()
  }

  @Post('save-database')
  async saveDatabase() {
    await this.seedService.saveDatabase()
  }
}
