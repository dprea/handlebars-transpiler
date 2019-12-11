#!/usr/bin/env node

const hbsTranspile = require('../dist/index.js').default;

const main = function main() {
  hbsTranspile();
};
main();
