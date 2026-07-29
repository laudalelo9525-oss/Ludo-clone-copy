using System;
using System.Collections.Generic;

namespace LudoVerse.Gameplay
{
    /// <summary>
    /// The offline rules engine: the turn state machine, capture and extra-turn
    /// rules, win detection and undo.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Deliberately free of any engine type, so the same code drives offline
    /// play in the Unity client and the Phase 6 AI opponent, and can be tested
    /// without an Editor. Presentation reacts to <see cref="MoveResult"/>; it is
    /// never consulted.
    /// </para>
    /// <para>
    /// This is <em>not</em> the authoritative implementation for online play:
    /// the game server is TypeScript (Issue 3.4) and validates moves itself.
    /// The two must agree, so the shared constants live in <c>shared/</c>.
    /// </para>
    /// <para>Rules implemented, matching the Classic mode in the blueprint:</para>
    /// <list type="bullet">
    /// <item><description>A six releases a pawn from the yard.</description></item>
    /// <item><description>Landing on an opponent outside a safe cell sends it home.</description></item>
    /// <item><description>A six, a capture, or reaching home grants another roll.</description></item>
    /// <item><description>Three sixes in a row forfeit the turn.</description></item>
    /// <item><description>Home must be reached with an exact roll.</description></item>
    /// <item><description>The first player to bring all four pawns home wins.</description></item>
    /// </list>
    /// <para>
    /// Blocks (two pawns of one colour barring a cell) are a Custom Rules
    /// option and are not part of Classic here.
    /// </para>
    /// </remarks>
    public sealed class LudoGame
    {
        /// <summary>Sixes in a row that forfeit the turn.</summary>
        public const int ConsecutiveSixesLimit = 3;

        private static readonly IReadOnlyList<Move> NoMoves = new Move[0];

        private readonly IDiceRoller dice;

        /// <summary>Snapshots oldest-first; the last entry is the most recent.</summary>
        private readonly List<GameState> history;

        private readonly int undoDepth;

        private IReadOnlyList<Move> legalMoves;

        /// <param name="players">Seats in turn order.</param>
        /// <param name="dice">Die source; injected so tests and the server can control it.</param>
        /// <param name="undoDepth">
        /// How many steps <see cref="Undo"/> can rewind. Zero disables undo,
        /// which is what online matches use (Issue 2.6 is offline only).
        /// </param>
        public LudoGame(IReadOnlyList<PlayerColor> players, IDiceRoller dice, int undoDepth = 32)
        {
            if (undoDepth < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(undoDepth), undoDepth, "Undo depth cannot be negative.");
            }

            this.dice = dice ?? throw new ArgumentNullException(nameof(dice));
            this.undoDepth = undoDepth;

            State = new GameState(players);
            history = new List<GameState>();
            legalMoves = NoMoves;
        }

        /// <summary>Current match state.</summary>
        public GameState State { get; private set; }

        /// <summary>Moves available for the pending die; empty outside <see cref="GamePhase.WaitingForMove"/>.</summary>
        public IReadOnlyList<Move> LegalMoves
        {
            get { return legalMoves; }
        }

        /// <summary>Colour whose turn it is.</summary>
        public PlayerColor CurrentColor
        {
            get { return State.CurrentColor; }
        }

        /// <summary>True once a player has brought all four pawns home.</summary>
        public bool IsOver
        {
            get { return State.Phase == GamePhase.Finished; }
        }

        /// <summary>True when there is a snapshot to rewind to.</summary>
        public bool CanUndo
        {
            get { return history.Count > 0; }
        }

        /// <summary>
        /// Rolls for the current player and moves the state machine on: to
        /// <see cref="GamePhase.WaitingForMove"/> when something can move,
        /// otherwise straight to the next player.
        /// </summary>
        /// <returns>The die value that was rolled.</returns>
        public int Roll()
        {
            RequirePhase(GamePhase.WaitingForRoll);
            PushHistory();

            int die = dice.Roll();
            if (die < 1 || die > 6)
            {
                throw new InvalidOperationException($"Dice roller returned {die}; a die shows 1..6.");
            }

            State.PendingDie = die;
            State.ConsecutiveSixes = die == LudoBoard.YardExitRoll ? State.ConsecutiveSixes + 1 : 0;

            if (State.ConsecutiveSixes >= ConsecutiveSixesLimit)
            {
                EndTurn();
                return die;
            }

            IReadOnlyList<Move> moves = MoveGenerator.GetLegalMoves(State, State.CurrentPlayerIndex, die);
            if (moves.Count == 0)
            {
                EndTurn();
                return die;
            }

            legalMoves = moves;
            State.Phase = GamePhase.WaitingForMove;
            return die;
        }

