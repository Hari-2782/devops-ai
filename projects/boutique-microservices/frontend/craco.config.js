const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Force Webpack to resolve @mui/utils subpath imports using the CJS (main)
      // entry instead of the ESM (module) entry. The ESM re-exports
      // (e.g. `export { default }`) are not handled correctly by CRA5's
      // Babel/Webpack pipeline, causing "does not contain a default export" errors.
      webpackConfig.resolve = webpackConfig.resolve || {};
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@mui/utils': path.resolve(__dirname, 'node_modules/@mui/utils'),
      };

      // Ensure 'main' is resolved before 'module' for @mui packages
      // Default Webpack 5 mainFields: ['browser', 'module', 'main']
      // We reorder to prefer CJS over ESM for compatibility with CRA5
      webpackConfig.resolve.mainFields = ['browser', 'main', 'module'];

      return webpackConfig;
    },
  },
};
