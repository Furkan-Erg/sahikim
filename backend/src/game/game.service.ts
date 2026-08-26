import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoomPhase } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MIN_PLAYERS,
  ROOM_CODE_CHARSET,
  ROOM_CODE_LENGTH,
} from './game.constants';
import {
  AnswerInput,
  RoomState,
  VoteInput,
} from './game.types';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(nickname: string, socketId: string) {
    const trimmed = nickname.trim();
    if (!trimmed) {
      throw new BadRequestException('Takma ad boş olamaz.');
    }

    const code = await this.generateUniqueCode();

    const room = await this.prisma.room.create({
      data: {
        code,
        phase: RoomPhase.LOBBY,
        players: {
          create: {
            nickname: trimmed,
            socketId,
          },
        },
      },
      include: { players: true },
    });

    const host = room.players[0];

    await this.prisma.room.update({
      where: { id: room.id },
      data: { hostPlayerId: host.id },
    });

    return {
      roomCode: code,
      playerId: host.id,
      roomId: room.id,
    };
  }

  async joinRoom(code: string, nickname: string, socketId: string) {
    const trimmed = nickname.trim();
    if (!trimmed) {
      throw new BadRequestException('Takma ad boş olamaz.');
    }

    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });

    if (!room) {
      throw new NotFoundException('Oda bulunamadı.');
    }

    if (room.phase !== RoomPhase.LOBBY) {
      throw new BadRequestException('Oyun başlamış, odaya katılamazsın.');
    }

    const existing = room.players.find((p) => p.nickname === trimmed);
    if (existing) {
      await this.prisma.player.update({
        where: { id: existing.id },
        data: { socketId },
      });
      return {
        roomCode: room.code,
        playerId: existing.id,
        roomId: room.id,
      };
    }

    const player = await this.prisma.player.create({
      data: {
        roomId: room.id,
        nickname: trimmed,
        socketId,
      },
    });

    return {
      roomCode: room.code,
      playerId: player.id,
      roomId: room.id,
    };
  }

  async submitQuestion(playerId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('Soru boş olamaz.');
    }

    const player = await this.getPlayerWithRoom(playerId);

    if (player.room.phase !== RoomPhase.LOBBY) {
      throw new BadRequestException('Soru gönderme aşaması bitti.');
    }

    const existing = await this.prisma.question.findFirst({
      where: { authorId: playerId },
    });

    if (existing) {
      throw new BadRequestException('Zaten bir soru gönderdin.');
    }

    await this.prisma.question.create({
      data: {
        roomId: player.roomId,
        authorId: playerId,
        text: trimmed,
      },
    });

    return player.roomId;
  }

  async startGame(playerId: string) {
    const player = await this.getPlayerWithRoom(playerId);
    const room = player.room;

    if (room.hostPlayerId !== playerId) {
      throw new ForbiddenException('Sadece host oyunu başlatabilir.');
    }

    if (room.phase !== RoomPhase.LOBBY) {
      throw new BadRequestException('Oyun zaten başladı.');
    }

    if (room.players.length < MIN_PLAYERS) {
      throw new BadRequestException(`En az ${MIN_PLAYERS} oyuncu gerekli.`);
    }

    const questions = await this.prisma.question.findMany({
      where: { roomId: room.id },
    });

    if (questions.length !== room.players.length) {
      throw new BadRequestException('Her oyuncu bir soru göndermeli.');
    }

    const shuffled = this.shuffle(questions.map((q) => q.id));
    await Promise.all(
      shuffled.map((id, index) =>
        this.prisma.question.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    await this.prisma.room.update({
      where: { id: room.id },
      data: {
        phase: RoomPhase.ANSWERING,
        currentQuestionIndex: 0,
      },
    });

    return room.id;
  }

  async submitAnswers(playerId: string, answers: AnswerInput[]) {
    const player = await this.getPlayerWithRoom(playerId);
    const room = player.room;

    if (room.phase !== RoomPhase.ANSWERING) {
      throw new BadRequestException('Cevaplama aşaması aktif değil.');
    }

    const questions = await this.prisma.question.findMany({
      where: { roomId: room.id },
    });

    if (answers.length !== questions.length) {
      throw new BadRequestException('Tüm sorulara cevap vermelisin.');
    }

    const questionIds = new Set(questions.map((q) => q.id));
    for (const answer of answers) {
      if (!questionIds.has(answer.questionId)) {
        throw new BadRequestException('Geçersiz soru.');
      }
      if (!answer.text.trim()) {
        throw new BadRequestException('Cevaplar boş olamaz.');
      }
    }

    const existing = await this.prisma.answer.findMany({
      where: { playerId },
    });

    if (existing.length > 0) {
      throw new BadRequestException('Zaten cevaplarını gönderdin.');
    }

    await this.prisma.answer.createMany({
      data: answers.map((a) => ({
        questionId: a.questionId,
        playerId,
        text: a.text.trim(),
      })),
    });

    const allAnswered = await this.checkAllPlayersAnswered(room.id);
    if (allAnswered) {
      await this.prisma.room.update({
        where: { id: room.id },
        data: {
          phase: RoomPhase.REVEAL,
          currentQuestionIndex: 0,
        },
      });
    }

    return room.id;
  }

  async submitVotes(playerId: string, votes: VoteInput[]) {
    const player = await this.getPlayerWithRoom(playerId);
    const room = player.room;

    if (room.phase !== RoomPhase.REVEAL) {
      throw new BadRequestException('Oylama aşaması aktif değil.');
    }

    const currentQuestion = await this.getCurrentQuestion(room.id, room.currentQuestionIndex);
    if (!currentQuestion) {
      throw new BadRequestException('Aktif soru bulunamadı.');
    }

    const answers = await this.prisma.answer.findMany({
      where: { questionId: currentQuestion.id },
    });

    const answerMap = new Map(answers.map((a) => [a.id, a]));
    const requiredVotes = answers.filter((a) => a.playerId !== playerId);

    if (votes.length !== requiredVotes.length) {
      throw new BadRequestException('Tüm cevaplara oy vermelisin.');
    }

    for (const vote of votes) {
      const answer = answerMap.get(vote.answerId);
      if (!answer) {
        throw new BadRequestException('Geçersiz cevap.');
      }
      if (answer.playerId === playerId) {
        throw new BadRequestException('Kendi cevabına oy veremezsin.');
      }
      if (vote.value < 1 || vote.value > 5) {
        throw new BadRequestException('Oy 1-5 arasında olmalı.');
      }
    }

    for (const vote of votes) {
      await this.prisma.vote.upsert({
        where: {
          answerId_voterId: {
            answerId: vote.answerId,
            voterId: playerId,
          },
        },
        create: {
          answerId: vote.answerId,
          voterId: playerId,
          value: vote.value,
        },
        update: { value: vote.value },
      });
    }

    return room.id;
  }

  async endVoting(playerId: string) {
    const player = await this.getPlayerWithRoom(playerId);
    const room = player.room;

    if (room.hostPlayerId !== playerId) {
      throw new ForbiddenException('Sadece host oylamayı bitirebilir.');
    }

    if (room.phase !== RoomPhase.REVEAL) {
      throw new BadRequestException('Oylama aşaması aktif değil.');
    }

    await this.prisma.room.update({
      where: { id: room.id },
      data: { phase: RoomPhase.QUESTION_RESULT },
    });

    return room.id;
  }

  async nextQuestion(playerId: string) {
    const player = await this.getPlayerWithRoom(playerId);
    const room = player.room;

    if (room.hostPlayerId !== playerId) {
      throw new ForbiddenException('Sadece host devam edebilir.');
    }

    if (room.phase !== RoomPhase.QUESTION_RESULT) {
      throw new BadRequestException('Sonuç aşaması aktif değil.');
    }

    const totalQuestions = await this.prisma.question.count({
      where: { roomId: room.id },
    });

    const nextIndex = room.currentQuestionIndex + 1;

    if (nextIndex >= totalQuestions) {
      await this.prisma.room.update({
        where: { id: room.id },
        data: { phase: RoomPhase.FINISHED },
      });
    } else {
      await this.prisma.room.update({
        where: { id: room.id },
        data: {
          phase: RoomPhase.REVEAL,
          currentQuestionIndex: nextIndex,
        },
      });
    }

    return room.id;
  }

  async buildRoomState(roomId: string, viewerPlayerId?: string): Promise<RoomState> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: {
            questions: true,
            answers: { include: { votes: true } },
            votes: true,
          },
        },
        questions: {
          include: {
            author: true,
            answers: {
              include: {
                player: true,
                votes: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Oda bulunamadı.');
    }

    const scoreByPlayer = this.calculateScores(room.questions);
    const leaderboard = room.players
      .map((p) => ({
        playerId: p.id,
        nickname: p.nickname,
        totalScore: scoreByPlayer.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    const players = room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      hasSubmittedQuestion: p.questions.length > 0,
      totalScore: scoreByPlayer.get(p.id) ?? 0,
    }));

    const totalQuestions = room.questions.length;
    const currentQuestion =
      room.currentQuestionIndex < totalQuestions
        ? room.questions[room.currentQuestionIndex]
        : null;

    let questions: RoomState['questions'] = [];
    let answers: RoomState['answers'] = [];
    let answeredQuestionIds: string[] = [];
    let answeringProgress: RoomState['answeringProgress'] = null;
    let votingProgress: RoomState['votingProgress'] = null;
    let hasSubmittedAnswers = false;
    let hasSubmittedVotes = false;

    if (room.phase === RoomPhase.LOBBY) {
      questions = [];
    } else if (room.phase === RoomPhase.ANSWERING) {
      questions = room.questions.map((q) => ({
        id: q.id,
        text: q.text,
      }));

      answeringProgress = this.buildAnsweringProgress(room.players, totalQuestions);

      if (viewerPlayerId) {
        const viewer = room.players.find((p) => p.id === viewerPlayerId);
        answeredQuestionIds = viewer?.answers.map((a) => a.questionId) ?? [];
        hasSubmittedAnswers = answeredQuestionIds.length === totalQuestions;
      }
    } else if (
      room.phase === RoomPhase.REVEAL ||
      room.phase === RoomPhase.QUESTION_RESULT
    ) {
      if (currentQuestion) {
        questions = [
          {
            id: currentQuestion.id,
            text: currentQuestion.text,
          },
        ];

        answers = currentQuestion.answers.map((a) => {
          const score = a.votes.reduce((sum, v) => sum + v.value, 0);
          const myVote = viewerPlayerId
            ? a.votes.find((v) => v.voterId === viewerPlayerId)?.value
            : undefined;

          return {
            id: a.id,
            text: a.text,
            playerId: a.playerId,
            playerName: a.player.nickname,
            score,
            myVote,
          };
        });

        if (room.phase === RoomPhase.REVEAL) {
          votingProgress = this.buildVotingProgress(
            room.players,
            currentQuestion.answers,
          );

          if (viewerPlayerId) {
            hasSubmittedVotes = this.hasPlayerVotedOnQuestion(
              viewerPlayerId,
              currentQuestion.answers,
            );
          }
        }
      }
    }

    return {
      code: room.code,
      phase: room.phase,
      hostPlayerId: room.hostPlayerId,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions,
      players,
      questions,
      currentQuestion: currentQuestion
        ? {
            id: currentQuestion.id,
            text: currentQuestion.text,
          }
        : null,
      answers,
      answeredQuestionIds,
      answeringProgress,
      votingProgress,
      hasSubmittedAnswers,
      hasSubmittedVotes,
      leaderboard,
      isHost: viewerPlayerId ? room.hostPlayerId === viewerPlayerId : false,
    };
  }

  async getRoomIdByCode(code: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!room) {
      throw new NotFoundException('Oda bulunamadı.');
    }
    return room.id;
  }

  async verifyPlayerInRoom(playerId: string, roomCode: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { room: true },
    });

    if (!player) {
      throw new NotFoundException('Oyuncu bulunamadı.');
    }

    if (player.room.code !== roomCode.toUpperCase()) {
      throw new ForbiddenException('Oyuncu bu odada değil.');
    }

    return player;
  }

  async syncPlayerSocket(playerId: string, roomCode: string, socketId: string) {
    const player = await this.verifyPlayerInRoom(playerId, roomCode);

    await this.prisma.player.update({
      where: { id: player.id },
      data: { socketId },
    });

    return player.roomId;
  }

  async clearSocketId(socketId: string) {
    await this.prisma.player.updateMany({
      where: { socketId },
      data: { socketId: null },
    });
  }

  private async getPlayerWithRoom(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        room: { include: { players: true } },
      },
    });

    if (!player) {
      throw new NotFoundException('Oyuncu bulunamadı.');
    }

    return player;
  }

  private async checkAllPlayersAnswered(roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true, questions: true },
    });

    if (!room) return false;

    const questionCount = room.questions.length;

    for (const player of room.players) {
      const answerCount = await this.prisma.answer.count({
        where: { playerId: player.id },
      });
      if (answerCount < questionCount) {
        return false;
      }
    }

    return true;
  }

  private async getCurrentQuestion(roomId: string, index: number) {
    return this.prisma.question.findFirst({
      where: { roomId },
      orderBy: { order: 'asc' },
      skip: index,
    });
  }

  private buildAnsweringProgress(
    players: { id: string; nickname: string; answers: unknown[] }[],
    totalQuestions: number,
  ) {
    const progressPlayers = players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      hasSubmitted: p.answers.length >= totalQuestions,
    }));

    return {
      submittedCount: progressPlayers.filter((p) => p.hasSubmitted).length,
      totalCount: players.length,
      players: progressPlayers,
    };
  }

  private buildVotingProgress(
    players: { id: string; nickname: string }[],
    answers: { id: string; playerId: string; votes: { voterId: string }[] }[],
  ) {
    const progressPlayers = players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      hasSubmitted: this.hasPlayerVotedOnQuestion(p.id, answers),
    }));

    return {
      submittedCount: progressPlayers.filter((p) => p.hasSubmitted).length,
      totalCount: players.length,
      players: progressPlayers,
    };
  }

  private hasPlayerVotedOnQuestion(
    playerId: string,
    answers: { id: string; playerId: string; votes: { voterId: string }[] }[],
  ) {
    const targets = answers.filter((a) => a.playerId !== playerId);
    if (targets.length === 0) {
      return true;
    }

    return targets.every((a) =>
      a.votes.some((v) => v.voterId === playerId),
    );
  }

  private calculateScores(
    questions: {
      answers: { playerId: string; votes: { value: number }[] }[];
    }[],
  ) {
    const scores = new Map<string, number>();

    for (const question of questions) {
      for (const answer of question.answers) {
        const answerScore = answer.votes.reduce((sum, v) => sum + v.value, 0);
        scores.set(
          answer.playerId,
          (scores.get(answer.playerId) ?? 0) + answerScore,
        );
      }
    }

    return scores;
  }

  private shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
        ROOM_CODE_CHARSET.charAt(
          Math.floor(Math.random() * ROOM_CODE_CHARSET.length),
        ),
      ).join('');

      const existing = await this.prisma.room.findUnique({ where: { code } });
      if (!existing) {
        return code;
      }
    }

    throw new BadRequestException('Oda kodu oluşturulamadı, tekrar dene.');
  }
}
