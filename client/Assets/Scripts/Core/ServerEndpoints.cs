using UnityEngine;

namespace LudoVerse.Core
{
    /// <summary>
    /// Backend addresses for one environment. Create one asset per environment
    /// (Local, Staging, Production) under <c>Assets/Settings/</c> and reference
    /// the active one from <see cref="GameBootstrap"/>.
    /// </summary>
    /// <remarks>
    /// The REST gateway and the Colyseus realtime server are separate ports; see
    /// <c>docs/STRUCTURE.md</c>. Defaults match <c>docker/docker-compose.yml</c>.
    /// </remarks>
    [CreateAssetMenu(
        fileName = "ServerEndpoints",
        menuName = "LudoVerse/Server Endpoints",
        order = 0)]
    public sealed class ServerEndpoints : ScriptableObject
    {
        [Header("NestJS REST gateway")]
        [SerializeField]
        private string restBaseUrl = "http://localhost:3000";

        [Header("Colyseus realtime server")]
        [SerializeField]
        private string colyseusEndpoint = "ws://localhost:2567";

        /// <summary>Base URL for auth, matchmaking, economy and profile calls.</summary>
        public string RestBaseUrl => restBaseUrl;

        /// <summary>WebSocket endpoint used by the Colyseus client to join rooms.</summary>
        public string ColyseusEndpoint => colyseusEndpoint;

        /// <summary>Liveness endpoint exposed by the gateway.</summary>
        public string HealthUrl => $"{restBaseUrl.TrimEnd('/')}/health";
    }
}
