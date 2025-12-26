import { User } from '@/modules/users/schemas/user.schema';

interface ILogin {
  accessTokenCookie: string;
  refreshTokenCookie: string;
  user: User;
}

export default ILogin;
