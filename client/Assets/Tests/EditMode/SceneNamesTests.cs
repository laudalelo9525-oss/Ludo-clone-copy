using LudoVerse.Core;
using NUnit.Framework;

namespace LudoVerse.Tests.EditMode
{
    public sealed class SceneNamesTests
    {
        [Test]
        public void SceneNamesAreDistinct()
        {
            Assert.AreNotEqual(SceneNames.Boot, SceneNames.Lobby);
            Assert.AreNotEqual(SceneNames.Lobby, SceneNames.Game);
            Assert.AreNotEqual(SceneNames.Boot, SceneNames.Game);
        }
    }
}
