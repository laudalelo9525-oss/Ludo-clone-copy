using System;

namespace LudoVerse.Gameplay.AI
{
    /// <summary>Builds the opponent behind a difficulty setting.</summary>
    public static class LudoAiFactory
    {
        /// <param name="difficulty">Level chosen by the player.</param>
        /// <param name="seed">Seed for levels that use randomness, so matches replay identically.</param>
        public static ILudoAi Create(AiDifficulty difficulty, int seed = 0)
        {
            switch (difficulty)
            {
                case AiDifficulty.Easy:
                    return new RandomAi(seed);
                case AiDifficulty.Medium:
                    return new HeuristicAi(AiDifficulty.Medium, AiWeights.Medium);
                case AiDifficulty.Hard:
                    return new HeuristicAi(AiDifficulty.Hard, AiWeights.Hard);
                default:
                    throw new ArgumentOutOfRangeException(
                        nameof(difficulty),
                        difficulty,
                        "Unknown difficulty.");
            }
        }
    }
}
