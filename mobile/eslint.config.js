import expoConfig from "eslint-config-expo/flat.js";

const config = [
  ...expoConfig,
  {
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
