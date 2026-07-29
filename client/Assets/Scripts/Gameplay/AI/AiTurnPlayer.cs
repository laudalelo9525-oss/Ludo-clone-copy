using System;

namespace LudoVerse.Gameplay.AI
{
    /// <summary>
    /// Drives one AI turn: roll, and move if the roll produced anything to move.
    /// </summary>
    /// <remarks>
    /// Kept separate from <see cref="ILudoAi"/> so the Unity layer can pace the
    /// same decisions behind dice and pawn animations rather than resolving a
    /// whole turn in one frame.
    /// </remarks>
    public static class AiTurnPlayer
    {
        /// <summary>
        /// Rolls for the current player and applies the AI's choice.
        /// </summary>
        /// <returns>
        /// The move that was played, or <c>null</c> when the roll left the
        /// player with nothing to move and the turn passed on.
        /// </returns>
        public static MoveResult PlayTurn(LudoGame game, ILudoAi ai)
        {
            if (game == null)
            {
                throw new ArgumentNullException(nameof(game));
            }

            if (ai == null)
            {
                throw new ArgumentNullException(nameof(ai));
            }

            int player = game.State.CurrentPlayerIndex;
            game.Roll();

            if (game.State.Phase != GamePhase.WaitingForMove)
            {
                return null;
            }

            Move move = ai.ChooseMove(game.State, player, game.LegalMoves);
            return game.MovePawn(move.PawnIndex);
        }
    }
}
