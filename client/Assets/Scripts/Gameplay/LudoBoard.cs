using System.Collections.Generic;

namespace LudoVerse.Gameplay
{
    /// <summary>
    /// Board topology. Positions are stored per pawn as a <em>relative</em>
    /// value, counted from that player's own start cell, which keeps the rules
    /// identical for all four colours:
    /// <list type="bullet">
    /// <item><description><c>-1</c> — waiting in the yard.</description></item>
    /// <item><description><c>0 .. 51</c> — on the shared main track.</description></item>
    /// <item><description><c>52 .. 57</c> — in the player's own home column.</description></item>
    /// <item><description><c>57</c> — home; a pawn needs an exact roll to land here.</description></item>
    /// </list>
    /// A pawn therefore travels 57 steps from its start cell to home.
    /// </summary>
    public static class LudoBoard
    {
        /// <summary>Number of cells on the shared main track.</summary>
        public const int MainTrackLength = 52;

        /// <summary>Cells in a player's private home column, home cell included.</summary>
        public const int HomeColumnLength = 6;

        /// <summary>Pawns each player owns.</summary>
        public const int PawnsPerPlayer = 4;

        /// <summary>Relative position of a pawn that has not entered play.</summary>
        public const int YardPosition = -1;

        /// <summary>Relative position of the first home column cell.</summary>
        public const int HomeColumnEntry = MainTrackLength;

        /// <summary>Relative position of the home cell itself.</summary>
        public const int HomePosition = MainTrackLength + HomeColumnLength - 1;

        /// <summary>Die value that releases a pawn from the yard.</summary>
        public const int YardExitRoll = 6;

        /// <summary>Distance between two players' start cells.</summary>
        private const int SeatSpacing = MainTrackLength / 4;

        /// <summary>
        /// Absolute cells on which a pawn cannot be captured: the four start
        /// cells plus the four starred cells between them.
        /// </summary>
        private static readonly HashSet<int> SafeCells = new HashSet<int> { 0, 8, 13, 21, 26, 34, 39, 47 };

        /// <summary>Absolute main track index of a colour's start cell.</summary>
        public static int StartCell(PlayerColor color)
        {
            return (int)color * SeatSpacing;
        }

        /// <summary>True while the pawn is on the shared main track.</summary>
        public static bool IsOnMainTrack(int relativePosition)
        {
            return relativePosition >= 0 && relativePosition < MainTrackLength;
        }

        /// <summary>True once the pawn has turned into its own home column.</summary>
        public static bool IsInHomeColumn(int relativePosition)
        {
            return relativePosition >= HomeColumnEntry && relativePosition <= HomePosition;
        }

        /// <summary>True when the pawn has reached home and can no longer move.</summary>
        public static bool IsHome(int relativePosition)
        {
            return relativePosition == HomePosition;
        }

        /// <summary>True while the pawn is still waiting in the yard.</summary>
        public static bool IsInYard(int relativePosition)
        {
            return relativePosition == YardPosition;
        }

        /// <summary>
        /// Translates a relative position into the shared main track index that
        /// every player sees. Only meaningful on the main track.
        /// </summary>
        public static int ToAbsolute(PlayerColor color, int relativePosition)
        {
            return (StartCell(color) + relativePosition) % MainTrackLength;
        }

        /// <summary>True when no capture can happen on the given main track cell.</summary>
        public static bool IsSafeCell(int absolutePosition)
        {
            return SafeCells.Contains(absolutePosition);
        }

        /// <summary>The eight capture-proof cells, for board rendering and tests.</summary>
        public static IEnumerable<int> GetSafeCells()
        {
            return SafeCells;
        }
    }
}
