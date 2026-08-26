import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [PrismaModule, GameModule],
  controllers: [AppController],
})
export class AppModule {}
