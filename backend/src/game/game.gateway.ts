import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { HttpException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { AnswerInput, VoteInput } from './game.types';

interface SocketData {
  playerId?: string;
  roomCode?: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly gameService: GameService) {}

  handleConnection(_client: Socket) {}

  async handleDisconnect(client: Socket) {
    await this.gameService.clearSocketId(client.id);
  }

  @SubscribeMessage('room:create')
  async createRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { nickname: string },
  ) {
    try {
      const result = await this.gameService.createRoom(data.nickname, client.id);
      this.setSocketData(client, result.playerId, result.roomCode);
      client.join(result.roomCode);
      await this.broadcastRoom(result.roomId);
      return result;
    } catch (error) {
      return this.emitError(client, error);
    }
  }

  @SubscribeMessage('room:join')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; nickname: string },
  ) {
    try {
      const result = await this.gameService.joinRoom(
        data.code,
        data.nickname,
        client.id,
      );
      this.setSocketData(client, result.playerId, result.roomCode);
      client.join(result.roomCode);
      await this.broadcastRoom(result.roomId);
      return result;
    } catch (error) {
      return this.emitError(client, error);
    }
  }

  @SubscribeMessage('question:submit')
  async submitQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string; text: string },
  ) {
    try {
      const roomId = await this.gameService.submitQuestion(
        data.playerId,
        data.text,
      );
      await this.broadcastRoom(roomId);
    } catch (error) {
      return this.emitError(client, error);
    }
  }

  @SubscribeMessage('game:start')
  async startGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string },
  ) {
    try {
      const roomId = await this.gameService.startGame(data.playerId);
      await this.broadcastRoom(roomId);
    } catch (error) {
      return this.emitError(client, error);
    }
  }

  @SubscribeMessage('answer:submit')
  async submitAnswers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string; answers: AnswerInput[] },
  ) {
    try {
      const roomId = await this.gameService.submitAnswers(
        data.playerId,
        data.answers,
      );
      await this.broadcastRoom(roomId);
    } catch (error) {
      return this.emitError(client, error);
    }
  }

  @SubscribeMessage('vote:submit')
  async submitVotes(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string; votes: VoteInput[] },
  ) {
    try {
      const roomId = await this.gameService.submitVotes(
        data.playerId,
        data.votes,
      );
      await this.broadcastRoom(roomId);
    } catch (error) {
      return this.emitError(client, error);
    }
  }

  @SubscribeMessage('voting:end')
  async endVoting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string },
  ) {
    try {
      const roomId = await this.gameService.endVoting(data.playerId);
      await this.broadcastRoom(roomId);
    } catch (error) {
      return this.emitError(client, error);
    }
  }

  @SubscribeMessage('question:next')
  async nextQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string },
  ) {
    try {
      const roomId = await this.gameService.nextQuestion(data.playerId);
      await this.broadcastRoom(roomId);
    } catch (error) {
      return this.emitError(client, error);
    }
  }

  @SubscribeMessage('room:sync')
  async syncRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; playerId: string },
  ) {
    try {
      const roomId = await this.gameService.getRoomIdByCode(data.roomCode);
      this.setSocketData(client, data.playerId, data.roomCode);
      client.join(data.roomCode);
      const state = await this.gameService.buildRoomState(
        roomId,
        data.playerId,
      );
      client.emit('room:state', state);
    } catch (error) {
      return this.emitError(client, error);
    }
  }

  private setSocketData(client: Socket, playerId: string, roomCode: string) {
    const data = client.data as SocketData;
    data.playerId = playerId;
    data.roomCode = roomCode;
  }

  private async broadcastRoom(roomId: string) {
    const baseState = await this.gameService.buildRoomState(roomId);
    const sockets = await this.server.in(baseState.code).fetchSockets();

    for (const socket of sockets) {
      const playerId = (socket.data as SocketData).playerId;
      const state = playerId
        ? await this.gameService.buildRoomState(roomId, playerId)
        : baseState;
      socket.emit('room:state', state);
    }
  }

  private emitError(client: Socket, error: unknown) {
    let message = 'Bilinmeyen bir hata oluştu.';

    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else {
        const body = response as { message?: string | string[] };
        message = Array.isArray(body.message)
          ? body.message[0]
          : (body.message ?? message);
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    client.emit('room:error', { message });
    return { error: message };
  }
}
