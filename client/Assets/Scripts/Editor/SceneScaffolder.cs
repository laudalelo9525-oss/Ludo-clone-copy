using System.IO;
using LudoVerse.Core;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace LudoVerse.Editor
{
    /// <summary>
    /// Creates the three base scenes and registers them in the build settings.
    /// </summary>
    /// <remarks>
    /// Scene files are Unity-generated binaries-in-YAML, so they are produced
    /// here on first open rather than committed by hand. Running this twice is
    /// safe: existing scenes are left untouched.
    /// </remarks>
    public static class SceneScaffolder
    {
        private const string ScenesFolder = "Assets/Scenes";

        private static readonly string[] SceneOrder =
        {
            SceneNames.Boot,
            SceneNames.Lobby,
            SceneNames.Game,
        };

        [MenuItem("LudoVerse/Create Base Scenes", false, 0)]
        public static void CreateBaseScenes()
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
            {
                return;
            }

            Directory.CreateDirectory(ScenesFolder);

            foreach (string sceneName in SceneOrder)
            {
                CreateSceneIfMissing(sceneName);
            }

            AssetDatabase.Refresh();
            RegisterScenesInBuildSettings();

            Debug.Log($"LudoVerse: base scenes ready in {ScenesFolder}.");
        }

        private static void CreateSceneIfMissing(string sceneName)
        {
            string path = ScenePath(sceneName);
            if (File.Exists(path))
            {
                return;
            }

            Scene scene = EditorSceneManager.NewScene(
                NewSceneSetup.DefaultGameObjects,
                NewSceneMode.Single);

            if (sceneName == SceneNames.Boot)
            {
                new GameObject(nameof(GameBootstrap)).AddComponent<GameBootstrap>();
            }

            EditorSceneManager.SaveScene(scene, path);
        }

        private static void RegisterScenesInBuildSettings()
        {
            var scenes = new EditorBuildSettingsScene[SceneOrder.Length];
            for (int i = 0; i < SceneOrder.Length; i++)
            {
                scenes[i] = new EditorBuildSettingsScene(ScenePath(SceneOrder[i]), true);
            }

            EditorBuildSettings.scenes = scenes;
        }

        private static string ScenePath(string sceneName)
        {
            return $"{ScenesFolder}/{sceneName}.unity";
        }
    }
}
