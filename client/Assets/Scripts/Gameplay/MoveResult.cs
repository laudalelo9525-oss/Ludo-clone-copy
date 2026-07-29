using System.Collections.Generic;

namespace LudoVerse.Gameplay
{
    /// <summary>Identifies a pawn that was sent back to its yard by a capture.</summary>
    public readonly struct CapturedPawn
    {
        public CapturedPawn(int playerIndex, int pawnIndex)
        {
            PlayerIndex = playerIndex;
            PawnIndex = pawnIndex;
        }

        public int PlayerIndex { get; }

        public int PawnIndex { get; }
    }

    /// <summary>
    /// What actually happened when a move was applied. The presentation layer
    /// animates from this, and Phase 3 mirrors it in the Colyseus room events.
    /// </summary>
    public sealed class MoveResult
    {
        public MoveResult(Move move, IReadOnlyList<CapturedPawn> captures, bool grantsExtraTurn, bool wins)
        {
            Move = move;
            Captures = captures;
            GrantsExtraTurn = grantsExtraTurn;
            Wins = wins;
        }

        /// <summary>The move that was applied.</summary>
        public Move Move { get; }

        /// <summary>Opponent pawns sent back to their yard, possibly empty.</summary>
        public IReadOnlyList<CapturedPawn> Captures { get; }

        /// <summary>True when the mover rolls again instead of passing play on.</summary>
        public bool GrantsExtraTurn { get; }

        /// <summary>True when this move brought the mover's last pawn home.</summary>
        public bool Wins { get; }
    }
}
