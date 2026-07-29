using System.Collections.Generic;
using LudoVerse.Gameplay;
using LudoVerse.Gameplay.AI;
using NUnit.Framework;

namespace LudoVerse.Tests.Gameplay
{
    public sealed class LudoAiTests
    {
        private static readonly PlayerColor[] TwoPlayers = { PlayerColor.Red, PlayerColor.Green };

        [Test]
        public void TheFactoryBuildsEachDifficulty()
        {
            Assert.That(LudoAiFactory.Create(AiDifficulty.Easy).Difficulty, Is.EqualTo(AiDifficulty.Easy));
            Assert.That(LudoAiFactory.Create(AiDifficulty.Medium).Difficulty, Is.EqualTo(AiDifficulty.Medium));
            Assert.That(LudoAiFactory.Create(AiDifficulty.Hard).Difficulty, Is.EqualTo(AiDifficulty.Hard));
        }

        [Test]
        public void EasyAlwaysPicksALegalMoveAndReplaysIdentically()
        {
            var first = new RandomAi(99);
            var second = new RandomAi(99);
            var state = new GameState(TwoPlayers);
            IReadOnlyList<Move> moves = MoveGenerator.GetLegalMoves(state, 0, 6);

            for (int i = 0; i < 20; i++)
            {
                Move chosen = first.ChooseMove(state, 0, moves);

                Assert.That(moves, Contains.Item(chosen));
                Assert.That(second.ChooseMove(state, 0, moves).PawnIndex, Is.EqualTo(chosen.PawnIndex));
            }
        }

        [Test]
        public void EveryDifficultyPrefersACaptureOverAPlainAdvance()
        {
            foreach (AiDifficulty difficulty in new[] { AiDifficulty.Medium, AiDifficulty.Hard })
            {
                var state = new GameState(TwoPlayers);

                // Pawn 0 can take the Green pawn on absolute 5; pawn 1 can only
                // walk further up the track.
                state.SetPawn(0, 0, 3);
                state.SetPawn(0, 1, 30);
                state.SetPawn(1, 0, 44);

                ILudoAi ai = LudoAiFactory.Create(difficulty);
                Move chosen = ai.ChooseMove(state, 0, MoveGenerator.GetLegalMoves(state, 0, 2));

                Assert.That(chosen.PawnIndex, Is.EqualTo(0), $"{difficulty} should take the capture");
            }
        }

        [Test]
        public void EveryDifficultyBringsAPawnHomeWhenItCan()
        {
            foreach (AiDifficulty difficulty in new[] { AiDifficulty.Medium, AiDifficulty.Hard })
            {
                var state = new GameState(TwoPlayers);
                state.SetPawn(0, 0, 55);
                state.SetPawn(0, 1, 20);

                ILudoAi ai = LudoAiFactory.Create(difficulty);
                Move chosen = ai.ChooseMove(state, 0, MoveGenerator.GetLegalMoves(state, 0, 2));

                Assert.That(chosen.ReachesHome, Is.True, $"{difficulty} should finish the pawn");
            }
        }

        [Test]
        public void HardAvoidsDangerWhereMediumWalksIntoIt()
        {
            // Pawn 0 -> 23 is the longer advance but lands three cells in front
            // of the Green pawn on absolute 20. Pawn 1 -> 13 is shorter and lands
            // on a starred cell.
            GameState Position()
            {
                var state = new GameState(TwoPlayers);
                state.SetPawn(0, 0, 19);
                state.SetPawn(0, 1, 9);
                state.SetPawn(1, 0, 7);
                return state;
            }

            GameState hardState = Position();
            Move hardChoice = LudoAiFactory.Create(AiDifficulty.Hard)
                .ChooseMove(hardState, 0, MoveGenerator.GetLegalMoves(hardState, 0, 4));

            GameState mediumState = Position();
            Move mediumChoice = LudoAiFactory.Create(AiDifficulty.Medium)
                .ChooseMove(mediumState, 0, MoveGenerator.GetLegalMoves(mediumState, 0, 4));

            Assert.That(hardChoice.PawnIndex, Is.EqualTo(1), "Hard should step onto the safe cell");
            Assert.That(mediumChoice.PawnIndex, Is.EqualTo(0), "Medium is blind to the threat");
        }

