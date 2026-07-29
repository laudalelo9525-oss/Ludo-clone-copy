using System;
using System.Collections.Generic;

namespace LudoVerse.Gameplay.AI
{
    /// <summary>
    /// Plays a legal move at random. Seeded, so a replay of the same match
    /// reproduces the same decisions.
    /// </summary>
    public sealed class RandomAi : ILudoAi
    {
        private readonly Random random;

        public RandomAi(int seed)
        {
            random = new Random(seed);
        }

        public AiDifficulty Difficulty
        {
            get { return AiDifficulty.Easy; }
        }

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

            return legalMoves[random.Next(legalMoves.Count)];
        }
    }
}
