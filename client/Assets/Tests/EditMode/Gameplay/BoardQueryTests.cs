using LudoVerse.Gameplay;
using NUnit.Framework;

namespace LudoVerse.Tests.Gameplay
{
    public sealed class BoardQueryTests
    {
        private static GameState NewState()
        {
            return new GameState(new[] { PlayerColor.Red, PlayerColor.Green });
        }

        [Test]
        public void AnOpponentWithinSixCellsBehindIsAThreat()
        {
            GameState state = NewState();

            // Green at relative 40 stands on absolute 1, three behind absolute 4.
            state.SetPawn(1, 0, 40);

            Assert.That(BoardQuery.CountThreats(state, 0, 4), Is.EqualTo(1));
        }

        [Test]
        public void AnOpponentSevenOrMoreCellsBehindIsNotAThreat()
        {
            GameState state = NewState();
            state.SetPawn(1, 0, 40);

            Assert.That(BoardQuery.IsUnderThreat(state, 0, 8 + 1), Is.False);
        }

        [Test]
        public void AnOpponentAboutToTurnIntoItsHomeColumnCannotReach()
        {
            GameState state = NewState();

            // Green at relative 50 sits on absolute 11, three behind absolute 14,
            // but moving three would take it past the end of the main track.
            state.SetPawn(1, 0, 50);

            Assert.That(BoardQuery.IsUnderThreat(state, 0, 14), Is.False);
        }

        [Test]
        public void SafeCellsAreNeverUnderThreat()
        {
            GameState state = NewState();

            // Green at relative 47 stands on absolute 8 minus five; the target
            // cell 8 is starred, so it cannot be taken.
            state.SetPawn(1, 0, 43);

            Assert.That(BoardQuery.IsUnderThreat(state, 0, 8), Is.False);
        }

        [Test]
        public void HomeColumnCellsAreNeverUnderThreat()
        {
            GameState state = NewState();
            state.SetPawn(1, 0, 40);

            Assert.That(BoardQuery.IsUnderThreat(state, 0, LudoBoard.HomeColumnEntry), Is.False);
        }

        [Test]
        public void CapturableOpponentsAreReportedWithoutMovingAnything()
        {
            GameState state = NewState();
            state.SetPawn(1, 0, 44);

            var capturable = BoardQuery.GetCapturableOpponents(state, 0, 5);

            Assert.That(capturable, Has.Count.EqualTo(1));
            Assert.That(capturable[0].PlayerIndex, Is.EqualTo(1));
            Assert.That(state.GetPawn(1, 0), Is.EqualTo(44), "the query must not mutate the board");
        }

        [Test]
        public void PawnsOnSafeCellsAreNotCapturable()
        {
            GameState state = NewState();
            state.SetPawn(1, 0, 47);

            Assert.That(BoardQuery.GetCapturableOpponents(state, 0, 8), Is.Empty);
        }
    }
}