        [Test]
        public void HardMovesAPawnThatIsAlreadyUnderThreat()
        {
            var state = new GameState(TwoPlayers);

            // Pawn 0 on absolute 10 is two cells in front of the Green pawn;
            // pawn 1 idles out of reach, and neither destination is starred.
            state.SetPawn(0, 0, 10);
            state.SetPawn(0, 1, 28);
            state.SetPawn(1, 0, 47);

            Assert.That(BoardQuery.IsUnderThreat(state, 0, 10), Is.True, "test setup");

            Move chosen = LudoAiFactory.Create(AiDifficulty.Hard)
                .ChooseMove(state, 0, MoveGenerator.GetLegalMoves(state, 0, 4));

            Assert.That(chosen.PawnIndex, Is.EqualTo(0));
        }

        [Test]
        public void HardFleesRatherThanParkingAnotherPawnOnASafeCell()
        {
            var state = new GameState(TwoPlayers);

            // Pawn 0 is hunted on absolute 10. Pawn 1 could step onto the
            // starred cell 34 instead, which protects the wrong pawn.
            state.SetPawn(0, 0, 10);
            state.SetPawn(0, 1, 30);
            state.SetPawn(1, 0, 47);

            Move chosen = LudoAiFactory.Create(AiDifficulty.Hard)
                .ChooseMove(state, 0, MoveGenerator.GetLegalMoves(state, 0, 4));

            Assert.That(chosen.PawnIndex, Is.EqualTo(0), "the threatened pawn should move");
        }

        [Test]
        public void AnAiOnlyEverReturnsAMoveItWasOffered()
        {
            foreach (AiDifficulty difficulty in new[]
                     {
                         AiDifficulty.Easy, AiDifficulty.Medium, AiDifficulty.Hard,
                     })
            {
                var state = new GameState(TwoPlayers);
                state.SetPawn(0, 0, 12);
                state.SetPawn(0, 1, 30);
                state.SetPawn(0, 2, 51);

                IReadOnlyList<Move> moves = MoveGenerator.GetLegalMoves(state, 0, 4);
                Move chosen = LudoAiFactory.Create(difficulty, 7).ChooseMove(state, 0, moves);

                Assert.That(moves, Contains.Item(chosen), difficulty.ToString());
            }
        }

        [Test]
        public void AnAiRefusesToMoveWhenNothingIsLegal()
        {
            var state = new GameState(TwoPlayers);
            var empty = new Move[0];

            Assert.That(
                () => LudoAiFactory.Create(AiDifficulty.Hard).ChooseMove(state, 0, empty),
                Throws.ArgumentException);
        }

        [Test]
        public void TwoAiOpponentsPlayAMatchToCompletion()
        {
            const int maxTurns = 5000;

            var game = new LudoGame(TwoPlayers, new SeededDiceRoller(2024), undoDepth: 0);
            ILudoAi[] opponents =
            {
                LudoAiFactory.Create(AiDifficulty.Hard),
                LudoAiFactory.Create(AiDifficulty.Medium),
            };

            int turns = 0;
            while (!game.IsOver && turns < maxTurns)
            {
                AiTurnPlayer.PlayTurn(game, opponents[game.State.CurrentPlayerIndex]);
                turns++;
            }

            Assert.That(game.IsOver, Is.True, $"no winner after {maxTurns} turns");
            Assert.That(game.State.WinnerIndex, Is.AnyOf(0, 1));
            Assert.That(game.State.HasFinished(game.State.WinnerIndex), Is.True);
        }

        [Test]
        public void HardBeatsEasyOverAMatchSeries()
        {
            const int matches = 20;
            int hardWins = 0;

            for (int seed = 0; seed < matches; seed++)
            {
                var game = new LudoGame(TwoPlayers, new SeededDiceRoller(seed), undoDepth: 0);
                ILudoAi[] opponents =
                {
                    LudoAiFactory.Create(AiDifficulty.Hard),
                    LudoAiFactory.Create(AiDifficulty.Easy, seed),
                };

                int turns = 0;
                while (!game.IsOver && turns < 5000)
                {
                    AiTurnPlayer.PlayTurn(game, opponents[game.State.CurrentPlayerIndex]);
                    turns++;
                }

                if (game.State.WinnerIndex == 0)
                {
                    hardWins++;
                }
            }

            // Ludo is dice-driven, so this asserts a clear edge rather than
            // dominance; it is here to catch a difficulty ladder wired backwards.
            Assert.That(hardWins, Is.GreaterThan(matches / 2), $"Hard won {hardWins} of {matches}");
        }
    }
}
