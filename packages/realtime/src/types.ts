interface MatchScore {
  sets: Array<{ score1: number; score2: number }>;
}

export type RealtimeEvent =
  | { type: "match:started"; matchId: string; courtNumber: number }
  | {
      type: "match:ended";
      matchId: string;
      winnerId: string;
      score: MatchScore;
    }
  | { type: "bracket:updated"; bracketId: string; categoryId: string }
  | {
      type: "pool:updated";
      poolId: string;
      categoryId: string;
    }
  | {
      type: "next_match";
      playerId: string;
      matchId: string;
      courtNumber: number | null;
      opponentName: string;
    };

export interface RealtimeProvider {
  subscribe(
    channel: string,
    callback: (event: RealtimeEvent) => void,
  ): () => void;
  publish(channel: string, event: RealtimeEvent): Promise<void>;
}
