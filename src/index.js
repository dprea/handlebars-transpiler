'use strict';
/**
* Build tool for locally building handlebars templates.
*
* JSONContent - JSON Content to be injected into the templates
* Partials - Header / Footer etc
* Pages - Actual Pages
*
* 1.imports
* 2. Load Handlebars Template Partials
* 3. Load Main (Page) Handlebars templates
* 4. Write HTML or HBS files
*/
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import junk from 'junk';
import importFresh from 'import-fresh';
import Debug from 'debug';

const debug = Debug('handlebars-transpiler');

const hbsTranspile = () => {
  const config = init();
  const partialMap = registerPartials(config);
  // get JSON Dir map
  const jsonMap = registerJSONContent(config);
  registerHelpers(config);

  const partialData = {
    ...partialMap,
    ...jsonMap,
  };
  // create pages
  createPages(config, partialData);
};

const init = () => {
  // NOTE: Get rid of input dir, there is no reason all of these must be in the same folder
  const defaults = {
    outputDir: './public',
    helpersDir: './helpers',
    JSONDir: './content',
    partialsDir: './partials',
    pagesDir: './pages',
    ext: '.html',
    excludes: [],
  };

  const config = {
    outputDir: process.env.HBT_OUTPUT_DIR || defaults.outputDir,
    helpersDir: process.env.HBT_HELPERS_DIR || defaults.helpersDir,
    JSONDir: process.env.HBT_JSON_DIR || defaults.JSONDir,
    partialsDir: process.env.HBT_PARTIALS_DIR || defaults.partialsDir,
    pagesDir: process.env.HBT_PAGES_DIR || defaults.pagesDir,
    ext: process.env.HBT_EXT || defaults.ext,
    excludes: getExcludes(process.env.HBT_EXCLUDES) || defaults.excludes,
  };

  function getExcludes(filter) {
    if (!filter) return [];
    return filter.split(',');
  }

  return config;
};

function getFilteredDirectory(dir, filter) {
  let contents = walk(dir);

  if (filter) {
    contents = filterDirectoryContents(contents, filter);
  }

  return contents;
}

function filterDirectoryContents(contents, filter) {
  let result = contents;
  if (filter && filter.length > 0) {
    result = contents.filter(content => filter.indexOf(content) === -1);
  }
  debug(`filter ${filter}`);
  debug(result);

  return result;
}

const walk = function walk(directory) {
  /**
   * Sanity Check: Handle Non Existent Directories by returning an empty array.
   * The Catch: module will not error out due to a non existent directory, however, if there are
   *   partials / helpers included in the templates and this module doesn't find them due to
   *   the wrong directory passed into the config, handlebars will error out and the build will fail.
   *   That is a part of the Handlebars module itself.
   */
  if (!fs.existsSync(directory)) {
    debug(`=== Directory Does Not Exist: ${directory} ===`);
    return [];
  }

  function directoryWalker(dir) {
    const items = fs.readdirSync(dir).filter(junk.not).map(item => path.join(dir, item));
    const files = items.filter(item => fs.statSync(item).isFile());
    const subDirs = items.filter(item => fs.statSync(item).isDirectory());

    return subDirs.reduce((contents, subDir) => {
      return contents.concat(directoryWalker(subDir));
    }, files);
  }

  return directoryWalker(path.resolve(directory))
    .map((item) => {
      return item.substr(path.resolve(directory).length + path.sep.length);
    });
};

const registerPartials = function registerPartials(config) {
  const partials = getFilteredDirectory(config.partialsDir);

  const partialData = {};
  // Load Partials into partialData Object to pass to main templates.
  partials.forEach(function(partial) {
    let fileName = partial.split('.')[0];
    let onlyPath = path.dirname(partial);
    mkdir(onlyPath);
    // Get the Partial Data in Buffers to an array
    partialData[fileName] = fs.readFileSync(`${config.partialsDir}/${partial}`);

    Handlebars.registerPartial(fileName, partialData[fileName].toString());
  });

  return partialData;
};

const registerJSONContent = function registerJSONContent(config) {
  const jsonContent = getFilteredDirectory(config.JSONDir);
  // Load JSON into the "Partials Object"
  const partialData = {};
  jsonContent.forEach(function(content) {
    const contentName = content.split('.')[0];
    const onlyPath = path.dirname(content);
    mkdir(onlyPath);
    // Used Require to get a JSON Object
    partialData[contentName] = JSON.parse(fs.readFileSync(`${config.JSONDir}/${content}`));
  });

  return partialData;
};

const registerHelpers = function registerHelpers(config) {
  let helpers = getFilteredDirectory(config.helpersDir);
  // Load Helpers
  helpers.forEach((helper) => {
    const fileName = helper.split('.').shift();
    const fullPath = path.resolve(`${config.helpersDir}/${helper}`);

    const fn = importFresh(fullPath);
    Handlebars.registerHelper(fileName, fn);

    debug(`=== Registered Helper: ${fileName} ===`);
  });

  debug('=== Finished Helper Registration ===');
};

const createPages = function createPages(config, partialData) {
  const pages = getFilteredDirectory(config.pagesDir, config.excludes);
  // Load Pages Files, Compile, Write
  pages.forEach(function(page) {
    // Capture the Filename to use as the HTML filename
    const fileName = page.split('.')[0];

    // Read the source of the template
    let source = fs.readFileSync(`${config.pagesDir}/${page}`);
    source = source.toString('utf8');
    // Puts the Partials into the "Main" Page
    const compiled = Handlebars.compile(source, { noEscape: true });
    const result = compiled(partialData);

    const output = `${config.outputDir}/${fileName}${config.ext}`;
    const outputPath = path.dirname(output);
    mkdir(outputPath);

    // Write Compiled Templates to HTML Files.
    fs.writeFileSync(output, result);
    debug('=== Compiled: ', fileName + config.ext, ' ===');
  });
  debug('=== Finished Handlebars Build ===');
};

const mkdir = function mkdir(onlyPath) {
  if (!fs.existsSync(onlyPath)) {
    fs.mkdirSync(onlyPath);
  }
};

export default hbsTranspile;
