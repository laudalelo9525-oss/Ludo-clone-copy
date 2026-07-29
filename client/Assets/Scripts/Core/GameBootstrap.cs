using UnityEngine;
using UnityEngine.SceneManagement;

namespace LudoVerse.Core
{
    /// <summary>
    /// Entry point of the application. Lives on a single GameObject in the Boot
    /// scene, applies device-level settings, then hands over to the Lobby.
    /// </summary>
    /// <remarks>
    /// Service registration (VContainer), Firebase initialisation and the
    /// Colyseus connection are added in Phase 3; this class only owns the
    /// startup sequence so later phases have one place to plug into.
    /// </remarks>
    [DisallowMultipleComponent]
    [AddComponentMenu("LudoVerse/Game Bootstrap")]
    public sealed class GameBootstrap : MonoBehaviour
    {
        [Tooltip("Endpoints for the environment this build targets.")]
        [SerializeField]
        private ServerEndpoints endpoints;

        [Tooltip("Frame rate the client aims for; 120 on capable devices.")]
        [SerializeField]
        private int targetFrameRate = 120;

        [Tooltip("Scene loaded once startup finishes.")]
        [SerializeField]
        private string nextScene = SceneNames.Lobby;

        private void Awake()
        {
            DontDestroyOnLoad(gameObject);
            ApplyPerformanceSettings();
        }

        private void Start()
        {
            if (endpoints == null)
            {
                Debug.LogWarning(
                    $"{nameof(GameBootstrap)} has no {nameof(ServerEndpoints)} assigned; " +
                    "online features will be unavailable.",
                    this);
            }

            LoadNextScene();
        }

        private void ApplyPerformanceSettings()
        {
            // vSync must be off for targetFrameRate to take effect.
            QualitySettings.vSyncCount = 0;
            Application.targetFrameRate = targetFrameRate;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
        }

        private void LoadNextScene()
        {
            if (string.IsNullOrWhiteSpace(nextScene))
            {
                Debug.LogError($"{nameof(GameBootstrap)} has no next scene configured.", this);
                return;
            }

            // LoadSceneAsync returns null when the scene is missing from the
            // build settings, which is the usual state of a fresh clone.
            AsyncOperation load = SceneManager.LoadSceneAsync(nextScene, LoadSceneMode.Single);
            if (load == null)
            {
                Debug.LogError(
                    $"Scene '{nextScene}' could not be loaded; it is probably missing from " +
                    "the build settings. Run LudoVerse > Create Base Scenes from the Unity menu.",
                    this);
            }
        }
    }
}
