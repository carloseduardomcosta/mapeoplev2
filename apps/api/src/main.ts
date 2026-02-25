import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Necessário para ler cookies (refresh_token, access_token)
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // CORS para REST e WebSocket
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, 'https://app-mapeople.duckdns.org'],
    credentials: true,
  });

  // Habilita o adapter Socket.io explicitamente
  // Necessário para que o Nginx possa fazer proxy do WebSocket corretamente
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(3001, '0.0.0.0');
  console.log(`[Bootstrap] API running on port 3001`);
  console.log(`[Bootstrap] CORS allowed origin: ${frontendUrl}`);
  console.log(`[Bootstrap] WebSocket adapter: IoAdapter (Socket.io)`);
}

bootstrap();
