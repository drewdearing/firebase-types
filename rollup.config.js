import { babel } from "@rollup/plugin-babel";

const config = {
  input: "src/index.js",
  output: {
    dir: "build",
    format: "cjs",
  },
  plugins: [babel({ babelHelpers: "bundled" })],
};

export default config;
