'use strict'
var db = require('./db')

exports.up = async function(next) {
  var sql = [
    'ALTER TABLE cash_out_refills ADD COLUMN prev_cassette1 int4',
    'ALTER TABLE cash_out_refills ADD COLUMN prev_cassette2 int4',
  ]
  db.multi(sql, next)
};

exports.down = function(next) {
  var sql = [
    'ALTER TABLE cash_out_refills DROP COLUMN prev_cassette1',
    'ALTER TABLE cash_out_refills DROP COLUMN prev_cassette2',
  ]
  db.multi(sql, next)
};
