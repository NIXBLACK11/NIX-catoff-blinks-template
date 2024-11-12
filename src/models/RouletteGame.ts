import { CLUSTER_TYPES } from '@/common/types';
import { PublicKey } from '@solana/web3.js';
import mongoose, { Document, Schema } from 'mongoose';

export interface DBIRouletteGame extends Document {
  Name: string;
  token: string;
  wager: number;
  colorChoice: string;
}

const RouletteGameSchema: Schema = new Schema({
  Name: { type: String, required: true },
  token: { type: String, required: true },
  wager: { type: Number, required: true },
  player1ColorChoice: { type: String, required: true },
  player2ColorChoice: { type: String, default: "" },
  player1Account: { type: String, required: true},
  player2Account: { type: String, default: "" },
  clusterurl: { type: String, required: true },
  winner: { type: String, default: ""},
}, {
  timestamps: true,
});

const RouletteGame = mongoose.models.RouletteGame || mongoose.model<DBIRouletteGame>('RouletteGame', RouletteGameSchema);

export default RouletteGame;
