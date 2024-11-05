import mongoose from 'mongoose';

declare global {
  var mongo: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
}

export {};