        /// <summary>
        /// Applies the pending die to one of the current player's pawns.
        /// </summary>
        /// <exception cref="InvalidOperationException">
        /// The phase is wrong, or that pawn cannot legally move.
        /// </exception>
        public MoveResult MovePawn(int pawnIndex)
        {
            RequirePhase(GamePhase.WaitingForMove);

            if (!TryFindLegalMove(pawnIndex, out Move move))
            {
                throw new InvalidOperationException(
                    $"Pawn {pawnIndex} has no legal move for a {State.PendingDie}.");
            }

            PushHistory();

            int player = State.CurrentPlayerIndex;
            State.SetPawn(player, move.PawnIndex, move.To);

            IReadOnlyList<CapturedPawn> captures = ResolveCaptures(player, move.To);
            bool wins = State.HasFinished(player);
            bool rolledSix = State.PendingDie == LudoBoard.YardExitRoll;
            bool extraTurn = rolledSix || captures.Count > 0 || move.ReachesHome;

            var result = new MoveResult(move, captures, extraTurn && !wins, wins);

            if (wins)
            {
                State.WinnerIndex = player;
                State.Phase = GamePhase.Finished;
                State.PendingDie = 0;
                legalMoves = NoMoves;
                return result;
            }

            if (extraTurn)
            {
                // The six counter carries over, so three sixes still forfeit.
                State.PendingDie = 0;
                State.Phase = GamePhase.WaitingForRoll;
                legalMoves = NoMoves;
                return result;
            }

            EndTurn();
            return result;
        }

        /// <summary>
        /// Rewinds the last roll or move. Offline only — see Issue 2.6.
        /// </summary>
        /// <exception cref="InvalidOperationException">Nothing left to undo.</exception>
        public void Undo()
        {
            if (!CanUndo)
            {
                throw new InvalidOperationException("There is nothing to undo.");
            }

            int last = history.Count - 1;
            State = history[last];
            history.RemoveAt(last);

            legalMoves = State.Phase == GamePhase.WaitingForMove
                ? MoveGenerator.GetLegalMoves(State, State.CurrentPlayerIndex, State.PendingDie)
                : NoMoves;
        }

        /// <summary>Sends every opponent pawn sharing the target cell back to its yard.</summary>
        private IReadOnlyList<CapturedPawn> ResolveCaptures(int movingPlayer, int landedOn)
        {
            IReadOnlyList<CapturedPawn> captured =
                BoardQuery.GetCapturableOpponents(State, movingPlayer, landedOn);

            for (int i = 0; i < captured.Count; i++)
            {
                State.SetPawn(captured[i].PlayerIndex, captured[i].PawnIndex, LudoBoard.YardPosition);
            }

            return captured;
        }

        private bool TryFindLegalMove(int pawnIndex, out Move move)
        {
            for (int i = 0; i < legalMoves.Count; i++)
            {
                if (legalMoves[i].PawnIndex == pawnIndex)
                {
                    move = legalMoves[i];
                    return true;
                }
            }

            move = default;
            return false;
        }

        private void EndTurn()
        {
            State.PendingDie = 0;
            State.ConsecutiveSixes = 0;
            State.CurrentPlayerIndex = (State.CurrentPlayerIndex + 1) % State.PlayerCount;
            State.Phase = GamePhase.WaitingForRoll;
            legalMoves = NoMoves;
        }

        private void PushHistory()
        {
            if (undoDepth == 0)
            {
                return;
            }

            if (history.Count >= undoDepth)
            {
                // Drop the oldest snapshot so the history stays bounded.
                history.RemoveAt(0);
            }

            history.Add(State.Clone());
        }

        private void RequirePhase(GamePhase expected)
        {
            if (State.Phase != expected)
            {
                throw new InvalidOperationException(
                    $"Expected phase {expected} but the match is in {State.Phase}.");
            }
        }
    }
}
