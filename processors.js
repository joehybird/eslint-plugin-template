require('colors');

var getenv = require('getenv');
var detemplatize = require('./detemplatize.js')
var extract = require('./extract.js')

// remove indentation and return a {indent: }
function dedent(str) {
  var match = str.match(/^[ \t]*(?=\S)/gm)
  if (!match) {
    return { size: 0, text: str }
  }
  var indent = Math.min.apply(Math, match.map(function (x) { return x.length }))
  var re = new RegExp('^[ \\t]{' + indent + '}', 'gm')
  return {
    size: indent,
    text: indent > 0 ? str.replace(re, '') : str
  }
}

function fmtLineNumber(value) {
    return ('    ' + value).slice(-4);
}

function pprint(text, firstindex) {
  var output = text.replace(/ /g, '·'.gray)
    .split('\n').map(function(line, index) {
      return (
         fmtLineNumber(firstindex + index) + ' → ' +
         fmtLineNumber(index + 1) + ': '
      ).grey + line + '¶'.gray;
    }).join('\n');

  console.log(output);
}

module.exports = {
   // For JS files, just detemplatize
   detemplatize: function() {
     return {
       preprocess: function (text) {
         return [detemplatize(text)]
       },
       postprocess: function (messages) {
         return messages[0];
       },
       supportsAutofix: false
     };
   },
   // For HTML and SVG files, first detemplatize, then run through HTML plugin
   detemplatizeHTML: function() {
     var scripts, originalText;
     var is_debug = getenv.int('ESLINT_DEBUG', 0)

     return {
       preprocess: function (text, filename) {
         originalText = text
         scripts = extract(text)

         var output = scripts.map(function (chunk) {
           var indentation = dedent(chunk.text);
           chunk.indent_size = indentation.size;
           return detemplatize(indentation.text);
         });

         if (is_debug) {
           output.forEach(function(text, index) {
             console.log(String(filename).underline);
             pprint(text, scripts[index].start);
           });
         }

         return output
       },
       postprocess: function (messages) {
         var result = [];

         messages.forEach(function (messageList, index) {
           var text = originalText.slice(0, scripts[index].start);
           var lines = text.split('\n');
           var lineno = lines.length - 1;
           var colno = scripts[index].indent_size

           messageList.forEach(function (message) {
             message.line += lineno;
             message.column += colno;
             result.push(message);
           });
         });

         return result
       },
       supportsAutofix: false
     };
   }
};

