import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BlockDocument = HydratedDocument<Block>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Block {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  blockerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  blockedUserId: Types.ObjectId;

  createdAt: Date;
}

export const BlockSchema = SchemaFactory.createForClass(Block);

// Prevent duplicate block relationships
BlockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });
