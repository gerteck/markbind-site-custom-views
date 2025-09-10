module.exports = {
  /**
   * Injects the CustomViews script into every page.
   */
  getScripts() {
    // Return an array of <script> tags as strings
      return [
        '<script type="module" src="./custom-views.esm.js"></script>',
        `<script>
          window.addEventListener('DOMContentLoaded', async () => {
            const localConfigPaths = {
              "profileB": "/configs/profileB.json",
              "profileA": "/configs/profileA.json"
            };

            const customviews = await window.CustomViews.initFromJson({
              assetsJsonPath: '/configs/assets.json',
              defaultStateJsonPath: '/configs/defaultState.json',
              localConfigPaths,
              rootEl: document.body
            });
            await customviews.init();
          });
        </script>`
      ];
  }
};