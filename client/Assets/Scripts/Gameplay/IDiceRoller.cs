using System;

namespace LudoVerse.Gameplay
{
    /// <summary>
    /// Source of die values. Offline play uses <see cref="SeededDiceRoller"/>;
    /// from Phase 3 the online implementation returns the value the
    /// authoritative server rolled, so the client never decides its own dice.
    /// </summary>
    public interface IDiceRoller
    {
        /// <summary>Returns a value in the inclusive range 1..6.</summary>
        int Roll();
    }

    /// <summary>
    /// Deterministic dice for offline play and for reproducible tests: the same
    /// seed always produces the same sequence.
    /// </summary>
    public sealed class SeededDiceRoller : IDiceRoller
    {
        private readonly Random random;

        /// <summary>Creates a roller with a time-based seed.</summary>
        public SeededDiceRoller()
            : this(Environment.TickCount)
        {
        }

        /// <summary>Creates a roller with an explicit seed.</summary>
        public SeededDiceRoller(int seed)
        {
            random = new Random(seed);
        }

        public int Roll()
        {
            return random.Next(1, 7);
        }
    }
}
