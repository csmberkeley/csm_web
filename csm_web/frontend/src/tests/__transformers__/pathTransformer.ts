/**
 * Transform files to their path name.
 */

/* eslint @typescript-eslint/no-var-requires: "off" */
const path = require("path");

module.exports = {
  process(sourceText, sourcePath, options) {
    // convert path name to lowercase, and replace the "." with "-";
    // this circumvents errors relating to component naming
    const base = path.basename(sourcePath).toLowerCase().replace(".", "-");
    return {
      code: `module.exports = ${JSON.stringify(base)};`
    };
  }
};
