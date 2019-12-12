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

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _handlebars = _interopRequireDefault(require("handlebars"));

var _junk = _interopRequireDefault(require("junk"));

var _importFresh = _interopRequireDefault(require("import-fresh"));

var _debug = _interopRequireDefault(require("debug"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var debug = (0, _debug["default"])('handlebars-transpiler');

var hbsTranspile = function hbsTranspile() {
  var config = init();
  var partialMap = registerPartials(config); // get JSON Dir map

  var jsonMap = registerJSONContent(config);
  registerHelpers(config);

  var partialData = _objectSpread({}, partialMap, {}, jsonMap); // create pages


  createPages(config, partialData);
};

function init() {
  // NOTE: Get rid of input dir, there is no reason all of these must be in the same folder
  var defaults = {
    outputDir: './public',
    helpersDir: './helpers',
    JSONDir: './content',
    partialsDir: './partials',
    pagesDir: './pages',
    ext: '.html',
    excludes: []
  };
  var config = {
    outputDir: process.env.HBT_OUTPUT_DIR || defaults.outputDir,
    helpersDir: process.env.HBT_HELPERS_DIR || defaults.helpersDir,
    JSONDir: process.env.HBT_JSON_DIR || defaults.JSONDir,
    partialsDir: process.env.HBT_PARTIALS_DIR || defaults.partialsDir,
    pagesDir: process.env.HBT_PAGES_DIR || defaults.pagesDir,
    ext: process.env.HBT_EXT || defaults.ext,
    excludes: getExcludes(process.env.HBT_EXCLUDES) || defaults.excludes
  };

  function getExcludes(filter) {
    if (!filter) return [];
    return filter.split(',');
  }

  return config;
}

;

function getFilteredDirectory(dir, filter) {
  var contents = walk(dir);

  if (filter) {
    contents = filterDirectoryContents(contents, filter);
  }

  return contents;
}

function filterDirectoryContents(contents, filter) {
  var result = contents;

  if (filter && filter.length > 0) {
    result = contents.filter(function (content) {
      return filter.indexOf(content) === -1;
    });
  }

  debug("filter ".concat(filter));
  debug(result);
  return result;
}

function walk(directory) {
  /**
   * Sanity Check: Handle Non Existent Directories by returning an empty array.
   * The Catch: module will not error out due to a non existent directory, however, if there are
   *   partials / helpers included in the templates and this module doesn't find them due to
   *   the wrong directory passed into the config, handlebars will error out and the build will fail.
   *   That is a part of the Handlebars module itself.
   */
  if (!_fs["default"].existsSync(directory)) {
    debug("=== Directory Does Not Exist: ".concat(directory, " ==="));
    return [];
  }

  function directoryWalker(dir) {
    var items = _fs["default"].readdirSync(dir).filter(_junk["default"].not).map(function (item) {
      return _path["default"].join(dir, item);
    });

    var files = items.filter(function (item) {
      return _fs["default"].statSync(item).isFile();
    });
    var subDirs = items.filter(function (item) {
      return _fs["default"].statSync(item).isDirectory();
    });
    return subDirs.reduce(function (contents, subDir) {
      return contents.concat(directoryWalker(subDir));
    }, files);
  }

  return directoryWalker(_path["default"].resolve(directory)).map(function (item) {
    return item.substr(_path["default"].resolve(directory).length + _path["default"].sep.length);
  });
}

;

function registerPartials(config) {
  var partials = getFilteredDirectory(config.partialsDir);
  var partialData = {}; // Load Partials into partialData Object to pass to main templates.

  partials.forEach(function (partial) {
    var fileName = partial.split('.')[0];

    var onlyPath = _path["default"].dirname(partial);

    mkdir(onlyPath); // Get the Partial Data in Buffers to an array

    partialData[fileName] = _fs["default"].readFileSync("".concat(config.partialsDir, "/").concat(partial));

    _handlebars["default"].registerPartial(fileName, partialData[fileName].toString());
  });
  return partialData;
}

;

function registerJSONContent(config) {
  var jsonContent = getFilteredDirectory(config.JSONDir); // Load JSON into the "Partials Object"

  var partialData = {};
  jsonContent.forEach(function (content) {
    var contentName = content.split('.')[0];

    var onlyPath = _path["default"].dirname(content);

    mkdir(onlyPath); // Used Require to get a JSON Object

    partialData[contentName] = JSON.parse(_fs["default"].readFileSync("".concat(config.JSONDir, "/").concat(content)));
  });
  return partialData;
}

;

function registerHelpers(config) {
  var helpers = getFilteredDirectory(config.helpersDir); // Load Helpers

  helpers.forEach(function (helper) {
    var fileName = helper.split('.').shift();

    var fullPath = _path["default"].resolve("".concat(config.helpersDir, "/").concat(helper));

    var fn = (0, _importFresh["default"])(fullPath);

    _handlebars["default"].registerHelper(fileName, fn);

    debug("=== Registered Helper: ".concat(fileName, " ==="));
  });
  debug('=== Finished Helper Registration ===');
}

;

function createPages(config, partialData) {
  var pages = getFilteredDirectory(config.pagesDir, config.excludes); // Load Pages Files, Compile, Write

  pages.forEach(function (page) {
    // Capture the Filename to use as the HTML filename
    var fileName = page.split('.')[0]; // Read the source of the template

    var source = _fs["default"].readFileSync("".concat(config.pagesDir, "/").concat(page));

    source = source.toString('utf8'); // Puts the Partials into the "Main" Page

    var compiled = _handlebars["default"].compile(source, {
      noEscape: true
    });

    var result = compiled(partialData);
    var output = "".concat(config.outputDir, "/").concat(fileName).concat(config.ext);

    var outputPath = _path["default"].dirname(output);

    mkdir(outputPath); // Write Compiled Templates to HTML Files.

    _fs["default"].writeFileSync(output, result);

    debug('=== Compiled: ', fileName + config.ext, ' ===');
  });
  debug('=== Finished Handlebars Build ===');
}

;

function mkdir(onlyPath) {
  if (!_fs["default"].existsSync(onlyPath)) {
    _fs["default"].mkdirSync(onlyPath);
  }
}

;
var _default = hbsTranspile;
exports["default"] = _default;