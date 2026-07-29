using System;
using LudoVerse.Gameplay;
using NUnit.Framework;

namespace LudoVerse.Tests.Gameplay
{
    public sealed class LudoGameTests
    {
        private static readonly PlayerColor[] TwoPlayers = { PlayerColor.Red, PlayerColor.Green };

        private static LudoGame NewGame(params int[] scriptedDice)
        {
            return new LudoGame(TwoPlayers, new QueuedDiceRoller(scriptedDice));
        }

        [Test]
        public void AMatchStartsWithEveryPawnInTheYard()
        {
            LudoGame game = NewGame();

            Assert.That(game.State.Phase, Is.EqualTo(GamePhase.WaitingForRoll));
            Assert.That(game.CurrentColor, Is.EqualTo(PlayerColor.Red));
            Assert.That(game.IsOver, Is.False);

            for (int pawn = 0; pawn < LudoBoard.PawnsPerPlayer; pawn++)
            {
                Assert.That(game.State.GetPawn(0, pawn), Is.EqualTo(LudoBoard.YardPosition));
            }
        }

        [Test]
        public void ATurnWithNoLegalMovePassesToTheNextPlayer()
        {
            LudoGame game = NewGame(3);

            game.Roll();

            Assert.That(game.State.CurrentPlayerIndex, Is.EqualTo(1));
            Assert.That(game.State.Phase, Is.EqualTo(GamePhase.WaitingForRoll));
            Assert.That(game.State.PendingDie, Is.EqualTo(0));
        }

        [Test]
        public void ASixReleasesAPawnAndGrantsAnotherRoll()
        {
            LudoGame game = NewGame(6);

            game.Roll();
            Assert.That(game.State.Phase, Is.EqualTo(GamePhase.WaitingForMove));
            Assert.That(game.LegalMoves, Has.Count.EqualTo(LudoBoard.PawnsPerPlayer));

            MoveResult result = game.MovePawn(0);

            Assert.That(game.State.GetPawn(0, 0), Is.EqualTo(0));
            Assert.That(result.GrantsExtraTurn, Is.True);
            Assert.That(game.State.CurrentPlayerIndex, Is.EqualTo(0), "a six keeps the turn");
            Assert.That(game.State.Phase, Is.EqualTo(GamePhase.WaitingForRoll));
        }

        [Test]
        public void AnOrdinaryMovePassesTheTurnOn()
        {
            LudoGame game = NewGame(4);
            game.State.SetPawn(0, 0, 10);

            game.Roll();
            MoveResult result = game.MovePawn(0);

            Assert.That(game.State.GetPawn(0, 0), Is.EqualTo(14));
            Assert.That(result.GrantsExtraTurn, Is.False);
            Assert.That(result.Captures, Is.Empty);
            Assert.That(game.State.CurrentPlayerIndex, Is.EqualTo(1));
        }

        [Test]
        public void LandingOnAnOpponentSendsItHomeAndGrantsAnotherRoll()
        {
            LudoGame game = NewGame(2);

            // Red 3 -> 5 lands on absolute cell 5, where Green 44 also stands.
            game.State.SetPawn(0, 0, 3);
            game.State.SetPawn(1, 0, 44);

            game.Roll();
            MoveResult result = game.MovePawn(0);

            Assert.That(result.Captures, Has.Count.EqualTo(1));
            Assert.That(result.Captures[0].PlayerIndex, Is.EqualTo(1));
            Assert.That(result.Captures[0].PawnIndex, Is.EqualTo(0));
            Assert.That(game.State.GetPawn(1, 0), Is.EqualTo(LudoBoard.YardPosition));
            Assert.That(result.GrantsExtraTurn, Is.True);
            Assert.That(game.State.CurrentPlayerIndex, Is.EqualTo(0));
        }

        [Test]
        public void PawnsOnSafeCellsCannotBeCaptured()
        {
            LudoGame game = NewGame(2);

            // Red 6 -> 8 is the starred cell 8; Green 47 sits on the same cell.
            game.State.SetPawn(0, 0, 6);
            game.State.SetPawn(1, 0, 47);

            game.Roll();
            MoveResult result = game.MovePawn(0);

            Assert.That(result.Captures, Is.Empty);
            Assert.That(game.State.GetPawn(1, 0), Is.EqualTo(47), "the Green pawn stays put");
            Assert.That(game.State.CurrentPlayerIndex, Is.EqualTo(1), "no capture, so no extra turn");
        }

        [Test]
        public void OwnPawnsAreNeverCaptured()
        {
            LudoGame game = NewGame(2);
            game.State.SetPawn(0, 0, 3);
            game.State.SetPawn(0, 1, 5);

            game.Roll();
            MoveResult result = game.MovePawn(0);

            Assert.That(result.Captures, Is.Empty);
            Assert.That(game.State.GetPawn(0, 1), Is.EqualTo(5));
        }

        [Test]
        public void ReachingHomeGrantsAnotherRoll()
        {
            LudoGame game = NewGame(2);
            game.State.SetPawn(0, 0, 55);
            game.State.SetPawn(0, 1, 10);

            game.Roll();
            MoveResult result = game.MovePawn(0);

            Assert.That(game.State.GetPawn(0, 0), Is.EqualTo(LudoBoard.HomePosition));
            Assert.That(result.Move.ReachesHome, Is.True);
            Assert.That(result.Wins, Is.False, "one pawn is still on the track");
            Assert.That(result.GrantsExtraTurn, Is.True);
            Assert.That(game.State.CurrentPlayerIndex, Is.EqualTo(0));
        }

