namespace LudoVerse.Gameplay
{
    /// <summary>
    /// A legal relocation of one pawn for a given die value. Produced by
    /// <see cref="MoveGenerator"/> and consumed by <see cref="LudoGame"/>;
    /// it carries no capture information because that depends on the board
    /// state at the moment the move is applied.
    /// </summary>
    public readonly struct Move
    {
        public Move(int pawnIndex, int from, int to)
        {
            PawnIndex = pawnIndex;
            From = from;
            To = to;
        }

        /// <summary>Index of the moving pawn within its player's set.</summary>
        public int PawnIndex { get; }

        /// <summary>Relative position before the move.</summary>
        public int From { get; }

        /// <summary>Relative position after the move.</summary>
        public int To { get; }

        /// <summary>True when the move releases a pawn from the yard.</summary>
        public bool LeavesYard
        {
            get { return LudoBoard.IsInYard(From); }
        }

        /// <summary>True when the move brings the pawn home.</summary>
        public bool ReachesHome
        {
            get { return LudoBoard.IsHome(To); }
        }

        public override string ToString()
        {
            return $"Pawn {PawnIndex}: {From} -> {To}";
        }
    }
}
