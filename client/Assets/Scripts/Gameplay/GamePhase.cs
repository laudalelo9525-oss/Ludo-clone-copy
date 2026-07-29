namespace LudoVerse.Gameplay
{
    /// <summary>
    /// Where a match currently sits in the turn loop
    /// (Dice Roll -> Player Turn -> Move Validation -> Win Check in the SDD).
    /// </summary>
    public enum GamePhase
    {
        /// <summary>The current player has to roll.</summary>
        WaitingForRoll = 0,

        /// <summary>A die value is pending and at least one legal move exists.</summary>
        WaitingForMove = 1,

        /// <summary>Someone has brought every pawn home; no further moves.</summary>
        Finished = 2,
    }
}
