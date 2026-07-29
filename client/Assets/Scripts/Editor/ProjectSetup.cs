using UnityEditor;
using UnityEngine;

namespace LudoVerse.Editor
{
    /// <summary>
    /// Applies the project-wide player settings the blueprint calls for.
    /// </summary>
    /// <remarks>
    /// These live in code rather than in a hand-written ProjectSettings asset so
    /// the values are reviewable in a pull request, and so a freshly cloned
    /// project can be brought to a known state with one menu click.
    /// </remarks>
    public static class ProjectSetup
    {
        private const string CompanyName = "LudoVerse";
        private const string ProductName = "LudoVerse";

        [MenuItem("LudoVerse/Apply Project Settings", false, 1)]
        public static void ApplyProjectSettings()
        {
            PlayerSettings.companyName = CompanyName;
            PlayerSettings.productName = ProductName;

            // Linear colour space is required by the gradient-heavy, blurred UI.
            PlayerSettings.colorSpace = ColorSpace.Linear;

            // Ludo is played portrait; landscape is opt-in per screen.
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;

            AssetDatabase.SaveAssets();
            Debug.Log("LudoVerse: project settings applied.");
        }
    }
}