        [Test]
        public void ThreeSixesInARowForfeitTheTurn()
        {
            LudoGame game = NewGame(6, 6, 6);

            game.Roll();
            game.MovePawn(0);
            game.Roll();
            game.MovePawn(1);
            game.Roll();

            Assert.That(game.State.ConsecutiveSixes, Is.EqualTo(0), "the counter resets with the turn");
            Assert.That(game.State.CurrentPlayerIndex, Is.EqualTo(1));
            Assert.That(game.State.Phase, Is.EqualTo(GamePhase.WaitingForRoll));
        }

        [Test]
        public void BringingTheLastPawnHomeWinsTheMatch()
        {
            LudoGame game = NewGame(2);
            game.State.SetPawn(0, 0, 55);
            game.State.SetPawn(0, 1, LudoBoard.HomePosition);
            game.State.SetPawn(0, 2, LudoBoard.HomePosition);
            game.State.SetPawn(0, 3, LudoBoard.HomePosition);

            game.Roll();
            MoveResult result = game.MovePawn(0);

            Assert.That(result.Wins, Is.True);
            Assert.That(result.GrantsExtraTurn, Is.False, "the match is over, there is no next roll");
            Assert.That(game.IsOver, Is.True);
            Assert.That(game.State.WinnerIndex, Is.EqualTo(0));
            Assert.That(game.State.Phase, Is.EqualTo(GamePhase.Finished));
        }

        [Test]
        public void MovingAPawnThatHasNoLegalMoveIsRejected()
        {
            LudoGame game = NewGame(6);
            game.State.SetPawn(0, 1, LudoBoard.HomePosition);

            game.Roll();

            Assert.That(() => game.MovePawn(1), Throws.TypeOf<InvalidOperationException>());
        }

        [Test]
        public void MovingBeforeRollingIsRejected()
        {
            LudoGame game = NewGame(6);

            Assert.That(() => game.MovePawn(0), Throws.TypeOf<InvalidOperationException>());
        }

        [Test]
        public void RollingTwiceWithoutMovingIsRejected()
        {
            LudoGame game = NewGame(6, 6);

            game.Roll();

            Assert.That(() => game.Roll(), Throws.TypeOf<InvalidOperationException>());
        }

        [Test]
        public void UndoRewindsTheLastMoveAndThenTheRoll()
        {
            LudoGame game = NewGame(6);

            game.Roll();
            game.MovePawn(0);
            Assert.That(game.State.GetPawn(0, 0), Is.EqualTo(0));

            game.Undo();

            Assert.That(game.State.GetPawn(0, 0), Is.EqualTo(LudoBoard.YardPosition));
            Assert.That(game.State.Phase, Is.EqualTo(GamePhase.WaitingForMove));
            Assert.That(game.LegalMoves, Has.Count.EqualTo(LudoBoard.PawnsPerPlayer), "moves are recomputed");

            game.Undo();

            Assert.That(game.State.Phase, Is.EqualTo(GamePhase.WaitingForRoll));
            Assert.That(game.State.PendingDie, Is.EqualTo(0));
            Assert.That(game.CanUndo, Is.False);
        }

        [Test]
        public void UndoRestoresACapturedPawn()
        {
            LudoGame game = NewGame(2);
            game.State.SetPawn(0, 0, 3);
            game.State.SetPawn(1, 0, 44);

            game.Roll();
            game.MovePawn(0);
            Assert.That(game.State.GetPawn(1, 0), Is.EqualTo(LudoBoard.YardPosition));

            game.Undo();

            Assert.That(game.State.GetPawn(1, 0), Is.EqualTo(44));
            Assert.That(game.State.GetPawn(0, 0), Is.EqualTo(3));
        }

        [Test]
        public void OnlineMatchesCanDisableUndoEntirely()
        {
            var game = new LudoGame(TwoPlayers, new QueuedDiceRoller(6), undoDepth: 0);

            game.Roll();

            Assert.That(game.CanUndo, Is.False);
            Assert.That(() => game.Undo(), Throws.TypeOf<InvalidOperationException>());
        }

        [Test]
        public void UndoHistoryStaysBounded()
        {
            var game = new LudoGame(TwoPlayers, new QueuedDiceRoller(3, 3, 3, 3, 3, 3), undoDepth: 2);

            for (int i = 0; i < 6; i++)
            {
                game.Roll();
            }

            game.Undo();
            game.Undo();

            Assert.That(game.CanUndo, Is.False, "only the two most recent snapshots are kept");
        }

        [Test]
        public void SeededDiceAreReproducible()
        {
            var first = new SeededDiceRoller(1234);
            var second = new SeededDiceRoller(1234);

            for (int i = 0; i < 50; i++)
            {
                int value = first.Roll();
                Assert.That(value, Is.InRange(1, 6));
                Assert.That(second.Roll(), Is.EqualTo(value));
            }
        }
    }
}
