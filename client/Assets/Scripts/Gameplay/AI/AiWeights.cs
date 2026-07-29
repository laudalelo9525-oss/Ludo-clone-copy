namespace LudoVerse.Gameplay.AI
{
    /// <summary>
    /// What a difficulty level cares about. Every weight is a score bonus,
    /// except <see cref="RiskPerThreat"/> which is subtracted.
    /// </summary>
    /// <remarks>
    /// Difficulty is expressed as which considerations an opponent is blind to,
    /// rather than as a search depth. A Medium opponent plays a sensible
    /// forward game but walks into danger, which reads as beatable without
    /// looking broken.
    /// </remarks>
    public readonly struct AiWeights
    {
        public AiWeights(
            int capture,
            int capturedProgress,
            int reachHome,
            int enterHomeColumn,
            int leaveYard,
            int landOnSafeCell,
            int progress,
            int riskPerThreat,
            int escapeThreat)
        {
            Capture = capture;
            CapturedProgress = capturedProgress;
            ReachHome = reachHome;
            EnterHomeColumn = enterHomeColumn;
            LeaveYard = leaveYard;
            LandOnSafeCell = landOnSafeCell;
            Progress = progress;
            RiskPerThreat = riskPerThreat;
            EscapeThreat = escapeThreat;
        }

        /// <summary>Flat bonus for sending an opponent home.</summary>
        public int Capture { get; }

        /// <summary>Extra per cell the captured pawn had already travelled.</summary>
        public int CapturedProgress { get; }

        /// <summary>Bonus for bringing a pawn home.</summary>
        public int ReachHome { get; }

        /// <summary>Bonus for turning into the safety of the home column.</summary>
        public int EnterHomeColumn { get; }

        /// <summary>Bonus for putting another pawn into play.</summary>
        public int LeaveYard { get; }

        /// <summary>Bonus for finishing the move on a capture-proof cell.</summary>
        public int LandOnSafeCell { get; }

        /// <summary>Bonus per cell of progress towards home.</summary>
        public int Progress { get; }

        /// <summary>Penalty per opponent able to capture the destination next turn.</summary>
        public int RiskPerThreat { get; }

        /// <summary>Bonus for moving a pawn that is currently in danger.</summary>
        public int EscapeThreat { get; }

        /// <summary>Chases captures and home; blind to danger.</summary>
        public static AiWeights Medium
        {
            get
            {
                return new AiWeights(
                    capture: 100,
                    capturedProgress: 0,
                    reachHome: 120,
                    enterHomeColumn: 40,
                    leaveYard: 60,
                    landOnSafeCell: 0,
                    progress: 1,
                    riskPerThreat: 0,
                    escapeThreat: 0);
            }
        }

        /// <summary>Weighs danger as well as progress.</summary>
        public static AiWeights Hard
        {
            get
            {
                return new AiWeights(
                    capture: 120,
                    capturedProgress: 1,
                    reachHome: 150,
                    enterHomeColumn: 60,
                    leaveYard: 80,
                    landOnSafeCell: 30,
                    progress: 1,
                    riskPerThreat: 45,
                    // Above LandOnSafeCell on purpose: moving the hunted pawn
                    // beats parking a different one on a star, which would
                    // leave the threatened pawn exactly where it was.
                    escapeThreat: 55);
            }
        }
    }
}
