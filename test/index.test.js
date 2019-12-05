'use strict';

const fs = require('fs');
const expect = require('chai').expect;
const cheerio = require('cheerio');
const del = require('del');
const hbsTranspile = require('../dist/index.js').default;

describe('Handlebars Transpile', () => {
  describe('Handlebars Files Convert to HTML', () => {
    beforeEach(() => {
      del.sync(['./test/output/**'],
        { dot: true });

      process.env.HBT_OUTPUT_DIR = './test/output';
      process.env.HBT_PARTIALS_DIR = './test/views/partials';
      process.env.HBT_PAGES_DIR = './test/views/pages';
      process.env.HBT_HELPERS_DIR = './test/views/helpers';
      process.env.HBT_JSON_DIR = './test/views/jsoncontent';
    });

    it('should convert all handlebars templates, partials, and JSON to html', () => {
      hbsTranspile();
      const file = fs.readFileSync(`${process.env.HBT_OUTPUT_DIR}/test-page.html`);
      const fileTwo = fs.readFileSync(`${process.env.HBT_OUTPUT_DIR}/test-page-two.html`)
      const $ = cheerio.load(file.toString('utf-8'));
      const $Two = cheerio.load(fileTwo.toString('utf-8'));

      // expectations
      // Tests Partials are working
      expect($('title').text()).to.equal('Test Page');
      // Tests JSON Content is being injected
      expect($('#text1').text()).to.equal('Some Text');
      expect($Two('#text1').text()).to.equal('Some Text');
    });

    // Fix how filters work, parse a comma delimited list
    it('should only compile files in the filter array when it is provided', () => {
      process.env.HBT_FILTERS = 'test-page.hbs';

      hbsTranspile();
      const $ = cheerio.load(fs.readFileSync(`${process.env.HBT_OUTPUT_DIR}/test-page.html`));
      const file = fs.existsSync(`${process.env.HBT_OUTPUT_DIR}/test-page-two.html`);

      expect($('#text1').text()).to.equal('Some Text');
      expect(file).to.be.false;
      delete process.env.HBT_FILTERS;
    });

    // it('should not fail if the partials directory does not exist', () => {
    //   process.env.HBT_PARTIALS_DIR = 'nothing/';
    //   //config.filter = ['test-page-no-partials.hbs'];

    //   hbsTranspile();
    //   const $ = cheerio.load(fs.readFileSync(`${process.env.HBT_OUTPUT_DIR}/test-page-no-partials.html`));

    //   expect($('#text1').text()).to.equal('Some Text');
    // });
  });

  afterEach(() => {
    del.sync(['./test/output/**'],
    { dot: true });
  });
});
