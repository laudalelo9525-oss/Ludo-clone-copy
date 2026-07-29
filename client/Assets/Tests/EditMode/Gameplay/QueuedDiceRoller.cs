using System.Collections.Generic;
using LudoVerse.Gameplay;

namespace LudoVerse.Tests.Gameplay
{
    /// <summary>
    /// Hands out a scripted sequence of die values so rules can be tested
    /// without relying on chance.
    /// </summary>
    internal sealed class QueuedDiceRoller : IDiceRoller
    {
        private readonly Queue<int> values;

        public QueuedDiceRoller(params int[] values)
        {
            this.values = new Queue<int>(values);
        }

        public int Roll()
        {
            if (values.Count == 0)
            {
                throw new System.InvalidOperationException("The scripted dice sequence ran out.");
            }

            return values.Dequeue();
        }
    }
}
