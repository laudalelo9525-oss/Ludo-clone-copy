using System;
using System.Collections.Generic;

namespace LudoVerse.Gameplay.AI
{
    /// <summary>
    /// Picks the highest scoring move for its weight set. Ties go to the lowest
    /// pawn index, so a given position always produces the same move.
    /// </summary>
    public sealed class HeuristicAi : ILudoAi
    {
        private readonly AiWeights weights;

        public HeuristicAi(AiDifficulty difficulty, AiWeights weights)
        {
            Difficulty = difficulty;
            this.weights = weights;
        }

        public AiDifficulty Difficulty { get; }

        public Move ChooseMove(GameState state, int playerIndex, IReadOnlyList<Move> legalMoves)
        {
            if (legalMoves == null)
            {
                throw new ArgumentNullException(nameof(legalMoves));
            }

            if (legalMoves.Count == 0)
            {
                throw new ArgumentException("The AI was asked to move with no legal moves.", nameof(legalMoves));
            }

            Move best = legalMoves[0];
            int bestScore = MoveEvaluator.Score(state, playerIndex, best, weights);

            for (int i = 1; i < legalMoves.Count; i++)
            {
                int score = MoveEvaluator.Score(state, playerIndex, legalMoves[i], weights);
                if (score > bestScore)
                {
                    best = legalMoves[i];
                    bestScore = score;
                }
            }

            return best;
        }
    }
}
