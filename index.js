'use strict';

var detective = require('detective')
  , esprimaOpts = { tolerant: true, range: true };

function rangeComparator(a, b) {
  return a.from > b.from ? 1 : -1;
}

function getReplacements(fromName, toName, src) {
  var regex = new RegExp('^' + fromName);

  var res = detective.find(src, { word: fromName, nodes: true, parse: esprimaOpts });
  return res.nodes.map(function (n) {
    var c = n.callee;
      var code = src.slice(c.range[0], c.range[1]).replace(regex, toName);
      return { from: c.range[0], to: c.range[1], code: code };
  });
}

var go = module.exports = 

/**
 * Replaces every function call named `from` with another one that is named `to`.
 *
 * #### Example
 *
 *    rename(src, 'log', 'print');
 *    // => log(x) becomes print(x)
 *
 * @name rename
 * @function
 * @param {string} origSrc the original source
 * @param {string} fromName name under which function is currently called
 * @param {string} toName name to which the function calls should be renamed
 * @return {string} source with function calls renamed
 */
function rename(fromName, toName, origSrc) {
  var src = origSrc;

  // ensure that at least one of the function call statements we want to replace is in the code
  // before we perform the expensive operation of finding them by creating an AST
  var regex = new RegExp(fromName + ' *\\(.*\\)');
  if (!regex.test(src)) return src

  var offset = 0;
  return getReplacements(fromName, toName, src)
    .sort(rangeComparator)
    .reduce(function(acc, replacement) {
      var from = replacement.from + offset
        , to   = replacement.to + offset
        , code = replacement.code;

      // all ranges will be invalidated since we are changing the code
      // therefore keep track of the offset to adjust them in case we replace multiple requires
      var diff = code.length - (to - from);
      offset += diff;
      return acc.slice(0, from) + code + acc.slice(to);
    }, src);
}

// Test
if (!module.parent && typeof window === 'undefined') {
  var src = [
      'function x(a) { return "x" }'
    , 'function y() { return "y" + x(); }'
    , 'x()'
    , 'y()'
    , 'x(1, 2, 3)'
    , 'var y = 2;'
  ].join('\n');

  var fromName = 'x';
  var toName = 'replacedX';

  go(fromName, toName, src);
}
