module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      [
        'module-resolver',
        {
          alias: {
            'nanoid/non-secure': 'nanoid/non-secure/index.js',
          },
        },
      ],
    ],
  };
};