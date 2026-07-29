namespace LudoVerse.Core
{
    /// <summary>
    /// Scene names shared by the bootstrapper, the editor scaffolding and any
    /// runtime code that changes scenes. Keeping them in one place avoids the
    /// magic strings that break silently when a scene is renamed.
    /// </summary>
    public static class SceneNames
    {
        /// <summary>First scene in the build; wires up services and moves on.</summary>
        public const string Boot = "Boot";

        /// <summary>Main menu, matchmaking entry point, shop and profile.</summary>
        public const string Lobby = "Lobby";

        /// <summary>The Ludo board itself, offline and online.</summary>
        public const string Game = "Game";
    }
}
