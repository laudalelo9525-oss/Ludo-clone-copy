using System;
using System.Collections.Generic;

namespace LudoVerse.Gameplay
{
    /// <summary>
    /// Read-only questions about a board position: what a move would capture,
    /// and what could capture a pawn on the next turn.
    /// </summary>
    /// <remarks>
    /// Nothing here mutates state, so the rules engine and the AI can both use
    /// it — the AI to look ahead, <see cref="LudoGame"/> to apply the result.
    /// </remarks>
    public static class BoardQuery
    {
        /// <summary>Furthest a pawn can be pushed by a single die.</summary>
        private const int MaxDie = 6;

        /// <summary>
        /// Opponent pawns that would be sent home if <paramref name="movingPlayer"/>
        /// landed on <paramref name="destination"/>. Empty on safe cells, in home
        /// columns, and when the cell is unoccupied.
        /// </summary>
        public static IReadOnlyList<CapturedPawn> GetCapturableOpponents(
            GameState state,
            int movingPlayer,
            int destination)
        {
            if (state == null)
            {
                throw new ArgumentNullException(nameof(state));
            }

            // Home columns are private and safe cells are protected, so a
            // capture is only possible on an unprotected main track cell.
            if (!LudoBoard.IsOnMainTrack(destination))
            {
                return Array.Empty<CapturedPawn>();
            }

            int absolute = LudoBoard.ToAbsolute(state.ColorOf(movingPlayer), destination);
            if (LudoBoard.IsSafeCell(absolute))
            {
                return Array.Empty<CapturedPawn>();
            }

            List<CapturedPawn> captured = null;

            for (int player = 0; player < state.PlayerCount; player++)
            {
                if (player == movingPlayer)
                {
                    continue;
                }

                PlayerColor color = state.ColorOf(player);

                for (int pawn = 0; pawn < LudoBoard.PawnsPerPlayer; pawn++)
                {
                    int position = state.GetPawn(player, pawn);
                    if (!LudoBoard.IsOnMainTrack(position))
                    {
                        continue;
                    }

                    if (LudoBoard.ToAbsolute(color, position) != absolute)
                    {
                        continue;
                    }

                    captured ??= new List<CapturedPawn>();
                    captured.Add(new CapturedPawn(player, pawn));
                }
            }

            return captured ?? (IReadOnlyList<CapturedPawn>)Array.Empty<CapturedPawn>();
        }

        /// <summary>
        /// How many opponent pawns could capture <paramref name="playerIndex"/>
        /// on <paramref name="position"/> with their next roll.
        /// </summary>
        /// <remarks>
        /// An opponent threatens the cell when it sits one to six cells behind
        /// it <em>and</em> would still be on the main track after moving — a
        /// pawn about to turn into its own home column can no longer reach.
        /// </remarks>
        public static int CountThreats(GameState state, int playerIndex, int position)
        {
            if (state == null)
            {
                throw new ArgumentNullException(nameof(state));
            }

            if (!LudoBoard.IsOnMainTrack(position))
            {
                return 0;
            }

            int absolute = LudoBoard.ToAbsolute(state.ColorOf(playerIndex), position);
            if (LudoBoard.IsSafeCell(absolute))
            {
                return 0;
            }

            int threats = 0;

            for (int player = 0; player < state.PlayerCount; player++)
            {
                if (player == playerIndex)
                {
                    continue;
                }

                PlayerColor color = state.ColorOf(player);

                for (int pawn = 0; pawn < LudoBoard.PawnsPerPlayer; pawn++)
                {
                    int opponent = state.GetPawn(player, pawn);
                    if (!LudoBoard.IsOnMainTrack(opponent))
                    {
                        continue;
                    }

                    int distance = Distance(LudoBoard.ToAbsolute(color, opponent), absolute);
                    if (distance < 1 || distance > MaxDie)
                    {
                        continue;
                    }

                    // The opponent must still be on the shared track after the
                    // roll; otherwise it turns off into its home column.
                    if (opponent + distance > LudoBoard.MainTrackLength - 1)
                    {
                        continue;
                    }

                    threats++;
                }
            }

            return threats;
        }

        /// <summary>True when at least one opponent could capture that cell next turn.</summary>
        public static bool IsUnderThreat(GameState state, int playerIndex, int position)
        {
            return CountThreats(state, playerIndex, position) > 0;
        }

        /// <summary>Clockwise distance from one main track cell to another.</summary>
        private static int Distance(int from, int to)
        {
            return ((to - from) % LudoBoard.MainTrackLength + LudoBoard.MainTrackLength)
                % LudoBoard.MainTrackLength;
        }
    }
}
