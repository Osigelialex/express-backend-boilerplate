import prisma from "@/config/database";
import { ERROR_MESSAGES } from "@/config/constants/errors";
import { singleton } from "@/decorators/singleton";
import { PublicUserDto } from "@/dtos/auth.dto";
import { UpdateProfileDto } from "@/dtos/user.dto";
import { notificationsPublisher } from "@/sockets/notifications.publisher";
import { NotFoundError } from "@/utils/appError";
import { toPublicUserDto } from "@/utils/userMapper";

/**
 * The signed-in user's own profile. `@singleton` shows the decorator: the
 * class holds no state, so one shared instance is enough.
 */
@singleton
export class UserService {
  async getById(userId: string): Promise<PublicUserDto> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    return toPublicUserDto(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<PublicUserDto> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
    });

    const result = toPublicUserDto(user);

    // REST -> WebSocket push: tell the user's other devices/tabs. A no-op when
    // no socket server is attached (tests, workers).
    notificationsPublisher.profileUpdated(userId, result);

    return result;
  }
}
