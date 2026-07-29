using System.Collections.Generic;
using System.Linq;
using LudoVerse.Gameplay;
using NUnit.Framework;

namespace LudoVerse.Tests.Gameplay
{
    public sealed class LudoBoardTests
    {
        [Test]
        public void StartCellsAreEvenlySpacedAroundTheTrack()
        {
            Assert.That(LudoBoard.StartCell(PlayerColor.Red), Is.EqualTo(0));
            Assert.That(LudoBoard.StartCell(PlayerColor.Green), Is.EqualTo(13));
            Assert.That(LudoBoard.StartCell(PlayerColor.Yellow), Is.EqualTo(26));
            Assert.That(LudoBoard.StartCell(PlayerColor.Blue), Is.EqualTo(39));
        }

        [Test]
        public void APawnTravels57StepsFromItsStartCellToHome()
        {
            Assert.That(LudoBoard.HomePosition, Is.EqualTo(57));
            Assert.That(LudoBoard.HomeColumnEntry, Is.EqualTo(52));
        }

        [Test]
        public void AbsolutePositionsWrapAroundTheTrack()
        {
            // Green starts at 13, so 44 steps later it is back round past zero.
            Assert.That(LudoBoard.ToAbsolute(PlayerColor.Green, 0), Is.EqualTo(13));
            Assert.That(LudoBoard.ToAbsolute(PlayerColor.Green, 44), Is.EqualTo(5));
            Assert.That(LudoBoard.ToAbsolute(PlayerColor.Red, 51), Is.EqualTo(51));
        }

        [Test]
        public void EveryStartCellIsSafe()
        {
            foreach (PlayerColor color in new[]
                     {
                         PlayerColor.Red, PlayerColor.Green, PlayerColor.Yellow, PlayerColor.Blue,
                     })
            {
                Assert.That(LudoBoard.IsSafeCell(LudoBoard.StartCell(color)), Is.True, $"{color} start cell");
            }
        }

        [Test]
        public void ThereAreEightSafeCells()
        {
            List<int> safeCells = LudoBoard.GetSafeCells().ToList();

            Assert.That(safeCells, Has.Count.EqualTo(8));
            Assert.That(safeCells, Is.EquivalentTo(new[] { 0, 8, 13, 21, 26, 34, 39, 47 }));
        }

        [Test]
        public void OrdinaryCellsAreNotSafe()
        {
            Assert.That(LudoBoard.IsSafeCell(5), Is.False);
            Assert.That(LudoBoard.IsSafeCell(51), Is.False);
        }

        [Test]
        public void PositionsAreClassifiedByRegion()
        {
            Assert.That(LudoBoard.IsInYard(LudoBoard.YardPosition), Is.True);
            Assert.That(LudoBoard.IsOnMainTrack(0), Is.True);
            Assert.That(LudoBoard.IsOnMainTrack(51), Is.True);
            Assert.That(LudoBoard.IsOnMainTrack(52), Is.False);
            Assert.That(LudoBoard.IsInHomeColumn(52), Is.True);
            Assert.That(LudoBoard.IsInHomeColumn(57), Is.True);
            Assert.That(LudoBoard.IsHome(57), Is.True);
            Assert.That(LudoBoard.IsHome(56), Is.False);
        }
    }
}
