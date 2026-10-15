import crypto from "crypto";
import { OTP_LENGTH } from "@/config/constants/validation";

/** A fresh, cryptographically random, zero-padded one-time code. */
export const generateOtp = (): string =>
  crypto
    .randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
