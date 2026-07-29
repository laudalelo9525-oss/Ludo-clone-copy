using LudoVerse.Core;
using NUnit.Framework;
using UnityEngine;

namespace LudoVerse.Tests.EditMode
{
    public sealed class ServerEndpointsTests
    {
        private ServerEndpoints endpoints;

        [SetUp]
        public void SetUp()
        {
            endpoints = ScriptableObject.CreateInstance<ServerEndpoints>();
        }

        [TearDown]
        public void TearDown()
        {
            Object.DestroyImmediate(endpoints);
        }

        [Test]
        public void DefaultsPointAtTheLocalDockerStack()
        {
            Assert.AreEqual("http://localhost:3000", endpoints.RestBaseUrl);
            Assert.AreEqual("ws://localhost:2567", endpoints.ColyseusEndpoint);
        }

        [Test]
        public void HealthUrlDoesNotDoubleUpSlashes()
        {
            Assert.AreEqual("http://localhost:3000/health", endpoints.HealthUrl);
        }
    }
}
