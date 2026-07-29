using System.Collections.Generic;

namespace LudoVerse.Gameplay.AI
{
    /// <summary>
    /// Picks which pawn an offline opponent moves.
    /// </summary>
    /// <remarks>
    /// The same interface backs the AFK auto-play takeover in Issue 6.2, which
    /// is why choosing a move is separated from driving the turn loop.
    /// </remarks>
    public interface ILudoAi
    {
        /// <summary>How strong this opponent is meant to feel.</summary>
        AiDifficulty Difficulty { get; }

        /// <summary>
        /// Chooses one of <paramref name="legalMoves"/>, which is never empty.
        /// </summary>
        Move ChooseMove(GameState state, int playerIndex, IReadOnlyList<Move> legalMoves);
    }
}
