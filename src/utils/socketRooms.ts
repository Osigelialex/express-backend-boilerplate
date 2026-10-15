/**
 * Socket.IO room naming. Rooms are just strings, so build them here to keep
 * the naming scheme in one place and avoid collisions between features.
 */

/** Private room every connection of one user joins (all their devices/tabs). */
export const userRoom = (userId: string): string => `user:${userId}`;

/** A named, client-joinable room (chat channel, live document, ...). */
export const namedRoom = (name: string): string => `room:${name}`;
