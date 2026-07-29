using System;
using System.Collections.Generic;

namespace LudoVerse.Gameplay.AI
{
    /// <summary>
    /// Scores a single move against a set of <see cref="AiWeights"/>.
    /// </summary>
    /// <remarks>
    /// Deliberately a one-ply evaluation: it looks at what the move achieves and
    /// at what the opponents could do to the destination immediately after. That
    /// is enough for a convincing offline opponent and stays cheap enough to run
    /// on a phone between animations.
    /// </remarks>
    public static class MoveEvaluator
    {
        /// <summary>Higher is better. Scores are only comparable within one turn.</summary>
        public static int Score(GameState state, int playerIndex, Move move, AiWeights weights)
        {
            if (state == null)
            {
                throw new ArgumentNullException(nameof(state));
            }

            int score = move.To * weights.Progress;

            if (move.ReachesHome)
            {
                score += weights.ReachHome;
            }
            else if (LudoBoard.IsInHomeColumn(move.To))
            {
                score += weights.EnterHomeColumn;
            }

            if (move.LeavesYard)
            {
                score += weights.LeaveYard;
            }

            IReadOnlyList<CapturedPawn> captures =
                BoardQuery.GetCapturableOpponents(state, playerIndex, move.To);

            for (int i = 0; i < captures.Count; i++)
            {
                int travelled = state.GetPawn(captures[i].PlayerIndex, captures[i].PawnIndex);
                score += weights.Capture + (travelled * weights.CapturedProgress);
            }

            if (LudoBoard.IsOnMainTrack(move.To)
                && LudoBoard.IsSafeCell(LudoBoard.ToAbsolute(state.ColorOf(playerIndex), move.To)))
            {
                score += weights.LandOnSafeCell;
            }

            score -= BoardQuery.CountThreats(state, playerIndex, move.To) * weights.RiskPerThreat;

            // Getting a hunted pawn out of the way is worth something in itself.
            if (BoardQuery.IsUnderThreat(state, playerIndex, move.From))
            {
                score += weights.EscapeThreat;
            }

            return score;
        }
    }
}
