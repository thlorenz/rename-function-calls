'use strict';

var esprima = require('esprima-six')
  , select = require('JSONSelect')
  , esprimaOpts = { 
      range: true
    , parse: { tolerant: true } 
    };

function rangeComparator(a, b) {
  return a.from > b.from ? 1 : -1;
}

function getReplacements(fromName, toName) {
  var regex = new RegExp('^' + fromName);

  var ast = esprima.parse(src, esprimaOpts);
  var calls = select
    .match('.type:val("ExpressionStatement") ~ .expression', ast)

    // todo: how do I express this filter in JSONSelect and still pull out the whole ExpressionStatement?
    .filter(function (n) { 
      return n.type === 'CallExpression' 
          && n.callee && n.callee.name === fromName 
    })

  return calls
    .map(function (n) { 
      var code = src.slice(n.range[0], n.range[1]).replace(regex, toName);
      return { from: n.range[0], to: n.range[1], code: code };
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
 * @return {string} source with function calls renamed exposed
 */
function rename(fromName, toName, origSrc) {
  var src = origSrc;

  // ensure that at least one of the function call statements we want to replace is in the code
  // before we perform the expensive operation of finding them by creating an AST
  var regex = new RegExp(fromName + ' *\\(.*\\)');
  if (!regex.test(src)) return src

  var offset = 0;
  return getReplacements(toName, toName)
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
  var toName = 'y';

  var regex = new RegExp('^' + fromName);

  var ast = esprima.parse(src, esprimaOpts);
  var calls = select
    .match('.type:val("CallExpression") ~ :root', ast)
    // todo: how do I express this filter in JSONSelect?
    .filter(function (n) { return n.name === fromName })


}
  /*var replacements = calls
    .map(function (n) { 
      var code = src.slice(n.range[0], n.range[1]).replace(regex, 'y');
      return { from: n.range[0], to: n.range[1], code: code };
    });

  var offset = 0;
  var s = replacements
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
*/
