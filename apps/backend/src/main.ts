import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // The desktop renderer (3616) and public site (3600) call this API
  // cross-origin; allow local dev origins plus any configured web origin.
  app.enableCors({
    origin: true, // reflect request origin (dev-friendly; tighten in prod)
    credentials: true,
  });
  const port = process.env.BACKEND_PORT ?? 3601;
  await app.listen(port);
}

void bootstrap();
