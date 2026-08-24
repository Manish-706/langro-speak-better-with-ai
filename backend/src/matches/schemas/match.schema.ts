import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MatchStatus = 'active' | 'ended';
export type MatchDocument = HydratedDocument<Match>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Match {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userAId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userBId: Types.ObjectId;

  /** UUID — used as the WebRTC room identifier */
  @Prop({ required: true, unique: true })
  roomId: string;

  @Prop({ required: true, enum: ['active', 'ended'], default: 'active' })
  status: MatchStatus;

  @Prop()
  endedAt?: Date;

  createdAt: Date;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
MatchSchema.index({ userAId: 1, status: 1 });
MatchSchema.index({ userBId: 1, status: 1 });
