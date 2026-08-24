import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Block, BlockDocument } from './schemas/block.schema';

@Injectable()
export class BlocksService {
  constructor(@InjectModel(Block.name) private readonly blockModel: Model<BlockDocument>) {}

  /**
   * Returns true if A blocked B OR B blocked A.
   * Used by matchmaking to reject ineligible candidates.
   */
  async areBlocked(userAId: string, userBId: string): Promise<boolean> {
    const a = new Types.ObjectId(userAId);
    const b = new Types.ObjectId(userBId);
    const count = await this.blockModel.countDocuments({
      $or: [
        { blockerId: a, blockedUserId: b },
        { blockerId: b, blockedUserId: a },
      ],
    });
    return count > 0;
  }

  async createBlock(blockerId: string, blockedUserId: string): Promise<BlockDocument> {
    try {
      return await this.blockModel.create({
        blockerId: new Types.ObjectId(blockerId),
        blockedUserId: new Types.ObjectId(blockedUserId),
      });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('Block relationship already exists');
      }
      throw err;
    }
  }

  async removeBlock(blockerId: string, blockedUserId: string): Promise<void> {
    await this.blockModel.deleteOne({
      blockerId: new Types.ObjectId(blockerId),
      blockedUserId: new Types.ObjectId(blockedUserId),
    });
  }
}
