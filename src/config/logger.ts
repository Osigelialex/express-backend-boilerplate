import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { ENV } from "@/config/env";

const isProduction = ENV.NODE_ENV === "production";

// Human friendly in development, one JSON object per line in production so
// log shippers (Docker, Loki, CloudWatch, Datadog...) can parse it.
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}: ${message}${extra}`;
  }),
);

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const transports: winston.transport[] = [new winston.transports.Console()];

// Optional rotating files (./logs). Off by default: in containers prefer
// stdout and let the Docker log driver handle rotation.
if (ENV.LOG_TO_FILE) {
  transports.push(
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "14d",
    }),
    new DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  );
}

/**
 * Application logger. Pass structured metadata as the second argument:
 *   logger.info("User created", { userId, context: "AuthService.signup" });
 */
export const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: isProduction ? productionFormat : developmentFormat,
  transports,
  // Keep test output readable.
  silent: ENV.NODE_ENV === "test",
});
