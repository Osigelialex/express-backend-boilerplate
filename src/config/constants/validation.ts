export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 99;

export const EMAIL_MAX_LENGTH = 99;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;
/** At least one lowercase, uppercase, digit and special character. */
export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const TOKEN_MAX_LENGTH = 2048;

export const OTP_LENGTH = 6;
export const OTP_PATTERN = new RegExp(`^\\d{${OTP_LENGTH}}$`);

export const SEARCH_MAX_LENGTH = 100;

export const ROOM_NAME_PATTERN = /^[A-Za-z0-9:_-]{1,64}$/;
export const SOCKET_MESSAGE_MAX_LENGTH = 1000;
