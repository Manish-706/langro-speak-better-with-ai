import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

type DocTransformRet = Record<string, unknown>;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc: unknown, ret: DocTransformRet) => {
      ret['id'] = (ret['_id'] as { toString(): string }).toString();
      delete ret['_id'];
      delete ret['__v'];
      delete ret['passwordHash'];
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, trim: true, maxlength: 50 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  // Added by timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
