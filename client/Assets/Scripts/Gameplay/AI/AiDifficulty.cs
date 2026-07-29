namespace LudoVerse.Gameplay.AI
{
    /// <summary>
    /// Strength of an offline opponent, as offered in the difficulty picker.
    /// </summary>
    public enum AiDifficulty
    {
        /// <summary>Plays a legal move at random; makes obvious mistakes.</summary>
        Easy = 0,

        /// <summary>Chases captures and home, but never defends.</summary>
        Medium = 1,

        /// <summary>Weighs danger too: avoids landing in front of opponents and flees threats.</summary>
        Hard = 2,
    }
}
