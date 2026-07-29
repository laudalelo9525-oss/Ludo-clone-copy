// Compiled only outside Unity: it reads a file from the repository and uses
// System.Text.Json, neither of which the Editor test run can rely on. CI is
// where drift between the two engines has to be caught anyway.
#if !UNITY_5_3_OR_NEWER

using System.Collections.Generic;
using System.IO;
using System.Runtime.CompilerServices;
using System.Text.Json;
using LudoVerse.Gameplay;
using NUnit.Framework;

namespace LudoVerse.Tests.Gameplay
{
    /// <summary>
    /// Pins this engine to <c>shared/board-constants.json</c>.
    /// </summary>
    /// <remarks>
    /// The authoritative server implements the same rules in TypeScript and is
    /// pinned to the same file. When this fails, one of the two engines has
    /// drifted and the client would predict moves the server rejects.
    /// </remarks>
    public sealed class BoardContractTests
    {
        private static JsonElement contract;

        [OneTimeSetUp]
        public void LoadContract()
        {
            string path = ContractPath();

            if (!File.Exists(path))
            {
                Assert.Ignore($"Shared board contract not found at {path}.");
            }

            contract = JsonDocument.Parse(File.ReadAllText(path)).RootElement;
        }

        [Test]
        public void BoardConstantsMatchTheSharedContract()
        {
            Assert.That(LudoBoard.MainTrackLength, Is.EqualTo(Int("mainTrackLength")));
            Assert.That(LudoBoard.HomeColumnLength, Is.EqualTo(Int("homeColumnLength")));
            Assert.That(LudoBoard.PawnsPerPlayer, Is.EqualTo(Int("pawnsPerPlayer")));
            Assert.That(LudoBoard.YardPosition, Is.EqualTo(Int("yardPosition")));
            Assert.That(LudoBoard.HomeColumnEntry, Is.EqualTo(Int("homeColumnEntry")));
            Assert.That(LudoBoard.HomePosition, Is.EqualTo(Int("homePosition")));
            Assert.That(LudoBoard.YardExitRoll, Is.EqualTo(Int("yardExitRoll")));
            Assert.That(LudoGame.ConsecutiveSixesLimit, Is.EqualTo(Int("consecutiveSixesLimit")));
        }

        [Test]
        public void SafeCellsMatchTheSharedContract()
        {
            var expected = new List<int>();
            foreach (JsonElement cell in contract.GetProperty("safeCells").EnumerateArray())
            {
                expected.Add(cell.GetInt32());
            }

            Assert.That(LudoBoard.GetSafeCells(), Is.EquivalentTo(expected));
        }

        [Test]
        public void SeatOrderMatchesTheSharedContract()
        {
            var expected = new List<string>();
            foreach (JsonElement seat in contract.GetProperty("seatOrder").EnumerateArray())
            {
                expected.Add(seat.GetString());
            }

            Assert.That(expected, Has.Count.EqualTo(4));

            for (int seat = 0; seat < expected.Count; seat++)
            {
                Assert.That(((PlayerColor)seat).ToString(), Is.EqualTo(expected[seat]));
                Assert.That(
                    LudoBoard.StartCell((PlayerColor)seat),
                    Is.EqualTo(seat * Int("seatSpacing")));
            }
        }

        private static int Int(string property)
        {
            return contract.GetProperty(property).GetInt32();
        }

        /// <summary>Locates the repository from this source file's compile-time path.</summary>
        private static string ContractPath([CallerFilePath] string sourcePath = "")
        {
            string directory = Path.GetDirectoryName(sourcePath);

            // client/Assets/Tests/EditMode/Gameplay -> repository root
            return Path.GetFullPath(
                Path.Combine(directory, "..", "..", "..", "..", "..", "shared", "board-constants.json"));
        }
    }
}

#endif
