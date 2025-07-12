import { Controller, Get } from '@nestjs/common'

@Controller('sync')
export class SyncController {
  @Get('hello')
  hello() {
    return 'Hello World'
  }
}
