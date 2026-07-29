namespace LudoVerse.Gameplay
{
    /// <summary>
    /// The four seats of a Ludo board, ordered clockwise. The numeric value is
    /// the seat index and decides where the player's start cell sits on the
    /// main track, so it must not be reordered.
    /// </summary>
    public enum PlayerColor
    {
        Red = 0,
        Green = 1,
        Yellow = 2,
        Blue = 3,
    }
}
