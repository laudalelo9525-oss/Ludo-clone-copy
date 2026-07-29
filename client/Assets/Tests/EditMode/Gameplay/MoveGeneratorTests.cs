using System.Collections.Generic;
using LudoVerse.Gameplay;
using NUnit.Framework;

namespace LudoVerse.Tests.Gameplay
{
    public sealed class MoveGeneratorTests
    {
        private static GameState NewState()
        {
            return new GameState(new[] { PlayerColor.Red, PlayerColor.Green });
        }

        [Test]
        public void PawnsLeaveTheYardOnlyOnASix()
        {
            GameState state = NewState();

            Assert.That(MoveGenerator.GetLegalMoves(state, 0, 5), Is.Empty);

            IReadOnlyList<Move> onASix = MoveGenerator.GetLegalMoves(state, 0, 6);

            Assert.That(onASix, Has.Count.EqualTo(LudoBoard.PawnsPerPlayer));
            Assert.That(onASix[0].To, Is.EqualTo(0));
            Assert.That(onASix[0].LeavesYard, Is.True);
        }

        [Test]
        public void APawnOnTheTrackAdvancesByTheDieValue()
        {
            GameState state = NewState();
            state.SetPawn(0, 0, 10);

            IReadOnlyList<Move> moves = MoveGenerator.GetLegalMoves(state, 0, 3);

            Assert.That(moves, Has.Count.EqualTo(1));
            Assert.That(moves[0].PawnIndex, Is.EqualTo(0));
            Assert.That(moves[0].To, Is.EqualTo(13));
        }

        [Test]
        public void HomeMustBeReachedExactly()
        {
            GameState state = NewState();
            state.SetPawn(0, 0, 55);

            Assert.That(MoveGenerator.GetLegalMoves(state, 0, 3), Is.Empty, "an overshoot is not a move");

            IReadOnlyList<Move> exact = MoveGenerator.GetLegalMoves(state, 0, 2);

            Assert.That(exact, Has.Count.EqualTo(1));
            Assert.That(exact[0].To, Is.EqualTo(LudoBoard.HomePosition));
            Assert.That(exact[0].ReachesHome, Is.True);
        }

        [Test]
        public void PawnsAtHomeNeverMoveAgain()
        {
            GameState state = NewState();
            state.SetPawn(0, 0, LudoBoard.HomePosition);

            Assert.That(MoveGenerator.GetLegalMoves(state, 0, 6), Has.Count.EqualTo(3), "only the yard pawns");
        }

        [Test]
        public void ADieOutsideOneToSixIsRejected()
        {
            GameState state = NewState();

            Assert.That(() => MoveGenerator.GetLegalMoves(state, 0, 0), Throws.TypeOf<System.ArgumentOutOfRangeException>());
            Assert.That(() => MoveGenerator.GetLegalMoves(state, 0, 7), Throws.TypeOf<System.ArgumentOutOfRangeException>());
        }
    }
}
