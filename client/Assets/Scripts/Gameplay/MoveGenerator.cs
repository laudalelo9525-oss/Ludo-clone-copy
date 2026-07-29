using System;
using System.Collections.Generic;

namespace LudoVerse.Gameplay
{
    /// <summary>
    /// Works out which pawns a player may move for a given die value.
    /// </summary>
    /// <remarks>
    /// Deterministic and free of engine types, so the client can use it for
    /// input hints and the Phase 6 AI can use it to search. The authoritative
    /// server is TypeScript and keeps its own implementation; the constants
    /// both sides must agree on belong in <c>shared/</c>.
    /// </remarks>
    public static class MoveGenerator
    {
        /// <summary>
        /// Legal moves for <paramref name="playerIndex"/> with the given die.
        /// An empty list means the turn passes.
        /// </summary>
        public static IReadOnlyList<Move> GetLegalMoves(GameState state, int playerIndex, int die)
        {
            if (state == null)
            {
                throw new ArgumentNullException(nameof(state));
            }

            if (die < 1 || die > 6)
            {
                throw new ArgumentOutOfRangeException(nameof(die), die, "A die shows 1..6.");
            }

            var moves = new List<Move>(LudoBoard.PawnsPerPlayer);

            for (int pawn = 0; pawn < LudoBoard.PawnsPerPlayer; pawn++)
            {
                int from = state.GetPawn(playerIndex, pawn);

                if (TryGetTarget(from, die, out int to))
                {
                    moves.Add(new Move(pawn, from, to));
                }
            }

            return moves;
        }

        /// <summary>
        /// Where a pawn at <paramref name="from"/> lands with the given die, or
        /// false when the pawn cannot legally move at all.
        /// </summary>
        public static bool TryGetTarget(int from, int die, out int to)
        {
            to = 0;

            // A pawn in the yard only comes out on a six, onto its start cell.
            if (LudoBoard.IsInYard(from))
            {
                if (die != LudoBoard.YardExitRoll)
                {
                    return false;
                }

                to = 0;
                return true;
            }

            // A pawn that is already home never moves again.
            if (LudoBoard.IsHome(from))
            {
                return false;
            }

            int target = from + die;

            // Home has to be reached exactly; an overshoot is not a legal move.
            if (target > LudoBoard.HomePosition)
            {
                return false;
            }

            to = target;
            return true;
        }
    }
}
