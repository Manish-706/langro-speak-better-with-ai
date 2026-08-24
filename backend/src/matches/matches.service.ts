import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Match, MatchDocument } from './schemas/match.schema';

@Injectable()
export class MatchesService {
  constructor(@InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>) {}

  async create(userAId: string, userBId: string): Promise<MatchDocument> {
    return this.matchModel.create({
      userAId: new Types.ObjectId(userAId),
      userBId: new Types.ObjectId(userBId),
      roomId: uuidv4(),
      status: 'active',
    });
  }

  async findByRoomId(roomId: string): Promise<MatchDocument | null> {
    return this.matchModel.findOne({ roomId }).exec();
  }

  async endMatch(roomId: string): Promise<void> {
    await this.matchModel.updateOne(
      { roomId, status: 'active' },
      { status: 'ended', endedAt: new Date() },
    );
  }

  async hasActiveMatch(userId: string): Promise<boolean> {
    const oid = new Types.ObjectId(userId);
    const count = await this.matchModel.countDocuments({
      $or: [{ userAId: oid }, { userBId: oid }],
      status: 'active',
    });
    return count > 0;
  }

  /**
   * Ends ALL active matches for a given user.
   * Called when a user re-enters the matchmaking queue to self-heal stale state
   * that wasn't cleaned up (e.g. browser closed, socket dropped mid-call).
   */
  async endStaleMatchesForUser(userId: string): Promise<void> {
    const oid = new Types.ObjectId(userId);
    await this.matchModel.updateMany(
      {
        $or: [{ userAId: oid }, { userBId: oid }],
        status: 'active',
      },
      { status: 'ended', endedAt: new Date() },
    );
  }

}
