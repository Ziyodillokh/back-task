// schemas/user.schema.ts
import { UserRole } from '@/common/enums/user-role.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  first_name: string;

  @Prop()
  last_name?: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ enum: UserRole, default: UserRole.CASHIER })
  role: UserRole;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  is_deleted?: boolean;

  @Prop()
  deleted_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ is_active: 1 });
UserSchema.index({ role: 1 });
