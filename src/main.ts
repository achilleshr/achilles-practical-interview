import { ArgumentMetadata, PipeTransform, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { isZodDto } from 'nestjs-zod/dto'

import { AppModule } from './app.module'

class GlobalCustomValidationPipe implements PipeTransform {
  private readonly defaultValidationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    forbidUnknownValues: true,
  })
  private readonly zodValidationPipe = new ZodValidationPipe()

  async transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.metatype && isZodDto(metadata.metatype)) {
      return await this.zodValidationPipe.transform(value, metadata)
    }
    return await this.defaultValidationPipe.transform(value, metadata)
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  })
  app.useGlobalPipes(new GlobalCustomValidationPipe())

  // Set global prefix
  app.setGlobalPrefix('v1')

  // CORS configuration
  app.enableCors({
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Your API Title')
    .setDescription('Your API Description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build()
  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
      extraModels: [], // Add any extra models here if needed
    })
  SwaggerModule.setup('api', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })

  await app.listen(8080)
}
bootstrap().catch((err) => {
  console.error(err)
})
