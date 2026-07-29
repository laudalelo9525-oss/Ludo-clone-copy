using System;
using System.Collections.Generic;

namespace LudoVerse.Gameplay
{
    /// <summary>
    /// The complete, serialisable state of one match: where every pawn stands,
    /// whose turn it is, and what the turn loop is waiting for.
    /// </summary>
    /// <remarks>
    /// <see cref="LudoGame"/> owns the transitions. Mutating this directly is
    /// supported for setting up a position (tests, save games, or a server
    /// snapshot restored after a reconnect), not for playing.
    /// </remarks>
    public sealed class GameState
    {
        /// <summary>Fewest seats a match can be played with.</summary>
        public const int MinPlayers = 2;

        /// <summary>Seats on the board.</summary>
        public const int MaxPlayers = 4;

        /// <summary>Sentinel for "no winner yet".</summary>
        public const int NoWinner = -1;

        private readonly PlayerColor[] players;

        /// <summary>Relative pawn positions, indexed by [player, pawn].</summary>
        private readonly int[,] positions;

        /// <param name="players">Seats in turn order; between two and four distinct colours.</param>
        public GameState(IReadOnlyList<PlayerColor> players)
        {
            if (players == null)
            {
                throw new ArgumentNullException(nameof(players));
            }

            if (players.Count < MinPlayers || players.Count > MaxPlayers)
            {
                throw new ArgumentException(
                    $"A match needs between {MinPlayers} and {MaxPlayers} players, got {players.Count}.",
                    nameof(players));
            }

            var seen = new HashSet<PlayerColor>();
            foreach (PlayerColor color in players)
            {
                if (!seen.Add(color))
                {
                    throw new ArgumentException($"Colour {color} is seated twice.", nameof(players));
                }
            }

            this.players = new PlayerColor[players.Count];
            for (int i = 0; i < players.Count; i++)
            {
                this.players[i] = players[i];
            }

            positions = new int[players.Count, LudoBoard.PawnsPerPlayer];
            for (int player = 0; player < players.Count; player++)
            {
                for (int pawn = 0; pawn < LudoBoard.PawnsPerPlayer; pawn++)
                {
                    positions[player, pawn] = LudoBoard.YardPosition;
                }
            }

            CurrentPlayerIndex = 0;
            Phase = GamePhase.WaitingForRoll;
            PendingDie = 0;
            ConsecutiveSixes = 0;
            WinnerIndex = NoWinner;
        }

        private GameState(GameState other)
        {
            players = (PlayerColor[])other.players.Clone();
            positions = (int[,])other.positions.Clone();
            CurrentPlayerIndex = other.CurrentPlayerIndex;
            Phase = other.Phase;
            PendingDie = other.PendingDie;
            ConsecutiveSixes = other.ConsecutiveSixes;
            WinnerIndex = other.WinnerIndex;
        }

        /// <summary>Number of seated players.</summary>
        public int PlayerCount
        {
            get { return players.Length; }
        }

        /// <summary>Seat whose turn it is.</summary>
        public int CurrentPlayerIndex { get; set; }

        /// <summary>What the turn loop is waiting for.</summary>
        public GamePhase Phase { get; set; }

        /// <summary>Die value awaiting a move, or zero when none is pending.</summary>
        public int PendingDie { get; set; }

        /// <summary>Sixes rolled in a row by the current player.</summary>
        public int ConsecutiveSixes { get; set; }

        /// <summary>Seat that won, or <see cref="NoWinner"/>.</summary>
        public int WinnerIndex { get; set; }

        /// <summary>Colour seated at the given index.</summary>
        public PlayerColor ColorOf(int playerIndex)
        {
            ValidatePlayer(playerIndex);
            return players[playerIndex];
        }

        /// <summary>Colour of the player whose turn it is.</summary>
        public PlayerColor CurrentColor
        {
            get { return players[CurrentPlayerIndex]; }
        }

        /// <summary>Relative position of one pawn.</summary>
        public int GetPawn(int playerIndex, int pawnIndex)
        {
            ValidatePawn(playerIndex, pawnIndex);
            return positions[playerIndex, pawnIndex];
        }

        /// <summary>Places a pawn at a relative position.</summary>
        public void SetPawn(int playerIndex, int pawnIndex, int relativePosition)
        {
            ValidatePawn(playerIndex, pawnIndex);

            if (relativePosition < LudoBoard.YardPosition || relativePosition > LudoBoard.HomePosition)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(relativePosition),
                    relativePosition,
                    $"Position must be between {LudoBoard.YardPosition} and {LudoBoard.HomePosition}.");
            }

            positions[playerIndex, pawnIndex] = relativePosition;
        }

        /// <summary>True when every pawn of the given player is home.</summary>
        public bool HasFinished(int playerIndex)
        {
            ValidatePlayer(playerIndex);

            for (int pawn = 0; pawn < LudoBoard.PawnsPerPlayer; pawn++)
            {
                if (!LudoBoard.IsHome(positions[playerIndex, pawn]))
                {
                    return false;
                }
            }

            return true;
        }

        /// <summary>Deep copy, used for undo snapshots and for AI look-ahead.</summary>
        public GameState Clone()
        {
            return new GameState(this);
        }

        private void ValidatePlayer(int playerIndex)
        {
            if (playerIndex < 0 || playerIndex >= players.Length)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(playerIndex),
                    playerIndex,
                    $"Seat must be between 0 and {players.Length - 1}.");
            }
        }

        private void ValidatePawn(int playerIndex, int pawnIndex)
        {
            ValidatePlayer(playerIndex);

            if (pawnIndex < 0 || pawnIndex >= LudoBoard.PawnsPerPlayer)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(pawnIndex),
                    pawnIndex,
                    $"Pawn must be between 0 and {LudoBoard.PawnsPerPlayer - 1}.");
            }
        }
    }
}
