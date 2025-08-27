module.exports = {
  /**
   * Injects the CustomViews script into every page.
   */
  getScripts() {
    // Return an array of <script> tags as strings
      return [
        '<script src="./customviewsBinary.js"></script>',
        `<script>
          const cv = new CustomViews.CustomViews({
            configUrl: '/master.json',
            rootEl: document.getElementById('app'),
            onViewChange: (stateId, state) => {
              console.log('View changed:', stateId, state);
            }
          });
          cv.init();
        </script>`
      ];
  }
};