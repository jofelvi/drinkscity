// Copyright (C) 2006 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * some functions for browser-side pretty printing of code contained in html.
 *
 * <p>
 * For a fairly comprehensive set of languages see the
 * <a href="http://google-code-prettify.googlecode.com/svn/trunk/README.html#langs">README</a>
 * file that came with this source.  At a minimum, the lexer should work on a
 * number of languages including C and friends, Java, Python, Bash, SQL, HTML,
 * XML, CSS, Javascript, and Makefiles.  It works passably on Ruby, PHP and Awk
 * and a subset of Perl, but, because of commenting conventions, doesn't work on
 * Smalltalk, Lisp-like, or CAML-like languages without an explicit lang class.
 * <p>
 * Usage: <ol>
 * <li> include this source file in an html page via
 *   {@code <script type="text/javascript" src="/path/to/prettify.js"></script>}
 * <li> define style rules.  See the example page for examples.
 * <li> mark the {@code <pre>} and {@code <code>} tags in your source with
 *    {@code class=prettyprint.}
 *    You can also use the (html deprecated) {@code <xmp>} tag, but the pretty
 *    printer needs to do more substantial DOM manipulations to support that, so
 *    some css styles may not be preserved.
 * </ol>
 * That's it.  I wanted to keep the API as simple as possible, so there's no
 * need to specify which language the code is in, but if you wish, you can add
 * another class to the {@code <pre>} or {@code <code>} element to specify the
 * language, as in {@code <pre class="prettyprint lang-java">}.  Any class that
 * starts with "lang-" followed by a file extension, specifies the file type.
 * See the "lang-*.js" files in this directory for code that implements
 * per-language file handlers.
 * <p>
 * Change log:<br>
 * cbeust, 2006/08/22
 * <blockquote>
 *   Java annotations (start with "@") are now captured as literals ("lit")
 * </blockquote>
 * @requires console
 */

// JSLint declarations
/*global console, document, navigator, setTimeout, window, define */

/** @define {boolean} */

var IN_GLOBAL_SCOPE = true;

/**
 * Split {@code prettyPrint} into multiple timeouts so as not to interfere with
 * UI events.
 * If set to {@code false}, {@code prettyPrint()} is synchronous.
 */
window['PR_SHOULD_USE_CONTINUATION'] = true;

/**
 * Pretty print a chunk of code.
 * @param {string} sourceCodeHtml The HTML to pretty print.
 * @param {string} opt_langExtension The language name to use.
 *     Typically, a filename extension like 'cpp' or 'java'.
 * @param {number|boolean} opt_numberLines True to number lines,
 *     or the 1-indexed number of the first line in sourceCodeHtml.
 * @return {string} code as html, but prettier
 */
var prettyPrintOne;
/**
 * Find all the {@code <pre>} and {@code <code>} tags in the DOM with
 * {@code class=prettyprint} and prettify them.
 *
 * @param {Function} opt_whenDone called when prettifying is done.
 * @param {HTMLElement|HTMLDocument} opt_root an element or document
 *   containing all the elements to pretty print.
 *   Defaults to {@code document.body}.
 */
var prettyPrint;


(function () {
  var win = window;
  // Keyword lists for various languages.
  // We use things that coerce to strings to make them compact when minified
  // and to defeat aggressive optimizers that fold large string constants.
  var FLOW_CONTROL_KEYWORDS = ["break,continue,do,else,for,if,return,while"];
  var C_KEYWORDS = [FLOW_CONTROL_KEYWORDS,"auto,case,char,const,default," + 
      "double,enum,extern,float,goto,inline,int,long,register,short,signed," +
      "sizeof,static,struct,switch,typedef,union,unsigned,void,volatile"];
  var COMMON_KEYWORDS = [C_KEYWORDS,"catch,class,delete,false,import," +
      "new,operator,private,protected,public,this,throw,true,try,typeof"];
  var CPP_KEYWORDS = [COMMON_KEYWORDS,"alignof,align_union,asm,axiom,bool," +
      "concept,concept_map,const_cast,constexpr,decltype,delegate," +
      "dynamic_cast,explicit,export,friend,generic,late_check," +
      "mutable,namespace,nullptr,property,reinterpret_cast,static_assert," +
      "static_cast,template,typeid,typename,using,virtual,where"];
  var JAVA_KEYWORDS = [COMMON_KEYWORDS,
      "abstract,assert,boolean,byte,extends,final,finally,implements,import," +
      "instanceof,interface,null,native,package,strictfp,super,synchronized," +
      "throws,transient"];
  var CSHARP_KEYWORDS = [JAVA_KEYWORDS,
      "as,base,by,checked,decimal,delegate,descending,dynamic,event," +
      "fixed,foreach,from,group,implicit,in,internal,into,is,let," +
      "lock,object,out,override,orderby,params,partial,readonly,ref,sbyte," +
      "sealed,stackalloc,string,select,uint,ulong,unchecked,unsafe,ushort," +
      "var,virtual,where"];
  var COFFEE_KEYWORDS = "all,and,by,catch,class,else,extends,false,finally," +
      "for,if,in,is,isnt,loop,new,no,not,null,of,off,on,or,return,super,then," +
      "throw,true,try,unless,until,when,while,yes";
  var JSCRIPT_KEYWORDS = [COMMON_KEYWORDS,
      "debugger,eval,export,function,get,null,set,undefined,var,with," +
      "Infinity,NaN"];
  var PERL_KEYWORDS = "caller,delete,die,do,dump,elsif,eval,exit,foreach,for," +
      "goto,if,import,last,local,my,next,no,our,print,package,redo,require," +
      "sub,undef,unless,until,use,wantarray,while,BEGIN,END";
  var PYTHON_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "and,as,assert,class,def,del," +
      "elif,except,exec,finally,from,global,import,in,is,lambda," +
      "nonlocal,not,or,pass,print,raise,try,with,yield," +
      "False,True,None"];
  var RUBY_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "alias,and,begin,case,class," +
      "def,defined,elsif,end,ensure,false,in,module,next,nil,not,or,redo," +
      "rescue,retry,self,super,then,true,undef,unless,until,when,yield," +
      "BEGIN,END"];
   var RUST_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "as,assert,const,copy,drop," +
      "enum,extern,fail,false,fn,impl,let,log,loop,match,mod,move,mut,priv," +
      "pub,pure,ref,self,static,struct,true,trait,type,unsafe,use"];
  var SH_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "case,done,elif,esac,eval,fi," +
      "function,in,local,set,then,until"];
  var ALL_KEYWORDS = [
      CPP_KEYWORDS, CSHARP_KEYWORDS, JSCRIPT_KEYWORDS, PERL_KEYWORDS,
      PYTHON_KEYWORDS, RUBY_KEYWORDS, SH_KEYWORDS];
  var C_TYPES = /^(DIR|FILE|vector|(de|priority_)?queue|list|stack|(const_)?iterator|(multi)?(set|map)|bitset|u?(int|float)\d*)\b/;

  // token style names.  correspond to css classes
  /**
   * token style for a string literal
   * @const
   */
  var PR_STRING = 'str';
  /**
   * token style for a keyword
   * @const
   */
  var PR_KEYWORD = 'kwd';
  /**
   * token style for a comment
   * @const
   */
  var PR_COMMENT = 'com';
  /**
   * token style for a type
   * @const
   */
  var PR_TYPE = 'typ';
  /**
   * token style for a literal value.  e.g. 1, null, true.
   * @const
   */
  var PR_LITERAL = 'lit';
  /**
   * token style for a punctuation string.
   * @const
   */
  var PR_PUNCTUATION = 'pun';
  /**
   * token style for plain text.
   * @const
   */
  var PR_PLAIN = 'pln';

  /**
   * token style for an sgml tag.
   * @const
   */
  var PR_TAG = 'tag';
  /**
   * token style for a markup declaration such as a DOCTYPE.
   * @const
   */
  var PR_DECLARATION = 'dec';
  /**
   * token style for embedded source.
   * @const
   */
  var PR_SOURCE = 'src';
  /**
   * token style for an sgml attribute name.
   * @const
   */
  var PR_ATTRIB_NAME = 'atn';
  /**
   * token style for an sgml attribute value.
   * @const
   */
  var PR_ATTRIB_VALUE = 'atv';

  /**
   * A class that indicates a section of markup that is not code, e.g. to allow
   * embedding of line numbers within code listings.
   * @const
   */
  var PR_NOCODE = 'nocode';

  
  
  /**
   * A set of tokens that can precede a regular expression literal in
   * javascript
   * http://web.archive.org/web/20070717142515/http://www.mozilla.org/js/language/js20/rationale/syntax.html
   * has the full list, but I've removed ones that might be problematic when
   * seen in languages that don't support regular expression literals.
   *
   * <p>Specifically, I've removed any keywords that can't precede a regexp
   * literal in a syntactically legal javascript program, and I've removed the
   * "in" keyword since it's not a keyword in many languages, and might be used
   * as a count of inches.
   *
   * <p>The link above does not accurately describe EcmaScript rules since
   * it fails to distinguish between (a=++/b/i) and (a++/b/i) but it works
   * very well in practice.
   *
   * @private
   * @const
   */
  var REGEXP_PRECEDER_PATTERN = '(?:^^\\.?|[+-]|[!=]=?=?|\\#|%=?|&&?=?|\\(|\\*=?|[+\\-]=|->|\\/=?|::?|<<?=?|>>?>?=?|,|;|\\?|@|\\[|~|{|\\^\\^?=?|\\|\\|?=?|break|case|continue|delete|do|else|finally|instanceof|return|throw|try|typeof)\\s*';
  
  // CAVEAT: this does not properly handle the case where a regular
  // expression immediately follows another since a regular expression may
  // have flags for case-sensitivity and the like.  Having regexp tokens
  // adjacent is not valid in any language I'm aware of, so I'm punting.
  // TODO: maybe style special characters inside a regexp as punctuation.

  /**
   * Given a group of {@link RegExp}s, returns a {@code RegExp} that globally
   * matches the union of the sets of strings matched by the input RegExp.
   * Since it matches globally, if the input strings have a start-of-input
   * anchor (/^.../), it is ignored for the purposes of unioning.
   * @param {Array.<RegExp>} regexs non multiline, non-global regexs.
   * @return {RegExp} a global regex.
   */
  function combinePrefixPatterns(regexs) {
    var capturedGroupIndex = 0;
  
    var needToFoldCase = false;
    var ignoreCase = false;
    for (var i = 0, n = regexs.length; i < n; ++i) {
      var regex = regexs[i];
      if (regex.ignoreCase) {
        ignoreCase = true;
      } else if (/[a-z]/i.test(regex.source.replace(
                     /\\u[0-9a-f]{4}|\\x[0-9a-f]{2}|\\[^ux]/gi, ''))) {
        needToFoldCase = true;
        ignoreCase = false;
        break;
      }
    }
  
    var escapeCharToCodeUnit = {
      'b': 8,
      't': 9,
      'n': 0xa,
      'v': 0xb,
      'f': 0xc,
      'r': 0xd
    };
  
    function decodeEscape(charsetPart) {
      var cc0 = charsetPart.charCodeAt(0);
      if (cc0 !== 92 /* \\ */) {
        return cc0;
      }
      var c1 = charsetPart.charAt(1);
      cc0 = escapeCharToCodeUnit[c1];
      if (cc0) {
        return cc0;
      } else if ('0' <= c1 && c1 <= '7') {
        return parseInt(charsetPart.substring(1), 8);
      } else if (c1 === 'u' || c1 === 'x') {
        return parseInt(charsetPart.substring(2), 16);
      } else {
        return charsetPart.charCodeAt(1);
      }
    }
  
    function encodeEscape(charCode) {
      if (charCode < 0x20) {
        return (charCode < 0x10 ? '\\x0' : '\\x') + charCode.toString(16);
      }
      var ch = String.fromCharCode(charCode);
      return (ch === '\\' || ch === '-' || ch === ']' || ch === '^')
          ? "\\" + ch : ch;
    }
  
    function caseFoldCharset(charSet) {
      var charsetParts = charSet.substring(1, charSet.length - 1).match(
          new RegExp(
              '\\\\u[0-9A-Fa-f]{4}'
              + '|\\\\x[0-9A-Fa-f]{2}'
              + '|\\\\[0-3][0-7]{0,2}'
              + '|\\\\[0-7]{1,2}'
              + '|\\\\[\\s\\S]'
              + '|-'
              + '|[^-\\\\]',
              'g'));
      var ranges = [];
      var inverse = charsetParts[0] === '^';
  
      var out = ['['];
      if (inverse) { out.push('^'); }
  
      for (var i = inverse ? 1 : 0, n = charsetParts.length; i < n; ++i) {
        var p = charsetParts[i];
        if (/\\[bdsw]/i.test(p)) {  // Don't muck with named groups.
          out.push(p);
        } else {
          var start = decodeEscape(p);
          var end;
          if (i + 2 < n && '-' === charsetParts[i + 1]) {
            end = decodeEscape(charsetParts[i + 2]);
            i += 2;
          } else {
            end = start;
          }
          ranges.push([start, end]);
          // If the range might intersect letters, then expand it.
          // This case handling is too simplistic.
          // It does not deal with non-latin case folding.
          // It works for latin source code identifiers though.
          if (!(end < 65 || start > 122)) {
            if (!(end < 65 || start > 90)) {
              ranges.push([Math.max(65, start) | 32, Math.min(end, 90) | 32]);
            }
            if (!(end < 97 || start > 122)) {
              ranges.push([Math.max(97, start) & ~32, Math.min(end, 122) & ~32]);
            }
          }
        }
      }
  
      // [[1, 10], [3, 4], [8, 12], [14, 14], [16, 16], [17, 17]]
      // -> [[1, 12], [14, 14], [16, 17]]
      ranges.sort(function (a, b) { return (a[0] - b[0]) || (b[1]  - a[1]); });
      var consolidatedRanges = [];
      var lastRange = [];
      for (var i = 0; i < ranges.length; ++i) {
        var range = ranges[i];
        if (range[0] <= lastRange[1] + 1) {
          lastRange[1] = Math.max(lastRange[1], range[1]);
        } else {
          consolidatedRanges.push(lastRange = range);
        }
      }
  
      for (var i = 0; i < consolidatedRanges.length; ++i) {
        var range = consolidatedRanges[i];
        out.push(encodeEscape(range[0]));
        if (range[1] > range[0]) {
          if (range[1] + 1 > range[0]) { out.push('-'); }
          out.push(encodeEscape(range[1]));
        }
      }
      out.push(']');
      return out.join('');
    }
  
    function allowAnywhereFoldCaseAndRenumberGroups(regex) {
      // Split into character sets, escape sequences, punctuation strings
      // like ('(', '(?:', ')', '^'), and runs of characters that do not
      // include any of the above.
      var parts = regex.source.match(
          new RegExp(
              '(?:'
              + '\\[(?:[^\\x5C\\x5D]|\\\\[\\s\\S])*\\]'  // a character set
              + '|\\\\u[A-Fa-f0-9]{4}'  // a unicode escape
              + '|\\\\x[A-Fa-f0-9]{2}'  // a hex escape
              + '|\\\\[0-9]+'  // a back-reference or octal escape
              + '|\\\\[^ux0-9]'  // other escape sequence
              + '|\\(\\?[:!=]'  // start of a non-capturing group
              + '|[\\(\\)\\^]'  // start/end of a group, or line start
              + '|[^\\x5B\\x5C\\(\\)\\^]+'  // run of other characters
              + ')',
              'g'));
      var n = parts.length;
  
      // Maps captured group numbers to the number they will occupy in
      // the output or to -1 if that has not been determined, or to
      // undefined if they need not be capturing in the output.
      var capturedGroups = [];
  
      // Walk over and identify back references to build the capturedGroups
      // mapping.
      for (var i = 0, groupIndex = 0; i < n; ++i) {
        var p = parts[i];
        if (p === '(') {
          // groups are 1-indexed, so max group index is count of '('
          ++groupIndex;
        } else if ('\\' === p.charAt(0)) {
          var decimalValue = +p.substring(1);
          if (decimalValue) {
            if (decimalValue <= groupIndex) {
              capturedGroups[decimalValue] = -1;
            } else {
              // Replace with an unambiguous escape sequence so that
              // an octal escape sequence does not turn into a backreference
              // to a capturing group from an earlier regex.
              parts[i] = encodeEscape(decimalValue);
            }
          }
        }
      }
  
      // Renumber groups and reduce capturing groups to non-capturing groups
      // where possible.
      for (var i = 1; i < capturedGroups.length; ++i) {
        if (-1 === capturedGroups[i]) {
          capturedGroups[i] = ++capturedGroupIndex;
        }
      }
      for (var i = 0, groupIndex = 0; i < n; ++i) {
        var p = parts[i];
        if (p === '(') {
          ++groupIndex;
          if (!capturedGroups[groupIndex]) {
            parts[i] = '(?:';
          }
        } else if ('\\' === p.charAt(0)) {
          var decimalValue = +p.substring(1);
          if (decimalValue && decimalValue <= groupIndex) {
            parts[i] = '\\' + capturedGroups[decimalValue];
          }
        }
      }
  
      // Remove any prefix anchors so that the output will match anywhere.
      // ^^ really does mean an anchored match though.
      for (var i = 0; i < n; ++i) {
        if ('^' === parts[i] && '^' !== parts[i + 1]) { parts[i] = ''; }
      }
  
      // Expand letters to groups to handle mixing of case-sensitive and
      // case-insensitive patterns if necessary.
      if (regex.ignoreCase && needToFoldCase) {
        for (var i = 0; i < n; ++i) {
          var p = parts[i];
          var ch0 = p.charAt(0);
          if (p.length >= 2 && ch0 === '[') {
            parts[i] = caseFoldCharset(p);
          } else if (ch0 !== '\\') {
            // TODO: handle letters in numeric escapes.
            parts[i] = p.replace(
                /[a-zA-Z]/g,
                function (ch) {
                  var cc = ch.charCodeAt(0);
                  return '[' + String.fromCharCode(cc & ~32, cc | 32) + ']';
                });
          }
        }
      }
  
      return parts.join('');
    }
  
    var rewritten = [];
    for (var i = 0, n = regexs.length; i < n; ++i) {
      var regex = regexs[i];
      if (regex.global || regex.multiline) { throw new Error('' + regex); }
      rewritten.push(
          '(?:' + allowAnywhereFoldCaseAndRenumberGroups(regex) + ')');
    }
  
    return new RegExp(rewritten.join('|'), ignoreCase ? 'gi' : 'g');
  }

  /**
   * Split markup into a string of source code and an array mapping ranges in
   * that string to the text nodes in which they appear.
   *
   * <p>
   * The HTML DOM structure:</p>
   * <pre>
   * (Element   "p"
   *   (Element "b"
   *     (Text  "print "))       ; #1
   *   (Text    "'Hello '")      ; #2
   *   (Element "br")            ; #3
   *   (Text    "  + 'World';")) ; #4
   * </pre>
   * <p>
   * corresponds to the HTML
   * {@code <p><b>print </b>'Hello '<br>  + 'World';</p>}.</p>
   *
   * <p>
   * It will produce the output:</p>
   * <pre>
   * {
   *   sourceCode: "print 'Hello '\n  + 'World';",
   *   //                     1          2
   *   //           012345678901234 5678901234567
   *   spans: [0, #1, 6, #2, 14, #3, 15, #4]
   * }
   * </pre>
   * <p>
   * where #1 is a reference to the {@code "print "} text node above, and so
   * on for the other text nodes.
   * </p>
   *
   * <p>
   * The {@code} spans array is an array of pairs.  Even elements are the start
   * indices of substrings, and odd elements are the text nodes (or BR elements)
   * that contain the text for those substrings.
   * Substrings continue until the next index or the end of the source.
   * </p>
   *
   * @param {Node} node an HTML DOM subtree containing source-code.
   * @param {boolean} isPreformatted true if white-space in text nodes should
   *    be considered significant.
   * @return {Object} source code and the text nodes in which they occur.
   */
  function extractSourceSpans(node, isPreformatted) {
    var nocode = /(?:^|\s)nocode(?:\s|$)/;
  
    var chunks = [];
    var length = 0;
    var spans = [];
    var k = 0;
  
    function walk(node) {
      var type = node.nodeType;
      if (type == 1) {  // Element
        if (nocode.test(node.className)) { return; }
        for (var child = node.firstChild; child; child = child.nextSibling) {
          walk(child);
        }
        var nodeName = node.nodeName.toLowerCase();
        if ('br' === nodeName || 'li' === nodeName) {
          chunks[k] = '\n';
          spans[k << 1] = length++;
          spans[(k++ << 1) | 1] = node;
        }
      } else if (type == 3 || type == 4) {  // Text
        var text = node.nodeValue;
        if (text.length) {
          if (!isPreformatted) {
            text = text.replace(/[ \t\r\n]+/g, ' ');
          } else {
            text = text.replace(/\r\n?/g, '\n');  // Normalize newlines.
          }
          // TODO: handle tabs here?
          chunks[k] = text;
          spans[k << 1] = length;
          length += text.length;
          spans[(k++ << 1) | 1] = node;
        }
      }
    }
  
    walk(node);
  
    return {
      sourceCode: chunks.join('').replace(/\n$/, ''),
      spans: spans
    };
  }

  /**
   * Apply the given language handler to sourceCode and add the resulting
   * decorations to out.
   * @param {number} basePos the index of sourceCode within the chunk of source
   *    whose decorations are already present on out.
   */
  function appendDecorations(basePos, sourceCode, langHandler, out) {
    if (!sourceCode) { return; }
    var job = {
      sourceCode: sourceCode,
      basePos: basePos
    };
    langHandler(job);
    out.push.apply(out, job.decorations);
  }

  var notWs = /\S/;

  /**
   * Given an element, if it contains only one child element and any text nodes
   * it contains contain only space characters, return the sole child element.
   * Otherwise returns undefined.
   * <p>
   * This is meant to return the CODE element in {@code <pre><code ...>} when
   * there is a single child element that contains all the non-space textual
   * content, but not to return anything where there are multiple child elements
   * as in {@code <pre><code>...</code><code>...</code></pre>} or when there
   * is textual content.
   */
  function childContentWrapper(element) {
    var wrapper = undefined;
    for (var c = element.firstChild; c; c = c.nextSibling) {
      var type = c.nodeType;
      wrapper = (type === 1)  // Element Node
          ? (wrapper ? element : c)
          : (type === 3)  // Text Node
          ? (notWs.test(c.nodeValue) ? element : wrapper)
          : wrapper;
    }
    return wrapper === element ? undefined : wrapper;
  }

  /** Given triples of [style, pattern, context] returns a lexing function,
    * The lexing function interprets the patterns to find token boundaries and
    * returns a decoration list of the form
    * [index_0, style_0, index_1, style_1, ..., index_n, style_n]
    * where index_n is an index into the sourceCode, and style_n is a style
    * constant like PR_PLAIN.  index_n-1 <= index_n, and style_n-1 applies to
    * all characters in sourceCode[index_n-1:index_n].
    *
    * The stylePatterns is a list whose elements have the form
    * [style : string, pattern : RegExp, DEPRECATED, shortcut : string].
    *
    * Style is a style constant like PR_PLAIN, or can be a string of the
    * form 'lang-FOO', where FOO is a language extension describing the
    * language of the portion of the token in $1 after pattern executes.
    * E.g., if style is 'lang-lisp', and group 1 contains the text
    * '(hello (world))', then that portion of the token will be passed to the
    * registered lisp handler for formatting.
    * The text before and after group 1 will be restyled using this decorator
    * so decorators should take care that this doesn't result in infinite
    * recursion.  For example, the HTML lexer rule for SCRIPT elements looks
    * something like ['lang-js', /<[s]cript>(.+?)<\/script>/].  This may match
    * '<script>foo()<\/script>', which would cause the current decorator to
    * be called with '<script>' which would not match the same rule since
    * group 1 must not be empty, so it would be instead styled as PR_TAG by
    * the generic tag rule.  The handler registered for the 'js' extension would
    * then be called with 'foo()', and finally, the current decorator would
    * be called with '<\/script>' which would not match the original rule and
    * so the generic tag rule would identify it as a tag.
    *
    * Pattern must only match prefixes, and if it matches a prefix, then that
    * match is considered a token with the same style.
    *
    * Context is applied to the last non-whitespace, non-comment token
    * recognized.
    *
    * Shortcut is an optional string of characters, any of which, if the first
    * character, gurantee that this pattern and only this pattern matches.
    *
    * @param {Array} shortcutStylePatterns patterns that always start with
    *   a known character.  Must have a shortcut string.
    * @param {Array} fallthroughStylePatterns patterns that will be tried in
    *   order if the shortcut ones fail.  May have shortcuts.
    *
    * @return {function (Object)} a
    *   function that takes source code and returns a list of decorations.
    */
  function createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns) {
    var shortcuts = {};
    var tokenizer;
    (function () {
      var allPatterns = shortcutStylePatterns.concat(fallthroughStylePatterns);
      var allRegexs = [];
      var regexKeys = {};
      for (var i = 0, n = allPatterns.length; i < n; ++i) {
        var patternParts = allPatterns[i];
        var shortcutChars = patternParts[3];
        if (shortcutChars) {
          for (var c = shortcutChars.length; --c >= 0;) {
            shortcuts[shortcutChars.charAt(c)] = patternParts;
          }
        }
        var regex = patternParts[1];
        var k = '' + regex;
        if (!regexKeys.hasOwnProperty(k)) {
          allRegexs.push(regex);
          regexKeys[k] = null;
        }
      }
      allRegexs.push(/[\0-\uffff]/);
      tokenizer = combinePrefixPatterns(allRegexs);
    })();

    var nPatterns = fallthroughStylePatterns.length;

    /**
     * Lexes job.sourceCode and produces an output array job.decorations of
     * style classes preceded by the position at which they start in
     * job.sourceCode in order.
     *
     * @param {Object} job an object like <pre>{
     *    sourceCode: {string} sourceText plain text,
     *    basePos: {int} position of job.sourceCode in the larger chunk of
     *        sourceCode.
     * }</pre>
     */
    var decorate = function (job) {
      var sourceCode = job.sourceCode, basePos = job.basePos;
      /** Even entries are positions in source in ascending order.  Odd enties
        * are style markers (e.g., PR_COMMENT) that run from that position until
        * the end.
        * @type {Array.<number|string>}
        */
      var decorations = [basePos, PR_PLAIN];
      var pos = 0;  // index into sourceCode
      var tokens = sourceCode.match(tokenizer) || [];
      var styleCache = {};

      for (var ti = 0, nTokens = tokens.length; ti < nTokens; ++ti) {
        var token = tokens[ti];
        var style = styleCache[token];
        var match = void 0;

        var isEmbedded;
        if (typeof style === 'string') {
          isEmbedded = false;
        } else {
          var patternParts = shortcuts[token.charAt(0)];
          if (patternParts) {
            match = token.match(patternParts[1]);
            style = patternParts[0];
          } else {
            for (var i = 0; i < nPatterns; ++i) {
              patternParts = fallthroughStylePatterns[i];
              match = token.match(patternParts[1]);
              if (match) {
                style = patternParts[0];
                break;
              }
            }

            if (!match) {  // make sure that we make progress
              style = PR_PLAIN;
            }
          }

          isEmbedded = style.length >= 5 && 'lang-' === style.substring(0, 5);
          if (isEmbedded && !(match && typeof match[1] === 'string')) {
            isEmbedded = false;
            style = PR_SOURCE;
          }

          if (!isEmbedded) { styleCache[token] = style; }
        }

        var tokenStart = pos;
        pos += token.length;

        if (!isEmbedded) {
          decorations.push(basePos + tokenStart, style);
        } else {  // Treat group 1 as an embedded block of source code.
          var embeddedSource = match[1];
          var embeddedSourceStart = token.indexOf(embeddedSource);
          var embeddedSourceEnd = embeddedSourceStart + embeddedSource.length;
          if (match[2]) {
            // If embeddedSource can be blank, then it would match at the
            // beginning which would cause us to infinitely recurse on the
            // entire token, so we catch the right context in match[2].
            embeddedSourceEnd = token.length - match[2].length;
            embeddedSourceStart = embeddedSourceEnd - embeddedSource.length;
          }
          var lang = style.substring(5);
          // Decorate the left of the embedded source
          appendDecorations(
              basePos + tokenStart,
              token.substring(0, embeddedSourceStart),
              decorate, decorations);
          // Decorate the embedded source
          appendDecorations(
              basePos + tokenStart + embeddedSourceStart,
              embeddedSource,
              langHandlerForExtension(lang, embeddedSource),
              decorations);
          // Decorate the right of the embedded section
          appendDecorations(
              basePos + tokenStart + embeddedSourceEnd,
              token.substring(embeddedSourceEnd),
              decorate, decorations);
        }
      }
      job.decorations = decorations;
    };
    return decorate;
  }

  /** returns a function that produces a list of decorations from source text.
    *
    * This code treats ", ', and ` as string delimiters, and \ as a string
    * escape.  It does not recognize perl's qq() style strings.
    * It has no special handling for double delimiter escapes as in basic, or
    * the tripled delimiters used in python, but should work on those regardless
    * although in those cases a single string literal may be broken up into
    * multiple adjacent string literals.
    *
    * It recognizes C, C++, and shell style comments.
    *
    * @param {Object} options a set of optional parameters.
    * @return {function (Object)} a function that examines the source code
    *     in the input job and builds the decoration list.
    */
  function sourceDecorator(options) {
    var shortcutStylePatterns = [], fallthroughStylePatterns = [];
    if (options['tripleQuotedStrings']) {
      // '''multi-line-string''', 'single-line-string', and double-quoted
      shortcutStylePatterns.push(
          [PR_STRING,  /^(?:\'\'\'(?:[^\'\\]|\\[\s\S]|\'{1,2}(?=[^\']))*(?:\'\'\'|$)|\"\"\"(?:[^\"\\]|\\[\s\S]|\"{1,2}(?=[^\"]))*(?:\"\"\"|$)|\'(?:[^\\\']|\\[\s\S])*(?:\'|$)|\"(?:[^\\\"]|\\[\s\S])*(?:\"|$))/,
           null, '\'"']);
    } else if (options['multiLineStrings']) {
      // 'multi-line-string', "multi-line-string"
      shortcutStylePatterns.push(
          [PR_STRING,  /^(?:\'(?:[^\\\']|\\[\s\S])*(?:\'|$)|\"(?:[^\\\"]|\\[\s\S])*(?:\"|$)|\`(?:[^\\\`]|\\[\s\S])*(?:\`|$))/,
           null, '\'"`']);
    } else {
      // 'single-line-string', "single-line-string"
      shortcutStylePatterns.push(
          [PR_STRING,
           /^(?:\'(?:[^\\\'\r\n]|\\.)*(?:\'|$)|\"(?:[^\\\"\r\n]|\\.)*(?:\"|$))/,
           null, '"\'']);
    }
    if (options['verbatimStrings']) {
      // verbatim-string-literal production from the C# grammar.  See issue 93.
      fallthroughStylePatterns.push(
          [PR_STRING, /^@\"(?:[^\"]|\"\")*(?:\"|$)/, null]);
    }
    var hc = options['hashComments'];
    if (hc) {
      if (options['cStyleComments']) {
        if (hc > 1) {  // multiline hash comments
          shortcutStylePatterns.push(
              [PR_COMMENT, /^#(?:##(?:[^#]|#(?!##))*(?:###|$)|.*)/, null, '#']);
        } else {
          // Stop C preprocessor declarations at an unclosed open comment
          shortcutStylePatterns.push(
              [PR_COMMENT, /^#(?:(?:define|e(?:l|nd)if|else|error|ifn?def|include|line|pragma|undef|warning)\b|[^\r\n]*)/,
               null, '#']);
        }
        // #include <stdio.h>
        fallthroughStylePatterns.push(
            [PR_STRING,
             /^<(?:(?:(?:\.\.\/)*|\/?)(?:[\w-]+(?:\/[\w-]+)+)?[\w-]+\.h(?:h|pp|\+\+)?|[a-z]\w*)>/,
             null]);
      } else {
        shortcutStylePatterns.push([PR_COMMENT, /^#[^\r\n]*/, null, '#']);
      }
    }
    if (options['cStyleComments']) {
      fallthroughStylePatterns.push([PR_COMMENT, /^\/\/[^\r\n]*/, null]);
      fallthroughStylePatterns.push(
          [PR_COMMENT, /^\/\*[\s\S]*?(?:\*\/|$)/, null]);
    }
    var regexLiterals = options['regexLiterals'];
    if (regexLiterals) {
      /**
       * @const
       */
      var regexExcls = regexLiterals > 1
        ? ''  // Multiline regex literals
        : '\n\r';
      /**
       * @const
       */
      var regexAny = regexExcls ? '.' : '[\\S\\s]';
      /**
       * @const
       */
      var REGEX_LITERAL = (
          // A regular expression literal starts with a slash that is
          // not followed by * or / so that it is not confused with
          // comments.
          '/(?=[^/*' + regexExcls + '])'
          // and then contains any number of raw characters,
          + '(?:[^/\\x5B\\x5C' + regexExcls + ']'
          // escape sequences (\x5C),
          +    '|\\x5C' + regexAny
          // or non-nesting character sets (\x5B\x5D);
          +    '|\\x5B(?:[^\\x5C\\x5D' + regexExcls + ']'
          +             '|\\x5C' + regexAny + ')*(?:\\x5D|$))+'
          // finally closed by a /.
          + '/');
      fallthroughStylePatterns.push(
          ['lang-regex',
           RegExp('^' + REGEXP_PRECEDER_PATTERN + '(' + REGEX_LITERAL + ')')
           ]);
    }

    var types = options['types'];
    if (types) {
      fallthroughStylePatterns.push([PR_TYPE, types]);
    }

    var keywords = ("" + options['keywords']).replace(/^ | $/g, '');
    if (keywords.length) {
      fallthroughStylePatterns.push(
          [PR_KEYWORD,
           new RegExp('^(?:' + keywords.replace(/[\s,]+/g, '|') + ')\\b'),
           null]);
    }

    shortcutStylePatterns.push([PR_PLAIN,       /^\s+/, null, ' \r\n\t\xA0']);

    var punctuation =
      // The Bash man page says

      // A word is a sequence of characters considered as a single
      // unit by GRUB. Words are separated by metacharacters,
      // which are the following plus space, tab, and newline: { }
      // | & $ ; < >
      // ...
      
      // A word beginning with # causes that word and all remaining
      // characters on that line to be ignored.

      // which means that only a '#' after /(?:^|[{}|&$;<>\s])/ starts a
      // comment but empirically
      // $ echo {#}
      // {#}
      // $ echo \$#
      // $#
      // $ echo }#
      // }#

      // so /(?:^|[|&;<>\s])/ is more appropriate.

      // http://gcc.gnu.org/onlinedocs/gcc-2.95.3/cpp_1.html#SEC3
      // suggests that this definition is compatible with a
      // default mode that tries to use a single token definition
      // to recognize both bash/python style comments and C
      // preprocessor directives.

      // This definition of punctuation does not include # in the list of
      // follow-on exclusions, so # will not be broken before if preceeded
      // by a punctuation character.  We could try to exclude # after
      // [|&;<>] but that doesn't seem to cause many major problems.
      // If that does turn out to be a problem, we should change the below
      // when hc is truthy to include # in the run of punctuation characters
      // only when not followint [|&;<>].
      '^.[^\\s\\w.$@\'"`/\\\\]*';
    if (options['regexLiterals']) {
      punctuation += '(?!\s*\/)';
    }

    fallthroughStylePatterns.push(
        // TODO(mikesamuel): recognize non-latin letters and numerals in idents
        [PR_LITERAL,     /^@[a-z_$][a-z_$@0-9]*/i, null],
        [PR_TYPE,        /^(?:[@_]?[A-Z]+[a-z][A-Za-z_$@0-9]*|\w+_t\b)/, null],
        [PR_PLAIN,       /^[a-z_$][a-z_$@0-9]*/i, null],
        [PR_LITERAL,
         new RegExp(
             '^(?:'
             // A hex number
             + '0x[a-f0-9]+'
             // or an octal or decimal number,
             + '|(?:\\d(?:_\\d+)*\\d*(?:\\.\\d*)?|\\.\\d\\+)'
             // possibly in scientific notation
             + '(?:e[+\\-]?\\d+)?'
             + ')'
             // with an optional modifier like UL for unsigned long
             + '[a-z]*', 'i'),
         null, '0123456789'],
        // Don't treat escaped quotes in bash as starting strings.
        // See issue 144.
        [PR_PLAIN,       /^\\[\s\S]?/, null],
        [PR_PUNCTUATION, new RegExp(punctuation), null]);

    return createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns);
  }

  var decorateSource = sourceDecorator({
        'keywords': ALL_KEYWORDS,
        'hashComments': true,
        'cStyleComments': true,
        'multiLineStrings': true,
        'regexLiterals': true
      });

  /**
   * Given a DOM subtree, wraps it in a list, and puts each line into its own
   * list item.
   *
   * @param {Node} node modified in place.  Its content is pulled into an
   *     HTMLOListElement, and each line is moved into a separate list item.
   *     This requires cloning elements, so the input might not have unique
   *     IDs after numbering.
   * @param {boolean} isPreformatted true iff white-space in text nodes should
   *     be treated as significant.
   */
  function numberLines(node, opt_startLineNum, isPreformatted) {
    var nocode = /(?:^|\s)nocode(?:\s|$)/;
    var lineBreak = /\r\n?|\n/;
  
    var document = node.ownerDocument;
  
    var li = document.createElement('li');
    while (node.firstChild) {
      li.appendChild(node.firstChild);
    }
    // An array of lines.  We split below, so this is initialized to one
    // un-split line.
    var listItems = [li];
  
    function walk(node) {
      var type = node.nodeType;
      if (type == 1 && !nocode.test(node.className)) {  // Element
        if ('br' === node.nodeName) {
          breakAfter(node);
          // Discard the <BR> since it is now flush against a </LI>.
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        } else {
          for (var child = node.firstChild; child; child = child.nextSibling) {
            walk(child);
          }
        }
      } else if ((type == 3 || type == 4) && isPreformatted) {  // Text
        var text = node.nodeValue;
        var match = text.match(lineBreak);
        if (match) {
          var firstLine = text.substring(0, match.index);
          node.nodeValue = firstLine;
          var tail = text.substring(match.index + match[0].length);
          if (tail) {
            var parent = node.parentNode;
            parent.insertBefore(
              document.createTextNode(tail), node.nextSibling);
          }
          breakAfter(node);
          if (!firstLine) {
            // Don't leave blank text nodes in the DOM.
            node.parentNode.removeChild(node);
          }
        }
      }
    }
  
    // Split a line after the given node.
    function breakAfter(lineEndNode) {
      // If there's nothing to the right, then we can skip ending the line
      // here, and move root-wards since splitting just before an end-tag
      // would require us to create a bunch of empty copies.
      while (!lineEndNode.nextSibling) {
        lineEndNode = lineEndNode.parentNode;
        if (!lineEndNode) { return; }
      }
  
      function breakLeftOf(limit, copy) {
        // Clone shallowly if this node needs to be on both sides of the break.
        var rightSide = copy ? limit.cloneNode(false) : limit;
        var parent = limit.parentNode;
        if (parent) {
          // We clone the parent chain.
          // This helps us resurrect important styling elements that cross lines.
          // E.g. in <i>Foo<br>Bar</i>
          // should be rewritten to <li><i>Foo</i></li><li><i>Bar</i></li>.
          var parentClone = breakLeftOf(parent, 1);
          // Move the clone and everything to the right of the original
          // onto the cloned parent.
          var next = limit.nextSibling;
          parentClone.appendChild(rightSide);
          for (var sibling = next; sibling; sibling = next) {
            next = sibling.nextSibling;
            parentClone.appendChild(sibling);
          }
        }
        return rightSide;
      }
  
      var copiedListItem = breakLeftOf(lineEndNode.nextSibling, 0);
  
      // Walk the parent chain until we reach an unattached LI.
      for (var parent;
           // Check nodeType since IE invents document fragments.
           (parent = copiedListItem.parentNode) && parent.nodeType === 1;) {
        copiedListItem = parent;
      }
      // Put it on the list of lines for later processing.
      listItems.push(copiedListItem);
    }
  
    // Split lines while there are lines left to split.
    for (var i = 0;  // Number of lines that have been split so far.
         i < listItems.length;  // length updated by breakAfter calls.
         ++i) {
      walk(listItems[i]);
    }
  
    // Make sure numeric indices show correctly.
    if (opt_startLineNum === (opt_startLineNum|0)) {
      listItems[0].setAttribute('value', opt_startLineNum);
    }
  
    var ol = document.createElement('ol');
    ol.className = 'linenums';
    var offset = Math.max(0, ((opt_startLineNum - 1 /* zero index */)) | 0) || 0;
    for (var i = 0, n = listItems.length; i < n; ++i) {
      li = listItems[i];
      // Stick a class on the LIs so that stylesheets can
      // color odd/even rows, or any other row pattern that
      // is co-prime with 10.
      li.className = 'L' + ((i + offset) % 10);
      if (!li.firstChild) {
        li.appendChild(document.createTextNode('\xA0'));
      }
      ol.appendChild(li);
    }
  
    node.appendChild(ol);
  }
  /**
   * Breaks {@code job.sourceCode} around style boundaries in
   * {@code job.decorations} and modifies {@code job.sourceNode} in place.
   * @param {Object} job like <pre>{
   *    sourceCode: {string} source as plain text,
   *    sourceNode: {HTMLElement} the element containing the source,
   *    spans: {Array.<number|Node>} alternating span start indices into source
   *       and the text node or element (e.g. {@code <BR>}) corresponding to that
   *       span.
   *    decorations: {Array.<number|string} an array of style classes preceded
   *       by the position at which they start in job.sourceCode in order
   * }</pre>
   * @private
   */
  function recombineTagsAndDecorations(job) {
    var isIE8OrEarlier = /\bMSIE\s(\d+)/.exec(navigator.userAgent);
    isIE8OrEarlier = isIE8OrEarlier && +isIE8OrEarlier[1] <= 8;
    var newlineRe = /\n/g;
  
    var source = job.sourceCode;
    var sourceLength = source.length;
    // Index into source after the last code-unit recombined.
    var sourceIndex = 0;
  
    var spans = job.spans;
    var nSpans = spans.length;
    // Index into spans after the last span which ends at or before sourceIndex.
    var spanIndex = 0;
  
    var decorations = job.decorations;
    var nDecorations = decorations.length;
    // Index into decorations after the last decoration which ends at or before
    // sourceIndex.
    var decorationIndex = 0;
  
    // Remove all zero-length decorations.
    decorations[nDecorations] = sourceLength;
    var decPos, i;
    for (i = decPos = 0; i < nDecorations;) {
      if (decorations[i] !== decorations[i + 2]) {
        decorations[decPos++] = decorations[i++];
        decorations[decPos++] = decorations[i++];
      } else {
        i += 2;
      }
    }
    nDecorations = decPos;
  
    // Simplify decorations.
    for (i = decPos = 0; i < nDecorations;) {
      var startPos = decorations[i];
      // Conflate all adjacent decorations that use the same style.
      var startDec = decorations[i + 1];
      var end = i + 2;
      while (end + 2 <= nDecorations && decorations[end + 1] === startDec) {
        end += 2;
      }
      decorations[decPos++] = startPos;
      decorations[decPos++] = startDec;
      i = end;
    }
  
    nDecorations = decorations.length = decPos;
  
    var sourceNode = job.sourceNode;
    var oldDisplay;
    if (sourceNode) {
      oldDisplay = sourceNode.style.display;
      sourceNode.style.display = 'none';
    }
    try {
      var decoration = null;
      while (spanIndex < nSpans) {
        var spanStart = spans[spanIndex];
        var spanEnd = spans[spanIndex + 2] || sourceLength;
  
        var decEnd = decorations[decorationIndex + 2] || sourceLength;
  
        var end = Math.min(spanEnd, decEnd);
  
        var textNode = spans[spanIndex + 1];
        var styledText;
        if (textNode.nodeType !== 1  // Don't muck with <BR>s or <LI>s
            // Don't introduce spans around empty text nodes.
            && (styledText = source.substring(sourceIndex, end))) {
          // This may seem bizarre, and it is.  Emitting LF on IE causes the
          // code to display with spaces instead of line breaks.
          // Emitting Windows standard issue linebreaks (CRLF) causes a blank
          // space to appear at the beginning of every line but the first.
          // Emitting an old Mac OS 9 line separator makes everything spiffy.
          if (isIE8OrEarlier) {
            styledText = styledText.replace(newlineRe, '\r');
          }
          textNode.nodeValue = styledText;
          var document = textNode.ownerDocument;
          var span = document.createElement('span');
          span.className = decorations[decorationIndex + 1];
          var parentNode = textNode.parentNode;
          parentNode.replaceChild(span, textNode);
          span.appendChild(textNode);
          if (sourceIndex < spanEnd) {  // Split off a text node.
            spans[spanIndex + 1] = textNode
                // TODO: Possibly optimize by using '' if there's no flicker.
                = document.createTextNode(source.substring(end, spanEnd));
            parentNode.insertBefore(textNode, span.nextSibling);
          }
        }
  
        sourceIndex = end;
  
        if (sourceIndex >= spanEnd) {
          spanIndex += 2;
        }
        if (sourceIndex >= decEnd) {
          decorationIndex += 2;
        }
      }
    } finally {
      if (sourceNode) {
        sourceNode.style.display = oldDisplay;
      }
    }
  }

  /** Maps language-specific file extensions to handlers. */
  var langHandlerRegistry = {};
  /** Register a language handler for the given file extensions.
    * @param {function (Object)} handler a function from source code to a list
    *      of decorations.  Takes a single argument job which describes the
    *      state of the computation.   The single parameter has the form
    *      {@code {
    *        sourceCode: {string} as plain text.
    *        decorations: {Array.<number|string>} an array of style classes
    *                     preceded by the position at which they start in
    *                     job.sourceCode in order.
    *                     The language handler should assigned this field.
    *        basePos: {int} the position of source in the larger source chunk.
    *                 All positions in the output decorations array are relative
    *                 to the larger source chunk.
    *      } }
    * @param {Array.<string>} fileExtensions
    */
  function registerLangHandler(handler, fileExtensions) {
    for (var i = fileExtensions.length; --i >= 0;) {
      var ext = fileExtensions[i];
      if (!langHandlerRegistry.hasOwnProperty(ext)) {
        langHandlerRegistry[ext] = handler;
      } else if (win['console']) {
        console['warn']('cannot override language handler %s', ext);
      }
    }
  }
  function langHandlerForExtension(extension, source) {
    if (!(extension && langHandlerRegistry.hasOwnProperty(extension))) {
      // Treat it as markup if the first non whitespace character is a < and
      // the last non-whitespace character is a >.
      extension = /^\s*</.test(source)
          ? 'default-markup'
          : 'default-code';
    }
    return langHandlerRegistry[extension];
  }
  registerLangHandler(decorateSource, ['default-code']);
  registerLangHandler(
      createSimpleLexer(
          [],
          [
           [PR_PLAIN,       /^[^<?]+/],
           [PR_DECLARATION, /^<!\w[^>]*(?:>|$)/],
           [PR_COMMENT,     /^<\!--[\s\S]*?(?:-\->|$)/],
           // Unescaped content in an unknown language
           ['lang-',        /^<\?([\s\S]+?)(?:\?>|$)/],
           ['lang-',        /^<%([\s\S]+?)(?:%>|$)/],
           [PR_PUNCTUATION, /^(?:<[%?]|[%?]>)/],
           ['lang-',        /^<xmp\b[^>]*>([\s\S]+?)<\/xmp\b[^>]*>/i],
           // Unescaped content in javascript.  (Or possibly vbscript).
           ['lang-js',      /^<script\b[^>]*>([\s\S]*?)(<\/script\b[^>]*>)/i],
           // Contains unescaped stylesheet content
           ['lang-css',     /^<style\b[^>]*>([\s\S]*?)(<\/style\b[^>]*>)/i],
           ['lang-in.tag',  /^(<\/?[a-z][^<>]*>)/i]
          ]),
      ['default-markup', 'htm', 'html', 'mxml', 'xhtml', 'xml', 'xsl']);
  registerLangHandler(
      createSimpleLexer(
          [
           [PR_PLAIN,        /^[\s]+/, null, ' \t\r\n'],
           [PR_ATTRIB_VALUE, /^(?:\"[^\"]*\"?|\'[^\']*\'?)/, null, '\"\'']
           ],
          [
           [PR_TAG,          /^^<\/?[a-z](?:[\w.:-]*\w)?|\/?>$/i],
           [PR_ATTRIB_NAME,  /^(?!style[\s=]|on)[a-z](?:[\w:-]*\w)?/i],
           ['lang-uq.val',   /^=\s*([^>\'\"\s]*(?:[^>\'\"\s\/]|\/(?=\s)))/],
           [PR_PUNCTUATION,  /^[=<>\/]+/],
           ['lang-js',       /^on\w+\s*=\s*\"([^\"]+)\"/i],
           ['lang-js',       /^on\w+\s*=\s*\'([^\']+)\'/i],
           ['lang-js',       /^on\w+\s*=\s*([^\"\'>\s]+)/i],
           ['lang-css',      /^style\s*=\s*\"([^\"]+)\"/i],
           ['lang-css',      /^style\s*=\s*\'([^\']+)\'/i],
           ['lang-css',      /^style\s*=\s*([^\"\'>\s]+)/i]
           ]),
      ['in.tag']);
  registerLangHandler(
      createSimpleLexer([], [[PR_ATTRIB_VALUE, /^[\s\S]+/]]), ['uq.val']);
  registerLangHandler(sourceDecorator({
          'keywords': CPP_KEYWORDS,
          'hashComments': true,
          'cStyleComments': true,
          'types': C_TYPES
        }), ['c', 'cc', 'cpp', 'cxx', 'cyc', 'm']);
  registerLangHandler(sourceDecorator({
          'keywords': 'null,true,false'
        }), ['json']);
  registerLangHandler(sourceDecorator({
          'keywords': CSHARP_KEYWORDS,
          'hashComments': true,
          'cStyleComments': true,
          'verbatimStrings': true,
          'types': C_TYPES
        }), ['cs']);
  registerLangHandler(sourceDecorator({
          'keywords': JAVA_KEYWORDS,
          'cStyleComments': true
        }), ['java']);
  registerLangHandler(sourceDecorator({
          'keywords': SH_KEYWORDS,
          'hashComments': true,
          'multiLineStrings': true
        }), ['bash', 'bsh', 'csh', 'sh']);
  registerLangHandler(sourceDecorator({
          'keywords': PYTHON_KEYWORDS,
          'hashComments': true,
          'multiLineStrings': true,
          'tripleQuotedStrings': true
        }), ['cv', 'py', 'python']);
  registerLangHandler(sourceDecorator({
          'keywords': PERL_KEYWORDS,
          'hashComments': true,
          'multiLineStrings': true,
          'regexLiterals': 2  // multiline regex literals
        }), ['perl', 'pl', 'pm']);
  registerLangHandler(sourceDecorator({
          'keywords': RUBY_KEYWORDS,
          'hashComments': true,
          'multiLineStrings': true,
          'regexLiterals': true
        }), ['rb', 'ruby']);
  registerLangHandler(sourceDecorator({
          'keywords': JSCRIPT_KEYWORDS,
          'cStyleComments': true,
          'regexLiterals': true
        }), ['javascript', 'js']);
  registerLangHandler(sourceDecorator({
          'keywords': COFFEE_KEYWORDS,
          'hashComments': 3,  // ### style block comments
          'cStyleComments': true,
          'multilineStrings': true,
          'tripleQuotedStrings': true,
          'regexLiterals': true
        }), ['coffee']);
  registerLangHandler(sourceDecorator({
          'keywords': RUST_KEYWORDS,
          'cStyleComments': true,
          'multilineStrings': true
        }), ['rc', 'rs', 'rust']);
  registerLangHandler(
      createSimpleLexer([], [[PR_STRING, /^[\s\S]+/]]), ['regex']);

  function applyDecorator(job) {
    var opt_langExtension = job.langExtension;

    try {
      // Extract tags, and convert the source code to plain text.
      var sourceAndSpans = extractSourceSpans(job.sourceNode, job.pre);
      /** Plain text. @type {string} */
      var source = sourceAndSpans.sourceCode;
      job.sourceCode = source;
      job.spans = sourceAndSpans.spans;
      job.basePos = 0;

      // Apply the appropriate language handler
      langHandlerForExtension(opt_langExtension, source)(job);

      // Integrate the decorations and tags back into the source code,
      // modifying the sourceNode in place.
      recombineTagsAndDecorations(job);
    } catch (e) {
      if (win['console']) {
        console['log'](e && e['stack'] || e);
      }
    }
  }

  /**
   * Pretty print a chunk of code.
   * @param sourceCodeHtml {string} The HTML to pretty print.
   * @param opt_langExtension {string} The language name to use.
   *     Typically, a filename extension like 'cpp' or 'java'.
   * @param opt_numberLines {number|boolean} True to number lines,
   *     or the 1-indexed number of the first line in sourceCodeHtml.
   */
  function $prettyPrintOne(sourceCodeHtml, opt_langExtension, opt_numberLines) {
    var container = document.createElement('div');
    // This could cause images to load and onload listeners to fire.
    // E.g. <img onerror="alert(1337)" src="nosuchimage.png">.
    // We assume that the inner HTML is from a trusted source.
    // The pre-tag is required for IE8 which strips newlines from innerHTML
    // when it is injected into a <pre> tag.
    // http://stackoverflow.com/questions/451486/pre-tag-loses-line-breaks-when-setting-innerhtml-in-ie
    // http://stackoverflow.com/questions/195363/inserting-a-newline-into-a-pre-tag-ie-javascript
    container.innerHTML = '<pre>' + sourceCodeHtml + '</pre>';
    container = container.firstChild;
    if (opt_numberLines) {
      numberLines(container, opt_numberLines, true);
    }

    var job = {
      langExtension: opt_langExtension,
      numberLines: opt_numberLines,
      sourceNode: container,
      pre: 1
    };
    applyDecorator(job);
    return container.innerHTML;
  }

   /**
    * Find all the {@code <pre>} and {@code <code>} tags in the DOM with
    * {@code class=prettyprint} and prettify them.
    *
    * @param {Function} opt_whenDone called when prettifying is done.
    * @param {HTMLElement|HTMLDocument} opt_root an element or document
    *   containing all the elements to pretty print.
    *   Defaults to {@code document.body}.
    */
  function $prettyPrint(opt_whenDone, opt_root) {
    var root = opt_root || document.body;
    var doc = root.ownerDocument || document;
    function byTagName(tn) { return root.getElementsByTagName(tn); }
    // fetch a list of nodes to rewrite
    var codeSegments = [byTagName('pre'), byTagName('code'), byTagName('xmp')];
    var elements = [];
    for (var i = 0; i < codeSegments.length; ++i) {
      for (var j = 0, n = codeSegments[i].length; j < n; ++j) {
        elements.push(codeSegments[i][j]);
      }
    }
    codeSegments = null;

    var clock = Date;
    if (!clock['now']) {
      clock = { 'now': function () { return +(new Date); } };
    }

    // The loop is broken into a series of continuations to make sure that we
    // don't make the browser unresponsive when rewriting a large page.
    var k = 0;
    var prettyPrintingJob;

    var langExtensionRe = /\blang(?:uage)?-([\w.]+)(?!\S)/;
    var prettyPrintRe = /\bprettyprint\b/;
    var prettyPrintedRe = /\bprettyprinted\b/;
    var preformattedTagNameRe = /pre|xmp/i;
    var codeRe = /^code$/i;
    var preCodeXmpRe = /^(?:pre|code|xmp)$/i;
    var EMPTY = {};

    function doWork() {
      var endTime = (win['PR_SHOULD_USE_CONTINUATION'] ?
                     clock['now']() + 250 /* ms */ :
                     Infinity);
      for (; k < elements.length && clock['now']() < endTime; k++) {
        var cs = elements[k];

        // Look for a preceding comment like
        // <?prettify lang="..." linenums="..."?>
        var attrs = EMPTY;
        {
          for (var preceder = cs; (preceder = preceder.previousSibling);) {
            var nt = preceder.nodeType;
            // <?foo?> is parsed by HTML 5 to a comment node (8)
            // like <!--?foo?-->, but in XML is a processing instruction
            var value = (nt === 7 || nt === 8) && preceder.nodeValue;
            if (value
                ? !/^\??prettify\b/.test(value)
                : (nt !== 3 || /\S/.test(preceder.nodeValue))) {
              // Skip over white-space text nodes but not others.
              break;
            }
            if (value) {
              attrs = {};
              value.replace(
                  /\b(\w+)=([\w:.%+-]+)/g,
                function (_, name, value) { attrs[name] = value; });
              break;
            }
          }
        }

        var className = cs.className;
        if ((attrs !== EMPTY || prettyPrintRe.test(className))
            // Don't redo this if we've already done it.
            // This allows recalling pretty print to just prettyprint elements
            // that have been added to the page since last call.
            && !prettyPrintedRe.test(className)) {

          // make sure this is not nested in an already prettified element
          var nested = false;
          for (var p = cs.parentNode; p; p = p.parentNode) {
            var tn = p.tagName;
            if (preCodeXmpRe.test(tn)
                && p.className && prettyPrintRe.test(p.className)) {
              nested = true;
              break;
            }
          }
          if (!nested) {
            // Mark done.  If we fail to prettyprint for whatever reason,
            // we shouldn't try again.
            cs.className += ' prettyprinted';

            // If the classes includes a language extensions, use it.
            // Language extensions can be specified like
            //     <pre class="prettyprint lang-cpp">
            // the language extension "cpp" is used to find a language handler
            // as passed to PR.registerLangHandler.
            // HTML5 recommends that a language be specified using "language-"
            // as the prefix instead.  Google Code Prettify supports both.
            // http://dev.w3.org/html5/spec-author-view/the-code-element.html
            var langExtension = attrs['lang'];
            if (!langExtension) {
              langExtension = className.match(langExtensionRe);
              // Support <pre class="prettyprint"><code class="language-c">
              var wrapper;
              if (!langExtension && (wrapper = childContentWrapper(cs))
                  && codeRe.test(wrapper.tagName)) {
                langExtension = wrapper.className.match(langExtensionRe);
              }

              if (langExtension) { langExtension = langExtension[1]; }
            }

            var preformatted;
            if (preformattedTagNameRe.test(cs.tagName)) {
              preformatted = 1;
            } else {
              var currentStyle = cs['currentStyle'];
              var defaultView = doc.defaultView;
              var whitespace = (
                  currentStyle
                  ? currentStyle['whiteSpace']
                  : (defaultView
                     && defaultView.getComputedStyle)
                  ? defaultView.getComputedStyle(cs, null)
                  .getPropertyValue('white-space')
                  : 0);
              preformatted = whitespace
                  && 'pre' === whitespace.substring(0, 3);
            }

            // Look for a class like linenums or linenums:<n> where <n> is the
            // 1-indexed number of the first line.
            var lineNums = attrs['linenums'];
            if (!(lineNums = lineNums === 'true' || +lineNums)) {
              lineNums = className.match(/\blinenums\b(?::(\d+))?/);
              lineNums =
                lineNums
                ? lineNums[1] && lineNums[1].length
                  ? +lineNums[1] : true
                : false;
            }
            if (lineNums) { numberLines(cs, lineNums, preformatted); }

            // do the pretty printing
            prettyPrintingJob = {
              langExtension: langExtension,
              sourceNode: cs,
              numberLines: lineNums,
              pre: preformatted
            };
            applyDecorator(prettyPrintingJob);
          }
        }
      }
      if (k < elements.length) {
        // finish up in a continuation
        setTimeout(doWork, 250);
      } else if ('function' === typeof opt_whenDone) {
        opt_whenDone();
      }
    }

    doWork();
  }

  /**
   * Contains functions for creating and registering new language handlers.
   * @type {Object}
   */
  var PR = win['PR'] = {
        'createSimpleLexer': createSimpleLexer,
        'registerLangHandler': registerLangHandler,
        'sourceDecorator': sourceDecorator,
        'PR_ATTRIB_NAME': PR_ATTRIB_NAME,
        'PR_ATTRIB_VALUE': PR_ATTRIB_VALUE,
        'PR_COMMENT': PR_COMMENT,
        'PR_DECLARATION': PR_DECLARATION,
        'PR_KEYWORD': PR_KEYWORD,
        'PR_LITERAL': PR_LITERAL,
        'PR_NOCODE': PR_NOCODE,
        'PR_PLAIN': PR_PLAIN,
        'PR_PUNCTUATION': PR_PUNCTUATION,
        'PR_SOURCE': PR_SOURCE,
        'PR_STRING': PR_STRING,
        'PR_TAG': PR_TAG,
        'PR_TYPE': PR_TYPE,
        'prettyPrintOne':
           IN_GLOBAL_SCOPE
             ? (win['prettyPrintOne'] = $prettyPrintOne)
             : (prettyPrintOne = $prettyPrintOne),
        'prettyPrint': prettyPrint =
           IN_GLOBAL_SCOPE
             ? (win['prettyPrint'] = $prettyPrint)
             : (prettyPrint = $prettyPrint)
      };

  // Make PR available via the Asynchronous Module Definition (AMD) API.
  // Per https://github.com/amdjs/amdjs-api/wiki/AMD:
  // The Asynchronous Module Definition (AMD) API specifies a
  // mechanism for defining modules such that the module and its
  // dependencies can be asynchronously loaded.
  // ...
  // To allow a clear indicator that a global define function (as
  // needed for script src browser loading) conforms to the AMD API,
  // any global define function SHOULD have a property called "amd"
  // whose value is an object. This helps avoid conflict with any
  // other existing JavaScript code that could have defined a define()
  // function that does not conform to the AMD API.
  if (typeof define === "function" && define['amd']) {
    define("google-code-prettify", [], function () {
      return PR; 
    });
  }
})();
// Copyright (C) 2009 Onno Hommes.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * Registers a language handler for the AGC/AEA Assembly Language as described
 * at http://virtualagc.googlecode.com
 * <p>
 * This file could be used by goodle code to allow syntax highlight for
 * Virtual AGC SVN repository or if you don't want to commonize
 * the header for the agc/aea html assembly listing.
 *
 * @author ohommes@alumni.cmu.edu
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // A line comment that starts with ;
         [PR['PR_COMMENT'],     /^#[^\r\n]*/, null, '#'],
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // A double quoted, possibly multi-line, string.
         [PR['PR_STRING'],      /^\"(?:[^\"\\]|\\[\s\S])*(?:\"|$)/, null, '"']
        ],
        [
         [PR['PR_KEYWORD'], /^(?:ADS|AD|AUG|BZF|BZMF|CAE|CAF|CA|CCS|COM|CS|DAS|DCA|DCOM|DCS|DDOUBL|DIM|DOUBLE|DTCB|DTCF|DV|DXCH|EDRUPT|EXTEND|INCR|INDEX|NDX|INHINT|LXCH|MASK|MSK|MP|MSU|NOOP|OVSK|QXCH|RAND|READ|RELINT|RESUME|RETURN|ROR|RXOR|SQUARE|SU|TCR|TCAA|OVSK|TCF|TC|TS|WAND|WOR|WRITE|XCH|XLQ|XXALQ|ZL|ZQ|ADD|ADZ|SUB|SUZ|MPY|MPR|MPZ|DVP|COM|ABS|CLA|CLZ|LDQ|STO|STQ|ALS|LLS|LRS|TRA|TSQ|TMI|TOV|AXT|TIX|DLY|INP|OUT)\s/,null],
         [PR['PR_TYPE'], /^(?:-?GENADR|=MINUS|2BCADR|VN|BOF|MM|-?2CADR|-?[1-6]DNADR|ADRES|BBCON|[SE]?BANK\=?|BLOCK|BNKSUM|E?CADR|COUNT\*?|2?DEC\*?|-?DNCHAN|-?DNPTR|EQUALS|ERASE|MEMORY|2?OCT|REMADR|SETLOC|SUBRO|ORG|BSS|BES|SYN|EQU|DEFINE|END)\s/,null],
         // A single quote possibly followed by a word that optionally ends with
         // = ! or ?.
         [PR['PR_LITERAL'],
          /^\'(?:-*(?:\w|\\[\x21-\x7e])(?:[\w-]*|\\[\x21-\x7e])[=!?]?)?/],
         // Any word including labels that optionally ends with = ! or ?.
         [PR['PR_PLAIN'],
          /^-*(?:[!-z_]|\\[\x21-\x7e])(?:[\w-]*|\\[\x21-\x7e])[=!?]?/i],
         // A printable non-space non-special character
         [PR['PR_PUNCTUATION'], /^[^\w\t\n\r \xA0()\"\\\';]+/]
        ]),
    ['apollo', 'agc', 'aea']);
// Contributed by peter dot kofler at code minus cop dot org

/**
 * @fileoverview
 * Registers a language handler for Basic.
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-basic">(my BASIC code)</pre>
 *
 * @author peter dot kofler at code minus cop dot org
 */


PR.registerLangHandler(
    PR.createSimpleLexer(
        [ // shortcutStylePatterns
          // "single-line-string"
          [PR.PR_STRING,        /^(?:"(?:[^\\"\r\n]|\\.)*(?:"|$))/, null, '"'],
          // Whitespace
          [PR.PR_PLAIN,         /^\s+/, null, ' \r\n\t\xA0']
        ],
        [ // fallthroughStylePatterns
          // A line comment that starts with REM
          [PR.PR_COMMENT,       /^REM[^\r\n]*/, null],
          [PR.PR_KEYWORD,       /^\b(?:AND|CLOSE|CLR|CMD|CONT|DATA|DEF ?FN|DIM|END|FOR|GET|GOSUB|GOTO|IF|INPUT|LET|LIST|LOAD|NEW|NEXT|NOT|ON|OPEN|OR|POKE|PRINT|READ|RESTORE|RETURN|RUN|SAVE|STEP|STOP|SYS|THEN|TO|VERIFY|WAIT)\b/, null],
          [PR.PR_PLAIN,         /^[A-Z][A-Z0-9]?(?:\$|%)?/i, null],
          // Literals .0, 0, 0.0 0E13
          [PR.PR_LITERAL,       /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?/i,  null, '0123456789'],
          [PR.PR_PUNCTUATION,   /^.[^\s\w\.$%"]*/, null]
          // [PR.PR_PUNCTUATION,   /^[-,:;!<>=\+^\/\*]+/]
        ]),
    ['basic','cbm']);
/**
 * @license Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview
 * Registers a language handler for Clojure.
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-lisp">(my lisp code)</pre>
 * The lang-cl class identifies the language as common lisp.
 * This file supports the following language extensions:
 *     lang-clj - Clojure
 *
 *
 * I used lang-lisp.js as the basis for this adding the clojure specific
 * keywords and syntax.
 *
 * "Name"    = 'Clojure'
 * "Author"  = 'Rich Hickey'
 * "Version" = '1.2'
 * "About"   = 'Clojure is a lisp for the jvm with concurrency primitives and a richer set of types.'
 *
 *
 * I used <a href="http://clojure.org/Reference">Clojure.org Reference</a> as
 * the basis for the reserved word list.
 *
 *
 * @author jwall@google.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // clojure has more paren types than minimal lisp.
         ['opn',             /^[\(\{\[]+/, null, '([{'],
         ['clo',             /^[\)\}\]]+/, null, ')]}'],
         // A line comment that starts with ;
         [PR['PR_COMMENT'],     /^;[^\r\n]*/, null, ';'],
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // A double quoted, possibly multi-line, string.
         [PR['PR_STRING'],      /^\"(?:[^\"\\]|\\[\s\S])*(?:\"|$)/, null, '"']
        ],
        [
         // clojure has a much larger set of keywords
         [PR['PR_KEYWORD'],     /^(?:def|if|do|let|quote|var|fn|loop|recur|throw|try|monitor-enter|monitor-exit|defmacro|defn|defn-|macroexpand|macroexpand-1|for|doseq|dosync|dotimes|and|or|when|not|assert|doto|proxy|defstruct|first|rest|cons|defprotocol|deftype|defrecord|reify|defmulti|defmethod|meta|with-meta|ns|in-ns|create-ns|import|intern|refer|alias|namespace|resolve|ref|deref|refset|new|set!|memfn|to-array|into-array|aset|gen-class|reduce|map|filter|find|nil?|empty?|hash-map|hash-set|vec|vector|seq|flatten|reverse|assoc|dissoc|list|list?|disj|get|union|difference|intersection|extend|extend-type|extend-protocol|prn)\b/, null],
         [PR['PR_TYPE'], /^:[0-9a-zA-Z\-]+/]
        ]),
    ['clj']);
// Copyright (C) 2009 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for CSS.
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-css"></pre>
 *
 *
 * http://www.w3.org/TR/CSS21/grammar.html Section G2 defines the lexical
 * grammar.  This scheme does not recognize keywords containing escapes.
 *
 * @author mikesamuel@gmail.com
 */

// This file is a call to a function defined in prettify.js which defines a
// lexical scanner for CSS and maps tokens to styles.

// The call to PR['registerLangHandler'] is quoted so that Closure Compiler
// will not rename the call so that this language extensions can be
// compiled/minified separately from one another.  Other symbols defined in
// prettify.js are similarly quoted.

// The call is structured thus:
// PR['registerLangHandler'](
//    PR['createSimpleLexer'](
//        shortcutPatterns,
//        fallThroughPatterns),
//    [languageId0, ..., languageIdN])

// Langugage IDs
// =============
// The language IDs are typically the file extensions of source files for
// that language so that users can syntax highlight arbitrary files based
// on just the extension.  This is heuristic, but works pretty well in
// practice.

// Patterns
// ========
// Lexers are typically implemented as a set of regular expressions.
// The SimpleLexer function takes regular expressions, styles, and some
// pragma-info and produces a lexer.  A token description looks like
//   [STYLE_NAME, /regular-expression/, pragmas]

// Initially, simple lexer's inner loop looked like:

//    while sourceCode is not empty:
//      try each regular expression in order until one matches
//      remove the matched portion from sourceCode

// This was really slow for large files because some JS interpreters
// do a buffer copy on the matched portion which is O(n*n)

// The current loop now looks like

//    1. use js-modules/combinePrefixPatterns.js to 
//       combine all regular expressions into one 
//    2. use a single global regular expresion match to extract all tokens
//    3. for each token try regular expressions in order until one matches it
//       and classify it using the associated style

// This is a lot more efficient but it does mean that lookahead and lookbehind
// can't be used across boundaries to classify tokens.

// Sometimes we need lookahead and lookbehind and sometimes we want to handle
// embedded language -- JavaScript or CSS embedded in HTML, or inline assembly
// in C.

// If a particular pattern has a numbered group, and its style pattern starts
// with "lang-" as in
//    ['lang-js', /<script>(.*?)<\/script>/]
// then the token classification step breaks the token into pieces.
// Group 1 is re-parsed using the language handler for "lang-js", and the
// surrounding portions are reclassified using the current language handler.
// This mechanism gives us both lookahead, lookbehind, and language embedding.

// Shortcut Patterns
// =================
// A shortcut pattern is one that is tried before other patterns if the first
// character in the token is in the string of characters.
// This very effectively lets us make quick correct decisions for common token
// types.

// All other patterns are fall-through patterns.



// The comments inline below refer to productions in the CSS specification's
// lexical grammar.  See link above.
PR['registerLangHandler'](
    PR['createSimpleLexer'](
        // Shortcut patterns.
        [
         // The space production <s>
         [PR['PR_PLAIN'],       /^[ \t\r\n\f]+/, null, ' \t\r\n\f']
        ],
        // Fall-through patterns.
        [
         // Quoted strings.  <string1> and <string2>
         [PR['PR_STRING'],
          /^\"(?:[^\n\r\f\\\"]|\\(?:\r\n?|\n|\f)|\\[\s\S])*\"/, null],
         [PR['PR_STRING'],
          /^\'(?:[^\n\r\f\\\']|\\(?:\r\n?|\n|\f)|\\[\s\S])*\'/, null],
         ['lang-css-str', /^url\(([^\)\"\']+)\)/i],
         [PR['PR_KEYWORD'],
          /^(?:url|rgb|\!important|@import|@page|@media|@charset|inherit)(?=[^\-\w]|$)/i,
          null],
         // A property name -- an identifier followed by a colon.
         ['lang-css-kw', /^(-?(?:[_a-z]|(?:\\[0-9a-f]+ ?))(?:[_a-z0-9\-]|\\(?:\\[0-9a-f]+ ?))*)\s*:/i],
         // A C style block comment.  The <comment> production.
         [PR['PR_COMMENT'], /^\/\*[^*]*\*+(?:[^\/*][^*]*\*+)*\//],
         // Escaping text spans
         [PR['PR_COMMENT'], /^(?:<!--|-->)/],
         // A number possibly containing a suffix.
         [PR['PR_LITERAL'], /^(?:\d+|\d*\.\d+)(?:%|[a-z]+)?/i],
         // A hex color
         [PR['PR_LITERAL'], /^#(?:[0-9a-f]{3}){1,2}\b/i],
         // An identifier
         [PR['PR_PLAIN'],
          /^-?(?:[_a-z]|(?:\\[\da-f]+ ?))(?:[_a-z\d\-]|\\(?:\\[\da-f]+ ?))*/i],
         // A run of punctuation
         [PR['PR_PUNCTUATION'], /^[^\s\w\'\"]+/]
        ]),
    ['css']);
// Above we use embedded languages to highlight property names (identifiers
// followed by a colon) differently from identifiers in values.
PR['registerLangHandler'](
    PR['createSimpleLexer']([],
        [
         [PR['PR_KEYWORD'],
          /^-?(?:[_a-z]|(?:\\[\da-f]+ ?))(?:[_a-z\d\-]|\\(?:\\[\da-f]+ ?))*/i]
        ]),
    ['css-kw']);
// The content of an unquoted URL literal like url(http://foo/img.png) should
// be colored as string content.  This language handler is used above in the
// URL production to do so.
PR['registerLangHandler'](
    PR['createSimpleLexer']([],
        [
         [PR['PR_STRING'], /^[^\)\"\']+/]
        ]),
    ['css-str']);
// Copyright (C) 2013 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler Dart.
 * Loosely structured based on the DartLexer in Pygments: http://pygments.org/.
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-dart">(Dart code)</pre>
 *
 * @author armstrong.timothy@gmail.com
 */


PR['registerLangHandler'](
  PR['createSimpleLexer'](
    [
      // Whitespace.
      [PR['PR_PLAIN'], /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0']
    ],
    [
      // Script tag.
      [PR['PR_COMMENT'], /^#!(?:.*)/],

      // `import`, `library`, `part of`, `part`, `as`, `show`, and `hide`
      // keywords.
      [PR['PR_KEYWORD'], /^\b(?:import|library|part of|part|as|show|hide)\b/i],

      // Single-line comments.
      [PR['PR_COMMENT'], /^\/\/(?:.*)/],

      // Multiline comments.
      [PR['PR_COMMENT'], /^\/\*[^*]*\*+(?:[^\/*][^*]*\*+)*\//], // */

      // `class` and `interface` keywords.
      [PR['PR_KEYWORD'], /^\b(?:class|interface)\b/i],

      // General keywords.
      [PR['PR_KEYWORD'], /^\b(?:assert|break|case|catch|continue|default|do|else|finally|for|if|in|is|new|return|super|switch|this|throw|try|while)\b/i],

      // Declaration keywords.
      [PR['PR_KEYWORD'], /^\b(?:abstract|const|extends|factory|final|get|implements|native|operator|set|static|typedef|var)\b/i],

      // Keywords for types.
      [PR['PR_TYPE'], /^\b(?:bool|double|Dynamic|int|num|Object|String|void)\b/i],

      // Keywords for constants.
      [PR['PR_KEYWORD'], /^\b(?:false|null|true)\b/i],

      // Multiline strings, single- and double-quoted.
      [PR['PR_STRING'], /^r?[\']{3}[\s|\S]*?[^\\][\']{3}/],
      [PR['PR_STRING'], /^r?[\"]{3}[\s|\S]*?[^\\][\"]{3}/],

      // Normal and raw strings, single- and double-quoted.
      [PR['PR_STRING'], /^r?\'(\'|(?:[^\n\r\f])*?[^\\]\')/],
      [PR['PR_STRING'], /^r?\"(\"|(?:[^\n\r\f])*?[^\\]\")/],

      // Identifiers.
      [PR['PR_PLAIN'], /^[a-z_$][a-z0-9_]*/i],
      
      // Operators.
      [PR['PR_PUNCTUATION'], /^[~!%^&*+=|?:<>/-]/],

      // Hex numbers.
      [PR['PR_LITERAL'], /^\b0x[0-9a-f]+/i],

      // Decimal numbers.
      [PR['PR_LITERAL'], /^\b\d+(?:\.\d*)?(?:e[+-]?\d+)?/i],
      [PR['PR_LITERAL'], /^\b\.\d+(?:e[+-]?\d+)?/i],

      // Punctuation.
      [PR['PR_PUNCTUATION'], /^[(){}\[\],.;]/]
    ]),
  ['dart']);
// Copyright (C) 2013 Andrew Allen
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * Registers a language handler for Erlang.
 *
 * Derived from https://raw.github.com/erlang/otp/dev/lib/compiler/src/core_parse.yrl
 * Modified from Mike Samuel's Haskell plugin for google-code-prettify
 *
 * @author achew22@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace
         // whitechar    ->    newline | vertab | space | tab | uniWhite
         // newline      ->    return linefeed | return | linefeed | formfeed
         [PR['PR_PLAIN'],       /^[\t\n\x0B\x0C\r ]+/, null, '\t\n\x0B\x0C\r '],
         // Single line double-quoted strings.
         [PR['PR_STRING'],      /^\"(?:[^\"\\\n\x0C\r]|\\[\s\S])*(?:\"|$)/,
          null, '"'],
         
         // Handle atoms
         [PR['PR_LITERAL'],      /^[a-z][a-zA-Z0-9_]*/],
         // Handle single quoted atoms
         [PR['PR_LITERAL'],      /^\'(?:[^\'\\\n\x0C\r]|\\[^&])+\'?/,
          null, "'"],
         
         // Handle macros. Just to be extra clear on this one, it detects the ?
         // then uses the regexp to end it so be very careful about matching
         // all the terminal elements
         [PR['PR_LITERAL'],      /^\?[^ \t\n({]+/, null, "?"],

          
         
         // decimal      ->    digit{digit}
         // octal        ->    octit{octit}
         // hexadecimal  ->    hexit{hexit}
         // integer      ->    decimal
         //               |    0o octal | 0O octal
         //               |    0x hexadecimal | 0X hexadecimal
         // float        ->    decimal . decimal [exponent]
         //               |    decimal exponent
         // exponent     ->    (e | E) [+ | -] decimal
         [PR['PR_LITERAL'],
          /^(?:0o[0-7]+|0x[\da-f]+|\d+(?:\.\d+)?(?:e[+\-]?\d+)?)/i,
          null, '0123456789']
        ],
        [
         // TODO: catch @declarations inside comments

         // Comments in erlang are started with % and go till a newline
         [PR['PR_COMMENT'], /^%[^\n]*/],

         // Catch macros
         //[PR['PR_TAG'], /?[^( \n)]+/],

         /**
          * %% Keywords (atoms are assumed to always be single-quoted).
          * 'module' 'attributes' 'do' 'let' 'in' 'letrec'
          * 'apply' 'call' 'primop'
          * 'case' 'of' 'end' 'when' 'fun' 'try' 'catch' 'receive' 'after'
          */
         [PR['PR_KEYWORD'], /^(?:module|attributes|do|let|in|letrec|apply|call|primop|case|of|end|when|fun|try|catch|receive|after|char|integer|float,atom,string,var)\b/],
         
         /**
          * Catch definitions (usually defined at the top of the file)
          * Anything that starts -something
          */
         [PR['PR_KEYWORD'], /^-[a-z_]+/],

         // Catch variables
         [PR['PR_TYPE'], /^[A-Z_][a-zA-Z0-9_]*/],

         // matches the symbol production
         [PR['PR_PUNCTUATION'], /^[.,;]/]
        ]),
    ['erlang', 'erl']);
// Copyright (C) 2010 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for the Go language..
 * <p>
 * Based on the lexical grammar at 
 * http://golang.org/doc/go_spec.html#Lexical_elements
 * <p>
 * Go uses a minimal style for highlighting so the below does not distinguish
 * strings, keywords, literals, etc. by design.
 * From a discussion with the Go designers:
 * <pre>
 * On Thursday, July 22, 2010, Mike Samuel <...> wrote:
 * > On Thu, Jul 22, 2010, Rob 'Commander' Pike <...> wrote:
 * >> Personally, I would vote for the subdued style godoc presents at http://golang.org
 * >>
 * >> Not as fancy as some like, but a case can be made it's the official style.
 * >> If people want more colors, I wouldn't fight too hard, in the interest of
 * >> encouragement through familiarity, but even then I would ask to shy away
 * >> from technicolor starbursts.
 * >
 * > Like http://golang.org/pkg/go/scanner/ where comments are blue and all
 * > other content is black?  I can do that.
 * </pre>
 *
 * @author mikesamuel@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace is made up of spaces, tabs and newline characters.
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // Not escaped as a string.  See note on minimalism above.
         [PR['PR_PLAIN'],       /^(?:\"(?:[^\"\\]|\\[\s\S])*(?:\"|$)|\'(?:[^\'\\]|\\[\s\S])+(?:\'|$)|`[^`]*(?:`|$))/, null, '"\'']
        ],
        [
         // Block comments are delimited by /* and */.
         // Single-line comments begin with // and extend to the end of a line.
         [PR['PR_COMMENT'],     /^(?:\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)/],
         [PR['PR_PLAIN'],       /^(?:[^\/\"\'`]|\/(?![\/\*]))+/i]
        ]),
    ['go']);
// Copyright (C) 2009 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for Haskell.
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-hs">(my lisp code)</pre>
 * The lang-cl class identifies the language as common lisp.
 * This file supports the following language extensions:
 *     lang-cl - Common Lisp
 *     lang-el - Emacs Lisp
 *     lang-lisp - Lisp
 *     lang-scm - Scheme
 *
 *
 * I used http://www.informatik.uni-freiburg.de/~thiemann/haskell/haskell98-report-html/syntax-iso.html
 * as the basis, but ignore the way the ncomment production nests since this
 * makes the lexical grammar irregular.  It might be possible to support
 * ncomments using the lookbehind filter.
 *
 *
 * @author mikesamuel@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace
         // whitechar    ->    newline | vertab | space | tab | uniWhite
         // newline      ->    return linefeed | return | linefeed | formfeed
         [PR['PR_PLAIN'],       /^[\t\n\x0B\x0C\r ]+/, null, '\t\n\x0B\x0C\r '],
         // Single line double and single-quoted strings.
         // char         ->    ' (graphic<' | \> | space | escape<\&>) '
         // string       ->    " {graphic<" | \> | space | escape | gap}"
         // escape       ->    \ ( charesc | ascii | decimal | o octal
         //                        | x hexadecimal )
         // charesc      ->    a | b | f | n | r | t | v | \ | " | ' | &
         [PR['PR_STRING'],      /^\"(?:[^\"\\\n\x0C\r]|\\[\s\S])*(?:\"|$)/,
          null, '"'],
         [PR['PR_STRING'],      /^\'(?:[^\'\\\n\x0C\r]|\\[^&])\'?/,
          null, "'"],
         // decimal      ->    digit{digit}
         // octal        ->    octit{octit}
         // hexadecimal  ->    hexit{hexit}
         // integer      ->    decimal
         //               |    0o octal | 0O octal
         //               |    0x hexadecimal | 0X hexadecimal
         // float        ->    decimal . decimal [exponent]
         //               |    decimal exponent
         // exponent     ->    (e | E) [+ | -] decimal
         [PR['PR_LITERAL'],
          /^(?:0o[0-7]+|0x[\da-f]+|\d+(?:\.\d+)?(?:e[+\-]?\d+)?)/i,
          null, '0123456789']
        ],
        [
         // Haskell does not have a regular lexical grammar due to the nested
         // ncomment.
         // comment      ->    dashes [ any<symbol> {any}] newline
         // ncomment     ->    opencom ANYseq {ncomment ANYseq}closecom
         // dashes       ->    '--' {'-'}
         // opencom      ->    '{-'
         // closecom     ->    '-}'
         [PR['PR_COMMENT'],     /^(?:(?:--+(?:[^\r\n\x0C]*)?)|(?:\{-(?:[^-]|-+[^-\}])*-\}))/],
         // reservedid   ->    case | class | data | default | deriving | do
         //               |    else | if | import | in | infix | infixl | infixr
         //               |    instance | let | module | newtype | of | then
         //               |    type | where | _
         [PR['PR_KEYWORD'],     /^(?:case|class|data|default|deriving|do|else|if|import|in|infix|infixl|infixr|instance|let|module|newtype|of|then|type|where|_)(?=[^a-zA-Z0-9\']|$)/, null],
         // qvarid       ->    [ modid . ] varid
         // qconid       ->    [ modid . ] conid
         // varid        ->    (small {small | large | digit | ' })<reservedid>
         // conid        ->    large {small | large | digit | ' }
         // modid        ->    conid
         // small        ->    ascSmall | uniSmall | _
         // ascSmall     ->    a | b | ... | z
         // uniSmall     ->    any Unicode lowercase letter
         // large        ->    ascLarge | uniLarge
         // ascLarge     ->    A | B | ... | Z
         // uniLarge     ->    any uppercase or titlecase Unicode letter
         [PR['PR_PLAIN'],  /^(?:[A-Z][\w\']*\.)*[a-zA-Z][\w\']*/],
         // matches the symbol production
         [PR['PR_PUNCTUATION'], /^[^\t\n\x0B\x0C\r a-zA-Z0-9\'\"]+/]
        ]),
    ['hs']);
// Copyright (C) 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for Common Lisp and related languages.
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-lisp">(my lisp code)</pre>
 * The lang-cl class identifies the language as common lisp.
 * This file supports the following language extensions:
 *     lang-cl - Common Lisp
 *     lang-el - Emacs Lisp
 *     lang-lisp - Lisp
 *     lang-scm - Scheme
 *     lang-lsp - FAT 8.3 filename version of lang-lisp.
 *
 *
 * I used http://www.devincook.com/goldparser/doc/meta-language/grammar-LISP.htm
 * as the basis, but added line comments that start with ; and changed the atom
 * production to disallow unquoted semicolons.
 *
 * "Name"    = 'LISP'
 * "Author"  = 'John McCarthy'
 * "Version" = 'Minimal'
 * "About"   = 'LISP is an abstract language that organizes ALL'
 *           | 'data around "lists".'
 *
 * "Start Symbol" = [s-Expression]
 *
 * {Atom Char}   = {Printable} - {Whitespace} - [()"\'']
 *
 * Atom = ( {Atom Char} | '\'{Printable} )+
 *
 * [s-Expression] ::= [Quote] Atom
 *                  | [Quote] '(' [Series] ')'
 *                  | [Quote] '(' [s-Expression] '.' [s-Expression] ')'
 *
 * [Series] ::= [s-Expression] [Series]
 *            |
 *
 * [Quote]  ::= ''      !Quote = do not evaluate
 *            |
 *
 *
 * I used <a href="http://gigamonkeys.com/book/">Practical Common Lisp</a> as
 * the basis for the reserved word list.
 *
 *
 * @author mikesamuel@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         ['opn',             /^\(+/, null, '('],
         ['clo',             /^\)+/, null, ')'],
         // A line comment that starts with ;
         [PR['PR_COMMENT'],     /^;[^\r\n]*/, null, ';'],
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // A double quoted, possibly multi-line, string.
         [PR['PR_STRING'],      /^\"(?:[^\"\\]|\\[\s\S])*(?:\"|$)/, null, '"']
        ],
        [
         [PR['PR_KEYWORD'],     /^(?:block|c[ad]+r|catch|con[ds]|def(?:ine|un)|do|eq|eql|equal|equalp|eval-when|flet|format|go|if|labels|lambda|let|load-time-value|locally|macrolet|multiple-value-call|nil|progn|progv|quote|require|return-from|setq|symbol-macrolet|t|tagbody|the|throw|unwind)\b/, null],
         [PR['PR_LITERAL'],
          /^[+\-]?(?:[0#]x[0-9a-f]+|\d+\/\d+|(?:\.\d+|\d+(?:\.\d*)?)(?:[ed][+\-]?\d+)?)/i],
         // A single quote possibly followed by a word that optionally ends with
         // = ! or ?.
         [PR['PR_LITERAL'],
          /^\'(?:-*(?:\w|\\[\x21-\x7e])(?:[\w-]*|\\[\x21-\x7e])[=!?]?)?/],
         // A word that optionally ends with = ! or ?.
         [PR['PR_PLAIN'],
          /^-*(?:[a-z_]|\\[\x21-\x7e])(?:[\w-]*|\\[\x21-\x7e])[=!?]?/i],
         // A printable non-space non-special character
         [PR['PR_PUNCTUATION'], /^[^\w\t\n\r \xA0()\"\\\';]+/]
        ]),
    ['cl', 'el', 'lisp', 'lsp', 'scm', 'ss', 'rkt']);
// Copyright (C) 2013 Nikhil Dabas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * Registers a language handler for LLVM.
 * From https://gist.github.com/ndabas/2850418
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-llvm">(my LLVM code)</pre>
 *
 *
 * The regular expressions were adapted from:
 * https://github.com/hansstimer/llvm.tmbundle/blob/76fedd8f50fd6108b1780c51d79fbe3223de5f34/Syntaxes/LLVM.tmLanguage
 * 
 * http://llvm.org/docs/LangRef.html#constants describes the language grammar.
 * 
 * @author Nikhil Dabas
 */

PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // A double quoted, possibly multi-line, string.
         [PR['PR_STRING'],      /^!?\"(?:[^\"\\]|\\[\s\S])*(?:\"|$)/, null, '"'],
         // comment.llvm
         [PR['PR_COMMENT'],     /^;[^\r\n]*/, null, ';']
        ],
        [
         // variable.llvm
         [PR['PR_PLAIN'],       /^[%@!](?:[-a-zA-Z$._][-a-zA-Z$._0-9]*|\d+)/],

         // According to http://llvm.org/docs/LangRef.html#well-formedness
         // These reserved words cannot conflict with variable names, because none of them start with a prefix character ('%' or '@').
         [PR['PR_KEYWORD'],     /^[A-Za-z_][0-9A-Za-z_]*/, null],

         // constant.numeric.float.llvm
         [PR['PR_LITERAL'],     /^\d+\.\d+/],
         
         // constant.numeric.integer.llvm
         [PR['PR_LITERAL'],     /^(?:\d+|0[xX][a-fA-F0-9]+)/],

         // punctuation
         [PR['PR_PUNCTUATION'], /^[()\[\]{},=*<>:]|\.\.\.$/]
        ]),
    ['llvm', 'll']);
// Copyright (C) 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for Lua.
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-lua">(my Lua code)</pre>
 *
 *
 * I used http://www.lua.org/manual/5.1/manual.html#2.1
 * Because of the long-bracket concept used in strings and comments, Lua does
 * not have a regular lexical grammar, but luckily it fits within the space
 * of irregular grammars supported by javascript regular expressions.
 *
 * @author mikesamuel@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // A double or single quoted, possibly multi-line, string.
         [PR['PR_STRING'],      /^(?:\"(?:[^\"\\]|\\[\s\S])*(?:\"|$)|\'(?:[^\'\\]|\\[\s\S])*(?:\'|$))/, null, '"\'']
        ],
        [
         // A comment is either a line comment that starts with two dashes, or
         // two dashes preceding a long bracketed block.
         [PR['PR_COMMENT'], /^--(?:\[(=*)\[[\s\S]*?(?:\]\1\]|$)|[^\r\n]*)/],
         // A long bracketed block not preceded by -- is a string.
         [PR['PR_STRING'],  /^\[(=*)\[[\s\S]*?(?:\]\1\]|$)/],
         [PR['PR_KEYWORD'], /^(?:and|break|do|else|elseif|end|false|for|function|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/, null],
         // A number is a hex integer literal, a decimal real literal, or in
         // scientific notation.
         [PR['PR_LITERAL'],
          /^[+-]?(?:0x[\da-f]+|(?:(?:\.\d+|\d+(?:\.\d*)?)(?:e[+\-]?\d+)?))/i],
         // An identifier
         [PR['PR_PLAIN'], /^[a-z_]\w*/i],
         // A run of punctuation
         [PR['PR_PUNCTUATION'], /^[^\w\t\n\r \xA0][^\w\t\n\r \xA0\"\'\-\+=]*/]
        ]),
    ['lua']);
// Copyright (c) 2013 by Amro <amroamroamro@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * @fileoverview
 * Registers a language handler for MATLAB.
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code inside an HTML tag like
 *     <pre class="prettyprint lang-matlab">
 *     </pre>
 *
 * @see https://github.com/amroamroamro/prettify-matlab
 */

(function (PR) {
  /*
    PR_PLAIN: plain text
    PR_STRING: string literals
    PR_KEYWORD: keywords
    PR_COMMENT: comments
    PR_TYPE: types
    PR_LITERAL: literal values (1, null, true, ..)
    PR_PUNCTUATION: punctuation string
    PR_SOURCE: embedded source
    PR_DECLARATION: markup declaration such as a DOCTYPE
    PR_TAG: sgml tag
    PR_ATTRIB_NAME: sgml attribute name
    PR_ATTRIB_VALUE: sgml attribute value
  */
  var PR_IDENTIFIER = "ident",
    PR_CONSTANT = "const",
    PR_FUNCTION = "fun",
    PR_FUNCTION_TOOLBOX = "fun_tbx",
    PR_SYSCMD = "syscmd",
    PR_CODE_OUTPUT = "codeoutput",
    PR_ERROR = "err",
    PR_WARNING = "wrn",
    PR_TRANSPOSE = "transpose",
    PR_LINE_CONTINUATION = "linecont";

  // Refer to: http://www.mathworks.com/help/matlab/functionlist-alpha.html
  var coreFunctions = [
    'abs|accumarray|acos(?:d|h)?|acot(?:d|h)?|acsc(?:d|h)?|actxcontrol(?:list|select)?|actxGetRunningServer|actxserver|addlistener|addpath|addpref|addtodate|airy|align|alim|all|allchild|alpha|alphamap|amd|ancestor|and|angle|annotation|any|area|arrayfun|asec(?:d|h)?|asin(?:d|h)?|assert|assignin|atan(?:2|d|h)?|audiodevinfo|audioplayer|audiorecorder|aufinfo|auread|autumn|auwrite|avifile|aviinfo|aviread|axes|axis|balance|bar(?:3|3h|h)?|base2dec|beep|BeginInvoke|bench|bessel(?:h|i|j|k|y)|beta|betainc|betaincinv|betaln|bicg|bicgstab|bicgstabl|bin2dec|bitand|bitcmp|bitget|bitmax|bitnot|bitor|bitset|bitshift|bitxor|blanks|blkdiag|bone|box|brighten|brush|bsxfun|builddocsearchdb|builtin|bvp4c|bvp5c|bvpget|bvpinit|bvpset|bvpxtend|calendar|calllib|callSoapService|camdolly|cameratoolbar|camlight|camlookat|camorbit|campan|campos|camproj|camroll|camtarget|camup|camva|camzoom|cart2pol|cart2sph|cast|cat|caxis|cd|cdf2rdf|cdfepoch|cdfinfo|cdflib(?:\.(?:close|closeVar|computeEpoch|computeEpoch16|create|createAttr|createVar|delete|deleteAttr|deleteAttrEntry|deleteAttrgEntry|deleteVar|deleteVarRecords|epoch16Breakdown|epochBreakdown|getAttrEntry|getAttrgEntry|getAttrMaxEntry|getAttrMaxgEntry|getAttrName|getAttrNum|getAttrScope|getCacheSize|getChecksum|getCompression|getCompressionCacheSize|getConstantNames|getConstantValue|getCopyright|getFileBackward|getFormat|getLibraryCopyright|getLibraryVersion|getMajority|getName|getNumAttrEntries|getNumAttrgEntries|getNumAttributes|getNumgAttributes|getReadOnlyMode|getStageCacheSize|getValidate|getVarAllocRecords|getVarBlockingFactor|getVarCacheSize|getVarCompression|getVarData|getVarMaxAllocRecNum|getVarMaxWrittenRecNum|getVarName|getVarNum|getVarNumRecsWritten|getVarPadValue|getVarRecordData|getVarReservePercent|getVarsMaxWrittenRecNum|getVarSparseRecords|getVersion|hyperGetVarData|hyperPutVarData|inquire|inquireAttr|inquireAttrEntry|inquireAttrgEntry|inquireVar|open|putAttrEntry|putAttrgEntry|putVarData|putVarRecordData|renameAttr|renameVar|setCacheSize|setChecksum|setCompression|setCompressionCacheSize|setFileBackward|setFormat|setMajority|setReadOnlyMode|setStageCacheSize|setValidate|setVarAllocBlockRecords|setVarBlockingFactor|setVarCacheSize|setVarCompression|setVarInitialRecs|setVarPadValue|SetVarReservePercent|setVarsCacheSize|setVarSparseRecords))?|cdfread|cdfwrite|ceil|cell2mat|cell2struct|celldisp|cellfun|cellplot|cellstr|cgs|checkcode|checkin|checkout|chol|cholinc|cholupdate|circshift|cla|clabel|class|clc|clear|clearvars|clf|clipboard|clock|close|closereq|cmopts|cmpermute|cmunique|colamd|colon|colorbar|colordef|colormap|colormapeditor|colperm|Combine|comet|comet3|commandhistory|commandwindow|compan|compass|complex|computer|cond|condeig|condest|coneplot|conj|containers\.Map|contour(?:3|c|f|slice)?|contrast|conv|conv2|convhull|convhulln|convn|cool|copper|copyfile|copyobj|corrcoef|cos(?:d|h)?|cot(?:d|h)?|cov|cplxpair|cputime|createClassFromWsdl|createSoapMessage|cross|csc(?:d|h)?|csvread|csvwrite|ctranspose|cumprod|cumsum|cumtrapz|curl|customverctrl|cylinder|daqread|daspect|datacursormode|datatipinfo|date|datenum|datestr|datetick|datevec|dbclear|dbcont|dbdown|dblquad|dbmex|dbquit|dbstack|dbstatus|dbstep|dbstop|dbtype|dbup|dde23|ddeget|ddesd|ddeset|deal|deblank|dec2base|dec2bin|dec2hex|decic|deconv|del2|delaunay|delaunay3|delaunayn|DelaunayTri|delete|demo|depdir|depfun|det|detrend|deval|diag|dialog|diary|diff|diffuse|dir|disp|display|dither|divergence|dlmread|dlmwrite|dmperm|doc|docsearch|dos|dot|dragrect|drawnow|dsearch|dsearchn|dynamicprops|echo|echodemo|edit|eig|eigs|ellipj|ellipke|ellipsoid|empty|enableNETfromNetworkDrive|enableservice|EndInvoke|enumeration|eomday|eq|erf|erfc|erfcinv|erfcx|erfinv|error|errorbar|errordlg|etime|etree|etreeplot|eval|evalc|evalin|event\.(?:EventData|listener|PropertyEvent|proplistener)|exifread|exist|exit|exp|expint|expm|expm1|export2wsdlg|eye|ezcontour|ezcontourf|ezmesh|ezmeshc|ezplot|ezplot3|ezpolar|ezsurf|ezsurfc|factor|factorial|fclose|feather|feature|feof|ferror|feval|fft|fft2|fftn|fftshift|fftw|fgetl|fgets|fieldnames|figure|figurepalette|fileattrib|filebrowser|filemarker|fileparts|fileread|filesep|fill|fill3|filter|filter2|find|findall|findfigs|findobj|findstr|finish|fitsdisp|fitsinfo|fitsread|fitswrite|fix|flag|flipdim|fliplr|flipud|floor|flow|fminbnd|fminsearch|fopen|format|fplot|fprintf|frame2im|fread|freqspace|frewind|fscanf|fseek|ftell|FTP|full|fullfile|func2str|functions|funm|fwrite|fzero|gallery|gamma|gammainc|gammaincinv|gammaln|gca|gcbf|gcbo|gcd|gcf|gco|ge|genpath|genvarname|get|getappdata|getenv|getfield|getframe|getpixelposition|getpref|ginput|gmres|gplot|grabcode|gradient|gray|graymon|grid|griddata(?:3|n)?|griddedInterpolant|gsvd|gt|gtext|guidata|guide|guihandles|gunzip|gzip|h5create|h5disp|h5info|h5read|h5readatt|h5write|h5writeatt|hadamard|handle|hankel|hdf|hdf5|hdf5info|hdf5read|hdf5write|hdfinfo|hdfread|hdftool|help|helpbrowser|helpdesk|helpdlg|helpwin|hess|hex2dec|hex2num|hgexport|hggroup|hgload|hgsave|hgsetget|hgtransform|hidden|hilb|hist|histc|hold|home|horzcat|hostid|hot|hsv|hsv2rgb|hypot|ichol|idivide|ifft|ifft2|ifftn|ifftshift|ilu|im2frame|im2java|imag|image|imagesc|imapprox|imfinfo|imformats|import|importdata|imread|imwrite|ind2rgb|ind2sub|inferiorto|info|inline|inmem|inpolygon|input|inputdlg|inputname|inputParser|inspect|instrcallback|instrfind|instrfindall|int2str|integral(?:2|3)?|interp(?:1|1q|2|3|ft|n)|interpstreamspeed|intersect|intmax|intmin|inv|invhilb|ipermute|isa|isappdata|iscell|iscellstr|ischar|iscolumn|isdir|isempty|isequal|isequaln|isequalwithequalnans|isfield|isfinite|isfloat|isglobal|ishandle|ishghandle|ishold|isinf|isinteger|isjava|iskeyword|isletter|islogical|ismac|ismatrix|ismember|ismethod|isnan|isnumeric|isobject|isocaps|isocolors|isonormals|isosurface|ispc|ispref|isprime|isprop|isreal|isrow|isscalar|issorted|isspace|issparse|isstr|isstrprop|isstruct|isstudent|isunix|isvarname|isvector|javaaddpath|javaArray|javachk|javaclasspath|javacomponent|javaMethod|javaMethodEDT|javaObject|javaObjectEDT|javarmpath|jet|keyboard|kron|lasterr|lasterror|lastwarn|lcm|ldivide|ldl|le|legend|legendre|length|libfunctions|libfunctionsview|libisloaded|libpointer|libstruct|license|light|lightangle|lighting|lin2mu|line|lines|linkaxes|linkdata|linkprop|linsolve|linspace|listdlg|listfonts|load|loadlibrary|loadobj|log|log10|log1p|log2|loglog|logm|logspace|lookfor|lower|ls|lscov|lsqnonneg|lsqr|lt|lu|luinc|magic|makehgtform|mat2cell|mat2str|material|matfile|matlab\.io\.MatFile|matlab\.mixin\.(?:Copyable|Heterogeneous(?:\.getDefaultScalarElement)?)|matlabrc|matlabroot|max|maxNumCompThreads|mean|median|membrane|memmapfile|memory|menu|mesh|meshc|meshgrid|meshz|meta\.(?:class(?:\.fromName)?|DynamicProperty|EnumeratedValue|event|MetaData|method|package(?:\.(?:fromName|getAllPackages))?|property)|metaclass|methods|methodsview|mex(?:\.getCompilerConfigurations)?|MException|mexext|mfilename|min|minres|minus|mislocked|mkdir|mkpp|mldivide|mlint|mlintrpt|mlock|mmfileinfo|mmreader|mod|mode|more|move|movefile|movegui|movie|movie2avi|mpower|mrdivide|msgbox|mtimes|mu2lin|multibandread|multibandwrite|munlock|namelengthmax|nargchk|narginchk|nargoutchk|native2unicode|nccreate|ncdisp|nchoosek|ncinfo|ncread|ncreadatt|ncwrite|ncwriteatt|ncwriteschema|ndgrid|ndims|ne|NET(?:\.(?:addAssembly|Assembly|convertArray|createArray|createGeneric|disableAutoRelease|enableAutoRelease|GenericClass|invokeGenericMethod|NetException|setStaticProperty))?|netcdf\.(?:abort|close|copyAtt|create|defDim|defGrp|defVar|defVarChunking|defVarDeflate|defVarFill|defVarFletcher32|delAtt|endDef|getAtt|getChunkCache|getConstant|getConstantNames|getVar|inq|inqAtt|inqAttID|inqAttName|inqDim|inqDimID|inqDimIDs|inqFormat|inqGrpName|inqGrpNameFull|inqGrpParent|inqGrps|inqLibVers|inqNcid|inqUnlimDims|inqVar|inqVarChunking|inqVarDeflate|inqVarFill|inqVarFletcher32|inqVarID|inqVarIDs|open|putAtt|putVar|reDef|renameAtt|renameDim|renameVar|setChunkCache|setDefaultFormat|setFill|sync)|newplot|nextpow2|nnz|noanimate|nonzeros|norm|normest|not|notebook|now|nthroot|null|num2cell|num2hex|num2str|numel|nzmax|ode(?:113|15i|15s|23|23s|23t|23tb|45)|odeget|odeset|odextend|onCleanup|ones|open|openfig|opengl|openvar|optimget|optimset|or|ordeig|orderfields|ordqz|ordschur|orient|orth|pack|padecoef|pagesetupdlg|pan|pareto|parseSoapResponse|pascal|patch|path|path2rc|pathsep|pathtool|pause|pbaspect|pcg|pchip|pcode|pcolor|pdepe|pdeval|peaks|perl|perms|permute|pie|pink|pinv|planerot|playshow|plot|plot3|plotbrowser|plotedit|plotmatrix|plottools|plotyy|plus|pol2cart|polar|poly|polyarea|polyder|polyeig|polyfit|polyint|polyval|polyvalm|pow2|power|ppval|prefdir|preferences|primes|print|printdlg|printopt|printpreview|prod|profile|profsave|propedit|propertyeditor|psi|publish|PutCharArray|PutFullMatrix|PutWorkspaceData|pwd|qhull|qmr|qr|qrdelete|qrinsert|qrupdate|quad|quad2d|quadgk|quadl|quadv|questdlg|quit|quiver|quiver3|qz|rand|randi|randn|randperm|RandStream(?:\.(?:create|getDefaultStream|getGlobalStream|list|setDefaultStream|setGlobalStream))?|rank|rat|rats|rbbox|rcond|rdivide|readasync|real|reallog|realmax|realmin|realpow|realsqrt|record|rectangle|rectint|recycle|reducepatch|reducevolume|refresh|refreshdata|regexp|regexpi|regexprep|regexptranslate|rehash|rem|Remove|RemoveAll|repmat|reset|reshape|residue|restoredefaultpath|rethrow|rgb2hsv|rgb2ind|rgbplot|ribbon|rmappdata|rmdir|rmfield|rmpath|rmpref|rng|roots|rose|rosser|rot90|rotate|rotate3d|round|rref|rsf2csf|run|save|saveas|saveobj|savepath|scatter|scatter3|schur|sec|secd|sech|selectmoveresize|semilogx|semilogy|sendmail|serial|set|setappdata|setdiff|setenv|setfield|setpixelposition|setpref|setstr|setxor|shading|shg|shiftdim|showplottool|shrinkfaces|sign|sin(?:d|h)?|size|slice|smooth3|snapnow|sort|sortrows|sound|soundsc|spalloc|spaugment|spconvert|spdiags|specular|speye|spfun|sph2cart|sphere|spinmap|spline|spones|spparms|sprand|sprandn|sprandsym|sprank|spring|sprintf|spy|sqrt|sqrtm|squeeze|ss2tf|sscanf|stairs|startup|std|stem|stem3|stopasync|str2double|str2func|str2mat|str2num|strcat|strcmp|strcmpi|stream2|stream3|streamline|streamparticles|streamribbon|streamslice|streamtube|strfind|strjust|strmatch|strncmp|strncmpi|strread|strrep|strtok|strtrim|struct2cell|structfun|strvcat|sub2ind|subplot|subsasgn|subsindex|subspace|subsref|substruct|subvolume|sum|summer|superclasses|superiorto|support|surf|surf2patch|surface|surfc|surfl|surfnorm|svd|svds|swapbytes|symamd|symbfact|symmlq|symrcm|symvar|system|tan(?:d|h)?|tar|tempdir|tempname|tetramesh|texlabel|text|textread|textscan|textwrap|tfqmr|throw|tic|Tiff(?:\.(?:getTagNames|getVersion))?|timer|timerfind|timerfindall|times|timeseries|title|toc|todatenum|toeplitz|toolboxdir|trace|transpose|trapz|treelayout|treeplot|tril|trimesh|triplequad|triplot|TriRep|TriScatteredInterp|trisurf|triu|tscollection|tsearch|tsearchn|tstool|type|typecast|uibuttongroup|uicontextmenu|uicontrol|uigetdir|uigetfile|uigetpref|uiimport|uimenu|uiopen|uipanel|uipushtool|uiputfile|uiresume|uisave|uisetcolor|uisetfont|uisetpref|uistack|uitable|uitoggletool|uitoolbar|uiwait|uminus|undocheckout|unicode2native|union|unique|unix|unloadlibrary|unmesh|unmkpp|untar|unwrap|unzip|uplus|upper|urlread|urlwrite|usejava|userpath|validateattributes|validatestring|vander|var|vectorize|ver|verctrl|verLessThan|version|vertcat|VideoReader(?:\.isPlatformSupported)?|VideoWriter(?:\.getProfiles)?|view|viewmtx|visdiff|volumebounds|voronoi|voronoin|wait|waitbar|waitfor|waitforbuttonpress|warndlg|warning|waterfall|wavfinfo|wavplay|wavread|wavrecord|wavwrite|web|weekday|what|whatsnew|which|whitebg|who|whos|wilkinson|winopen|winqueryreg|winter|wk1finfo|wk1read|wk1write|workspace|xlabel|xlim|xlsfinfo|xlsread|xlswrite|xmlread|xmlwrite|xor|xslt|ylabel|ylim|zeros|zip|zlabel|zlim|zoom'
  ].join("|");
  var statsFunctions = [
    'addedvarplot|andrewsplot|anova(?:1|2|n)|ansaribradley|aoctool|barttest|bbdesign|beta(?:cdf|fit|inv|like|pdf|rnd|stat)|bino(?:cdf|fit|inv|pdf|rnd|stat)|biplot|bootci|bootstrp|boxplot|candexch|candgen|canoncorr|capability|capaplot|caseread|casewrite|categorical|ccdesign|cdfplot|chi2(?:cdf|gof|inv|pdf|rnd|stat)|cholcov|Classification(?:BaggedEnsemble|Discriminant(?:\.(?:fit|make|template))?|Ensemble|KNN(?:\.(?:fit|template))?|PartitionedEnsemble|PartitionedModel|Tree(?:\.(?:fit|template))?)|classify|classregtree|cluster|clusterdata|cmdscale|combnk|Compact(?:Classification(?:Discriminant|Ensemble|Tree)|Regression(?:Ensemble|Tree)|TreeBagger)|confusionmat|controlchart|controlrules|cophenet|copula(?:cdf|fit|param|pdf|rnd|stat)|cordexch|corr|corrcov|coxphfit|createns|crosstab|crossval|cvpartition|datasample|dataset|daugment|dcovary|dendrogram|dfittool|disttool|dummyvar|dwtest|ecdf|ecdfhist|ev(?:cdf|fit|inv|like|pdf|rnd|stat)|ExhaustiveSearcher|exp(?:cdf|fit|inv|like|pdf|rnd|stat)|factoran|fcdf|ff2n|finv|fitdist|fitensemble|fpdf|fracfact|fracfactgen|friedman|frnd|fstat|fsurfht|fullfact|gagerr|gam(?:cdf|fit|inv|like|pdf|rnd|stat)|GeneralizedLinearModel(?:\.fit)?|geo(?:cdf|inv|mean|pdf|rnd|stat)|gev(?:cdf|fit|inv|like|pdf|rnd|stat)|gline|glmfit|glmval|glyphplot|gmdistribution(?:\.fit)?|gname|gp(?:cdf|fit|inv|like|pdf|rnd|stat)|gplotmatrix|grp2idx|grpstats|gscatter|haltonset|harmmean|hist3|histfit|hmm(?:decode|estimate|generate|train|viterbi)|hougen|hyge(?:cdf|inv|pdf|rnd|stat)|icdf|inconsistent|interactionplot|invpred|iqr|iwishrnd|jackknife|jbtest|johnsrnd|KDTreeSearcher|kmeans|knnsearch|kruskalwallis|ksdensity|kstest|kstest2|kurtosis|lasso|lassoglm|lassoPlot|leverage|lhsdesign|lhsnorm|lillietest|LinearModel(?:\.fit)?|linhyptest|linkage|logn(?:cdf|fit|inv|like|pdf|rnd|stat)|lsline|mad|mahal|maineffectsplot|manova1|manovacluster|mdscale|mhsample|mle|mlecov|mnpdf|mnrfit|mnrnd|mnrval|moment|multcompare|multivarichart|mvn(?:cdf|pdf|rnd)|mvregress|mvregresslike|mvt(?:cdf|pdf|rnd)|NaiveBayes(?:\.fit)?|nan(?:cov|max|mean|median|min|std|sum|var)|nbin(?:cdf|fit|inv|pdf|rnd|stat)|ncf(?:cdf|inv|pdf|rnd|stat)|nct(?:cdf|inv|pdf|rnd|stat)|ncx2(?:cdf|inv|pdf|rnd|stat)|NeighborSearcher|nlinfit|nlintool|nlmefit|nlmefitsa|nlparci|nlpredci|nnmf|nominal|NonLinearModel(?:\.fit)?|norm(?:cdf|fit|inv|like|pdf|rnd|stat)|normplot|normspec|ordinal|outlierMeasure|parallelcoords|paretotails|partialcorr|pcacov|pcares|pdf|pdist|pdist2|pearsrnd|perfcurve|perms|piecewisedistribution|plsregress|poiss(?:cdf|fit|inv|pdf|rnd|tat)|polyconf|polytool|prctile|princomp|ProbDist(?:Kernel|Parametric|UnivKernel|UnivParam)?|probplot|procrustes|qqplot|qrandset|qrandstream|quantile|randg|random|randsample|randtool|range|rangesearch|ranksum|rayl(?:cdf|fit|inv|pdf|rnd|stat)|rcoplot|refcurve|refline|regress|Regression(?:BaggedEnsemble|Ensemble|PartitionedEnsemble|PartitionedModel|Tree(?:\.(?:fit|template))?)|regstats|relieff|ridge|robustdemo|robustfit|rotatefactors|rowexch|rsmdemo|rstool|runstest|sampsizepwr|scatterhist|sequentialfs|signrank|signtest|silhouette|skewness|slicesample|sobolset|squareform|statget|statset|stepwise|stepwisefit|surfht|tabulate|tblread|tblwrite|tcdf|tdfread|tiedrank|tinv|tpdf|TreeBagger|treedisp|treefit|treeprune|treetest|treeval|trimmean|trnd|tstat|ttest|ttest2|unid(?:cdf|inv|pdf|rnd|stat)|unif(?:cdf|inv|it|pdf|rnd|stat)|vartest(?:2|n)?|wbl(?:cdf|fit|inv|like|pdf|rnd|stat)|wblplot|wishrnd|x2fx|xptread|zscore|ztest'
  ].join("|");
  var imageFunctions = [
    'adapthisteq|analyze75info|analyze75read|applycform|applylut|axes2pix|bestblk|blockproc|bwarea|bwareaopen|bwboundaries|bwconncomp|bwconvhull|bwdist|bwdistgeodesic|bweuler|bwhitmiss|bwlabel|bwlabeln|bwmorph|bwpack|bwperim|bwselect|bwtraceboundary|bwulterode|bwunpack|checkerboard|col2im|colfilt|conndef|convmtx2|corner|cornermetric|corr2|cp2tform|cpcorr|cpselect|cpstruct2pairs|dct2|dctmtx|deconvblind|deconvlucy|deconvreg|deconvwnr|decorrstretch|demosaic|dicom(?:anon|dict|info|lookup|read|uid|write)|edge|edgetaper|entropy|entropyfilt|fan2para|fanbeam|findbounds|fliptform|freqz2|fsamp2|fspecial|ftrans2|fwind1|fwind2|getheight|getimage|getimagemodel|getline|getneighbors|getnhood|getpts|getrangefromclass|getrect|getsequence|gray2ind|graycomatrix|graycoprops|graydist|grayslice|graythresh|hdrread|hdrwrite|histeq|hough|houghlines|houghpeaks|iccfind|iccread|iccroot|iccwrite|idct2|ifanbeam|im2bw|im2col|im2double|im2int16|im2java2d|im2single|im2uint16|im2uint8|imabsdiff|imadd|imadjust|ImageAdapter|imageinfo|imagemodel|imapplymatrix|imattributes|imbothat|imclearborder|imclose|imcolormaptool|imcomplement|imcontour|imcontrast|imcrop|imdilate|imdisplayrange|imdistline|imdivide|imellipse|imerode|imextendedmax|imextendedmin|imfill|imfilter|imfindcircles|imfreehand|imfuse|imgca|imgcf|imgetfile|imhandles|imhist|imhmax|imhmin|imimposemin|imlincomb|imline|immagbox|immovie|immultiply|imnoise|imopen|imoverview|imoverviewpanel|impixel|impixelinfo|impixelinfoval|impixelregion|impixelregionpanel|implay|impoint|impoly|impositionrect|improfile|imputfile|impyramid|imreconstruct|imrect|imregconfig|imregionalmax|imregionalmin|imregister|imresize|imroi|imrotate|imsave|imscrollpanel|imshow|imshowpair|imsubtract|imtool|imtophat|imtransform|imview|ind2gray|ind2rgb|interfileinfo|interfileread|intlut|ippl|iptaddcallback|iptcheckconn|iptcheckhandle|iptcheckinput|iptcheckmap|iptchecknargin|iptcheckstrs|iptdemos|iptgetapi|iptGetPointerBehavior|iptgetpref|ipticondir|iptnum2ordinal|iptPointerManager|iptprefs|iptremovecallback|iptSetPointerBehavior|iptsetpref|iptwindowalign|iradon|isbw|isflat|isgray|isicc|isind|isnitf|isrgb|isrset|lab2double|lab2uint16|lab2uint8|label2rgb|labelmatrix|makecform|makeConstrainToRectFcn|makehdr|makelut|makeresampler|maketform|mat2gray|mean2|medfilt2|montage|nitfinfo|nitfread|nlfilter|normxcorr2|ntsc2rgb|openrset|ordfilt2|otf2psf|padarray|para2fan|phantom|poly2mask|psf2otf|qtdecomp|qtgetblk|qtsetblk|radon|rangefilt|reflect|regionprops|registration\.metric\.(?:MattesMutualInformation|MeanSquares)|registration\.optimizer\.(?:OnePlusOneEvolutionary|RegularStepGradientDescent)|rgb2gray|rgb2ntsc|rgb2ycbcr|roicolor|roifill|roifilt2|roipoly|rsetwrite|std2|stdfilt|strel|stretchlim|subimage|tformarray|tformfwd|tforminv|tonemap|translate|truesize|uintlut|viscircles|warp|watershed|whitepoint|wiener2|xyz2double|xyz2uint16|ycbcr2rgb'
  ].join("|");
  var optimFunctions = [
    'bintprog|color|fgoalattain|fminbnd|fmincon|fminimax|fminsearch|fminunc|fseminf|fsolve|fzero|fzmult|gangstr|ktrlink|linprog|lsqcurvefit|lsqlin|lsqnonlin|lsqnonneg|optimget|optimset|optimtool|quadprog'
  ].join("|");

  // identifiers: variable/function name, or a chain of variable names joined by dots (obj.method, struct.field1.field2, etc..)
  // valid variable names (start with letter, and contains letters, digits, and underscores).
  // we match "xx.yy" as a whole so that if "xx" is plain and "yy" is not, we dont get a false positive for "yy"
  //var reIdent = '(?:[a-zA-Z][a-zA-Z0-9_]*)';
  //var reIdentChain = '(?:' + reIdent + '(?:\.' + reIdent + ')*' + ')';

  // patterns that always start with a known character. Must have a shortcut string.
  var shortcutStylePatterns = [
    // whitespaces: space, tab, carriage return, line feed, line tab, form-feed, non-break space
    [PR.PR_PLAIN, /^[ \t\r\n\v\f\xA0]+/, null, " \t\r\n\u000b\u000c\u00a0"],

    // block comments
    //TODO: chokes on nested block comments
    //TODO: false positives when the lines with %{ and %} contain non-spaces
    //[PR.PR_COMMENT, /^%(?:[^\{].*|\{(?:%|%*[^\}%])*(?:\}+%?)?)/, null],
    [PR.PR_COMMENT, /^%\{[^%]*%+(?:[^\}%][^%]*%+)*\}/, null],

    // single-line comments
    [PR.PR_COMMENT, /^%[^\r\n]*/, null, "%"],

    // system commands
    [PR_SYSCMD, /^![^\r\n]*/, null, "!"]
  ];

  // patterns that will be tried in order if the shortcut ones fail. May have shortcuts.
  var fallthroughStylePatterns = [
    // line continuation
    [PR_LINE_CONTINUATION, /^\.\.\.\s*[\r\n]/, null],

    // error message
    [PR_ERROR, /^\?\?\? [^\r\n]*/, null],

    // warning message
    [PR_WARNING, /^Warning: [^\r\n]*/, null],

    // command prompt/output
    //[PR_CODE_OUTPUT, /^>>\s+[^\r\n]*[\r\n]{1,2}[^=]*=[^\r\n]*[\r\n]{1,2}[^\r\n]*/, null],    // full command output (both loose/compact format): `>> EXP\nVAR =\n VAL`
    [PR_CODE_OUTPUT, /^>>\s+/, null],      // only the command prompt `>> `
    [PR_CODE_OUTPUT, /^octave:\d+>\s+/, null],  // Octave command prompt `octave:1> `

    // identifier (chain) or closing-parenthesis/brace/bracket, and IS followed by transpose operator
    // this way we dont misdetect the transpose operator ' as the start of a string
    ["lang-matlab-operators", /^((?:[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*|\)|\]|\}|\.)')/, null],

    // identifier (chain), and NOT followed by transpose operator
    // this must come AFTER the "is followed by transpose" step (otherwise it chops the last char of identifier)
    ["lang-matlab-identifiers", /^([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*)(?!')/, null],

    // single-quoted strings: allow for escaping with '', no multilines
    //[PR.PR_STRING, /(?:(?<=(?:\(|\[|\{|\s|=|;|,|:))|^)'(?:[^']|'')*'(?=(?:\)|\]|\}|\s|=|;|,|:|~|<|>|&|-|\+|\*|\.|\^|\|))/, null],  // string vs. transpose (check before/after context using negative/positive lookbehind/lookahead)
    [PR.PR_STRING, /^'(?:[^']|'')*'/, null],  // "'"

    // floating point numbers: 1, 1.0, 1i, -1.1E-1
    [PR.PR_LITERAL, /^[+\-]?\.?\d+(?:\.\d*)?(?:[Ee][+\-]?\d+)?[ij]?/, null],

    // parentheses, braces, brackets
    [PR.PR_TAG, /^(?:\{|\}|\(|\)|\[|\])/, null],  // "{}()[]"

    // other operators
    [PR.PR_PUNCTUATION, /^(?:<|>|=|~|@|&|;|,|:|!|\-|\+|\*|\^|\.|\||\\|\/)/, null]
  ];

  var identifiersPatterns = [
    // list of keywords (`iskeyword`)
    [PR.PR_KEYWORD, /^\b(?:break|case|catch|classdef|continue|else|elseif|end|for|function|global|if|otherwise|parfor|persistent|return|spmd|switch|try|while)\b/, null],

    // some specials variables/constants
    [PR_CONSTANT, /^\b(?:true|false|inf|Inf|nan|NaN|eps|pi|ans|nargin|nargout|varargin|varargout)\b/, null],

    // some data types
    [PR.PR_TYPE, /^\b(?:cell|struct|char|double|single|logical|u?int(?:8|16|32|64)|sparse)\b/, null],

    // commonly used builtin functions from core MATLAB and a few popular toolboxes
    [PR_FUNCTION, new RegExp('^\\b(?:' + coreFunctions + ')\\b'), null],
    [PR_FUNCTION_TOOLBOX, new RegExp('^\\b(?:' + statsFunctions + ')\\b'), null],
    [PR_FUNCTION_TOOLBOX, new RegExp('^\\b(?:' + imageFunctions + ')\\b'), null],
    [PR_FUNCTION_TOOLBOX, new RegExp('^\\b(?:' + optimFunctions + ')\\b'), null],

    // plain identifier (user-defined variable/function name)
    [PR_IDENTIFIER, /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*/, null]
  ];

  var operatorsPatterns = [
    // forward to identifiers to match
    ["lang-matlab-identifiers", /^([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*)/, null],

    // parentheses, braces, brackets
    [PR.PR_TAG, /^(?:\{|\}|\(|\)|\[|\])/, null],  // "{}()[]"

    // other operators
    [PR.PR_PUNCTUATION, /^(?:<|>|=|~|@|&|;|,|:|!|\-|\+|\*|\^|\.|\||\\|\/)/, null],

    // transpose operators
    [PR_TRANSPOSE, /^'/, null]
  ];

  PR.registerLangHandler(
    PR.createSimpleLexer([], identifiersPatterns),
    ["matlab-identifiers"]
  );
  PR.registerLangHandler(
    PR.createSimpleLexer([], operatorsPatterns),
    ["matlab-operators"]
  );
  PR.registerLangHandler(
    PR.createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns),
    ["matlab"]
  );
})(window['PR']);
// Copyright (C) 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for OCaml, SML, F# and similar languages.
 *
 * Based on the lexical grammar at
 * http://research.microsoft.com/en-us/um/cambridge/projects/fsharp/manual/spec.html#_Toc270597388
 *
 * @author mikesamuel@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace is made up of spaces, tabs and newline characters.
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // #if ident/#else/#endif directives delimit conditional compilation
         // sections
         [PR['PR_COMMENT'],
          /^#(?:if[\t\n\r \xA0]+(?:[a-z_$][\w\']*|``[^\r\n\t`]*(?:``|$))|else|endif|light)/i,
          null, '#'],
         // A double or single quoted, possibly multi-line, string.
         // F# allows escaped newlines in strings.
         [PR['PR_STRING'],      /^(?:\"(?:[^\"\\]|\\[\s\S])*(?:\"|$)|\'(?:[^\'\\]|\\[\s\S])(?:\'|$))/, null, '"\'']
        ],
        [
         // Block comments are delimited by (* and *) and may be
         // nested. Single-line comments begin with // and extend to
         // the end of a line.
         // TODO: (*...*) comments can be nested.  This does not handle that.
         [PR['PR_COMMENT'],     /^(?:\/\/[^\r\n]*|\(\*[\s\S]*?\*\))/],
         [PR['PR_KEYWORD'],     /^(?:abstract|and|as|assert|begin|class|default|delegate|do|done|downcast|downto|elif|else|end|exception|extern|false|finally|for|fun|function|if|in|inherit|inline|interface|internal|lazy|let|match|member|module|mutable|namespace|new|null|of|open|or|override|private|public|rec|return|static|struct|then|to|true|try|type|upcast|use|val|void|when|while|with|yield|asr|land|lor|lsl|lsr|lxor|mod|sig|atomic|break|checked|component|const|constraint|constructor|continue|eager|event|external|fixed|functor|global|include|method|mixin|object|parallel|process|protected|pure|sealed|trait|virtual|volatile)\b/],
         // A number is a hex integer literal, a decimal real literal, or in
         // scientific notation.
         [PR['PR_LITERAL'],
          /^[+\-]?(?:0x[\da-f]+|(?:(?:\.\d+|\d+(?:\.\d*)?)(?:e[+\-]?\d+)?))/i],
         [PR['PR_PLAIN'],       /^(?:[a-z_][\w']*[!?#]?|``[^\r\n\t`]*(?:``|$))/i],
         // A printable non-space non-special character
         [PR['PR_PUNCTUATION'], /^[^\t\n\r \xA0\"\'\w]+/]
        ]),
    ['fs', 'ml']);
// Copyright (C) 2011 Kitware Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for MUMPS.
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-mumps">(my SQL code)</pre>
 * 
 * Commands, intrinsic functions and variables taken from ISO/IEC 11756:1999(E)
 *
 * @author chris.harris@kitware.com
 *
 * Known issues:
 * 
 * - Currently can't distinguish between keywords and local or global variables having the same name
 *   for exampe SET IF="IF?"
 * - m file are already used for MatLab hence using mumps.
 */


(function () {


var commands = 'B|BREAK|'       + 
               'C|CLOSE|'       +
               'D|DO|'          +
               'E|ELSE|'        +
               'F|FOR|'         +
               'G|GOTO|'        +
               'H|HALT|'        +
               'H|HANG|'        +
               'I|IF|'          +
               'J|JOB|'         +
               'K|KILL|'        +
               'L|LOCK|'        +
               'M|MERGE|'       +
               'N|NEW|'         +
               'O|OPEN|'        +     
               'Q|QUIT|'        +
               'R|READ|'        +
               'S|SET|'         +
               'TC|TCOMMIT|'    +
               'TRE|TRESTART|'  +
               'TRO|TROLLBACK|' +
               'TS|TSTART|'     +
               'U|USE|'         +
               'V|VIEW|'        +  
               'W|WRITE|'       +
               'X|XECUTE';

var intrinsicVariables = 'D|DEVICE|'       +
                         'EC|ECODE|'       +  
                         'ES|ESTACK|'      +
                         'ET|ETRAP|'       +
                         'H|HOROLOG|'      +
                         'I|IO|'           +
                         'J|JOB|'          +
                         'K|KEY|'          +
                         'P|PRINCIPAL|'    +
                         'Q|QUIT|'         +
                         'ST|STACK|'       +
                         'S|STORAGE|'      +
                         'SY|SYSTEM|'      +
                         'T|TEST|'         +
                         'TL|TLEVEL|'      +
                         'TR|TRESTART|'    +
                         'X|'              +
                         'Y|'              +
                         'Z[A-Z]*|';    

var intrinsicFunctions = 'A|ASCII|'        +
                         'C|CHAR|'         +
                         'D|DATA|'         +
                         'E|EXTRACT|'      +
                         'F|FIND|'         +
                         'FN|FNUMBER|'     +
                         'G|GET|'          +
                         'J|JUSTIFY|'      +
                         'L|LENGTH|'       +
                         'NA|NAME|'        +
                         'O|ORDER|'        +
                         'P|PIECE|'        +
                         'QL|QLENGTH|'     +
                         'QS|QSUBSCRIPT|'  +
                         'Q|QUERY|'        +
                         'R|RANDOM|'       +
                         'RE|REVERSE|'     +
                         'S|SELECT|'       +
                         'ST|STACK|'       +
                         'T|TEXT|'         +
                         'TR|TRANSLATE|'   +
                         'V|VIEW|'         * 
                         'Z[A-Z]*|';   

var intrinsic = intrinsicVariables + intrinsicFunctions;                  


var shortcutStylePatterns = [
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // A double or single quoted, possibly multi-line, string.
         [PR['PR_STRING'],      /^(?:"(?:[^"]|\\.)*")/, null, '"']
  ];

var fallthroughStylePatterns = [
         // A line comment that starts with ;
         [PR['PR_COMMENT'],     /^;[^\r\n]*/, null, ';'],
         // Add intrinsic variables and functions as declarations, there not really but it mean
         // they will hilighted differently from commands.
         [PR['PR_DECLARATION'], new RegExp('^(?:\\$(?:' + intrinsic + '))\\b', 'i'), null],
         // Add commands as keywords
         [PR['PR_KEYWORD'], new RegExp('^(?:[^\\$]' + commands + ')\\b', 'i'), null],
         // A number is a decimal real literal or in scientific notation. 
         [PR['PR_LITERAL'],
          /^[+-]?(?:(?:\.\d+|\d+(?:\.\d*)?)(?:E[+\-]?\d+)?)/i], 
         // An identifier
         [PR['PR_PLAIN'], /^[a-z][a-zA-Z0-9]*/i],
         // Exclude $ % and ^
         [PR['PR_PUNCTUATION'], /^[^\w\t\n\r\xA0\"\$;%\^]|_/]
  ];
// Can't use m as its already used for MatLab
PR.registerLangHandler(PR.createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns), ['mumps']);
})();
// Copyright (C) 2011 Zimin A.V.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * Registers a language handler for the Nemerle language.
 * http://nemerle.org
 * @author Zimin A.V.
 */

(function () {
  // http://nemerle.org/wiki/index.php?title=Base_keywords
  var keywords = 'abstract|and|as|base|catch|class|def|delegate|enum|event|extern|false|finally|'
         + 'fun|implements|interface|internal|is|macro|match|matches|module|mutable|namespace|new|'
         + 'null|out|override|params|partial|private|protected|public|ref|sealed|static|struct|'
         + 'syntax|this|throw|true|try|type|typeof|using|variant|virtual|volatile|when|where|with|'
         + 'assert|assert2|async|break|checked|continue|do|else|ensures|for|foreach|if|late|lock|new|nolate|'
         + 'otherwise|regexp|repeat|requires|return|surroundwith|unchecked|unless|using|while|yield';

  PR['registerLangHandler'](PR['createSimpleLexer'](
      // shortcutStylePatterns
      [
        [PR['PR_STRING'], /^(?:\'(?:[^\\\'\r\n]|\\.)*\'|\"(?:[^\\\"\r\n]|\\.)*(?:\"|$))/, null, '"'],
        [PR['PR_COMMENT'], /^#(?:(?:define|elif|else|endif|error|ifdef|include|ifndef|line|pragma|undef|warning)\b|[^\r\n]*)/, null, '#'],
        [PR['PR_PLAIN'], /^\s+/, null, ' \r\n\t\xA0']
      ],
      // fallthroughStylePatterns
      [
        [PR['PR_STRING'], /^@\"(?:[^\"]|\"\")*(?:\"|$)/, null],
        [PR['PR_STRING'], /^<#(?:[^#>])*(?:#>|$)/, null],
        [PR['PR_STRING'], /^<(?:(?:(?:\.\.\/)*|\/?)(?:[\w-]+(?:\/[\w-]+)+)?[\w-]+\.h|[a-z]\w*)>/, null],
        [PR['PR_COMMENT'], /^\/\/[^\r\n]*/, null],
        [PR['PR_COMMENT'], /^\/\*[\s\S]*?(?:\*\/|$)/, null],
        [PR['PR_KEYWORD'], new RegExp('^(?:' + keywords + ')\\b'), null],
        [PR['PR_TYPE'], /^(?:array|bool|byte|char|decimal|double|float|int|list|long|object|sbyte|short|string|ulong|uint|ufloat|ulong|ushort|void)\b/, null],
        [PR['PR_LITERAL'], /^@[a-z_$][a-z_$@0-9]*/i, null],
        [PR['PR_TYPE'], /^@[A-Z]+[a-z][A-Za-z_$@0-9]*/, null],
        [PR['PR_PLAIN'], /^'?[A-Za-z_$][a-z_$@0-9]*/i, null],
        [PR['PR_LITERAL'], new RegExp(
             '^(?:'
  // A hex number
             + '0x[a-f0-9]+'
  // or an octal or decimal number,
             + '|(?:\\d(?:_\\d+)*\\d*(?:\\.\\d*)?|\\.\\d\\+)'
  // possibly in scientific notation
             + '(?:e[+\\-]?\\d+)?'
             + ')'
  // with an optional modifier like UL for unsigned long
             + '[a-z]*', 'i'), null, '0123456789'],

        [PR['PR_PUNCTUATION'], /^.[^\s\w\.$@\'\"\`\/\#]*/, null]
      ]),
      ['n', 'nemerle']);
})();
// Contributed by peter dot kofler at code minus cop dot org

/**
 * @fileoverview
 * Registers a language handler for (Turbo) Pascal.
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-pascal">(my Pascal code)</pre>
 *
 * @author peter dot kofler at code minus cop dot org
 */


PR.registerLangHandler(
    PR.createSimpleLexer(
        [ // shortcutStylePatterns
          // 'single-line-string'
          [PR.PR_STRING,        /^(?:\'(?:[^\\\'\r\n]|\\.)*(?:\'|$))/, null, '\''],
          // Whitespace
          [PR.PR_PLAIN,         /^\s+/, null, ' \r\n\t\xA0']
        ],
        [ // fallthroughStylePatterns
          // A cStyleComments comment (* *) or {}
          [PR.PR_COMMENT,       /^\(\*[\s\S]*?(?:\*\)|$)|^\{[\s\S]*?(?:\}|$)/, null],
          [PR.PR_KEYWORD,       /^(?:ABSOLUTE|AND|ARRAY|ASM|ASSEMBLER|BEGIN|CASE|CONST|CONSTRUCTOR|DESTRUCTOR|DIV|DO|DOWNTO|ELSE|END|EXTERNAL|FOR|FORWARD|FUNCTION|GOTO|IF|IMPLEMENTATION|IN|INLINE|INTERFACE|INTERRUPT|LABEL|MOD|NOT|OBJECT|OF|OR|PACKED|PROCEDURE|PROGRAM|RECORD|REPEAT|SET|SHL|SHR|THEN|TO|TYPE|UNIT|UNTIL|USES|VAR|VIRTUAL|WHILE|WITH|XOR)\b/i, null],
          [PR.PR_LITERAL,       /^(?:true|false|self|nil)/i, null],
          [PR.PR_PLAIN,         /^[a-z][a-z0-9]*/i, null],
          // Literals .0, 0, 0.0 0E13
          [PR.PR_LITERAL,       /^(?:\$[a-f0-9]+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?)/i,  null, '0123456789'],
          [PR.PR_PUNCTUATION,   /^.[^\s\w\.$@\'\/]*/, null]
        ]),
    ['pascal']);
// Copyright (C) 2006 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * Registers a language handler for Protocol Buffers as described at
 * http://code.google.com/p/protobuf/.
 *
 * Based on the lexical grammar at
 * http://research.microsoft.com/fsharp/manual/spec2.aspx#_Toc202383715
 *
 * @author mikesamuel@gmail.com
 */


PR['registerLangHandler'](PR['sourceDecorator']({
        'keywords': (
            'bytes,default,double,enum,extend,extensions,false,'
            + 'group,import,max,message,option,'
            + 'optional,package,repeated,required,returns,rpc,service,'
            + 'syntax,to,true'),
        'types': /^(bool|(double|s?fixed|[su]?int)(32|64)|float|string)\b/,
        'cStyleComments': true
      }), ['proto']);
// Copyright (C) 2012 Jeffrey B. Arnold
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * Registers a language handler for S, S-plus, and R source code.
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-r"> code </pre>
 *
 * Language definition from
 * http://cran.r-project.org/doc/manuals/R-lang.html.
 * Many of the regexes are shared  with the pygments SLexer,
 * http://pygments.org/.
 *
 * Original: https://raw.github.com/jrnold/prettify-lang-r-bugs/master/lang-r.js
 *
 * @author jeffrey.arnold@gmail.com
 */

PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
            [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
	    [PR['PR_STRING'],      /^\"(?:[^\"\\]|\\[\s\S])*(?:\"|$)/, null, '"'],
	    [PR['PR_STRING'],      /^\'(?:[^\'\\]|\\[\s\S])*(?:\'|$)/, null, "'"]
        ],
        [
            [PR['PR_COMMENT'],     /^#.*/],
	    [PR['PR_KEYWORD'],     /^(?:if|else|for|while|repeat|in|next|break|return|switch|function)(?![A-Za-z0-9_.])/],
	    // hex numbes
	    [PR['PR_LITERAL'], /^0[xX][a-fA-F0-9]+([pP][0-9]+)?[Li]?/],
	    // Decimal numbers
            [PR['PR_LITERAL'], /^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)([eE][+-]?[0-9]+)?[Li]?/],
	    // builtin symbols
	    [PR['PR_LITERAL'], /^(?:NULL|NA(?:_(?:integer|real|complex|character)_)?|Inf|TRUE|FALSE|NaN|\.\.(?:\.|[0-9]+))(?![A-Za-z0-9_.])/],
	    // assignment, operators, and parens, etc.
	    [PR['PR_PUNCTUATION'], /^(?:<<?-|->>?|-|==|<=|>=|<|>|&&?|!=|\|\|?|\*|\+|\^|\/|!|%.*?%|=|~|\$|@|:{1,3}|[\[\](){};,?])/],
	    // valid variable names
	    [PR['PR_PLAIN'], /^(?:[A-Za-z]+[A-Za-z0-9_.]*|\.[a-zA-Z_][0-9a-zA-Z\._]*)(?![A-Za-z0-9_.])/],
	    // string backtick
	    [PR['PR_STRING'], /^`.+`/]
        ]),
    ['r', 's', 'R', 'S', 'Splus']);
// Copyright (C) 2012 Jeffrey Arnold
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * Support for R documentation (Rd) files
 *
 * Minimal highlighting or Rd files, basically just highlighting
 * macros. It does not try to identify verbatim or R-like regions of
 * macros as that is too complicated for a lexer.  Descriptions of the
 * Rd format can be found
 * http://cran.r-project.org/doc/manuals/R-exts.html and
 * http://developer.r-project.org/parseRd.pdf.
 *
 * @author Jeffrey Arnold
 */

PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
            // whitespace
            [PR['PR_PLAIN'],   /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
            // all comments begin with '%'
            [PR['PR_COMMENT'], /^%[^\r\n]*/, null, '%']
        ],
        [// special macros with no args
            [PR['PR_LITERAL'], /^\\(?:cr|l?dots|R|tab)\b/],
	    // macros
            [PR['PR_KEYWORD'], /^\\[a-zA-Z@]+/],
	    // highlighted as macros, since technically they are
            [PR['PR_KEYWORD'],  /^#(?:ifn?def|endif)/ ],
	    // catch escaped brackets
	    [PR['PR_PLAIN'], /^\\[{}]/],
            // punctuation
            [PR['PR_PUNCTUATION'], /^[{}()\[\]]+/]
        ]),
    ['Rd', 'rd']);
// Copyright (C) 2010 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * Registers a language handler for Scala.
 *
 * Derived from http://lampsvn.epfl.ch/svn-repos/scala/scala-documentation/trunk/src/reference/SyntaxSummary.tex
 *
 * @author mikesamuel@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // A double or single quoted string 
          // or a triple double-quoted multi-line string.
         [PR['PR_STRING'],
          /^(?:"(?:(?:""(?:""?(?!")|[^\\"]|\\.)*"{0,3})|(?:[^"\r\n\\]|\\.)*"?))/,
          null, '"'],
         [PR['PR_LITERAL'],     /^`(?:[^\r\n\\`]|\\.)*`?/, null, '`'],
         [PR['PR_PUNCTUATION'], /^[!#%&()*+,\-:;<=>?@\[\\\]^{|}~]+/, null,
          '!#%&()*+,-:;<=>?@[\\]^{|}~']
        ],
        [
         // A symbol literal is a single quote followed by an identifier with no
         // single quote following
         // A character literal has single quotes on either side
         [PR['PR_STRING'],      /^'(?:[^\r\n\\']|\\(?:'|[^\r\n']+))'/],
         [PR['PR_LITERAL'],     /^'[a-zA-Z_$][\w$]*(?!['$\w])/],
         [PR['PR_KEYWORD'],     /^(?:abstract|case|catch|class|def|do|else|extends|final|finally|for|forSome|if|implicit|import|lazy|match|new|object|override|package|private|protected|requires|return|sealed|super|throw|trait|try|type|val|var|while|with|yield)\b/],
         [PR['PR_LITERAL'],     /^(?:true|false|null|this)\b/],
         [PR['PR_LITERAL'],     /^(?:(?:0(?:[0-7]+|X[0-9A-F]+))L?|(?:(?:0|[1-9][0-9]*)(?:(?:\.[0-9]+)?(?:E[+\-]?[0-9]+)?F?|L?))|\\.[0-9]+(?:E[+\-]?[0-9]+)?F?)/i],
         // Treat upper camel case identifiers as types.
         [PR['PR_TYPE'],        /^[$_]*[A-Z][_$A-Z0-9]*[a-z][\w$]*/],
         [PR['PR_PLAIN'],       /^[$a-zA-Z_][\w$]*/],
         [PR['PR_COMMENT'],     /^\/(?:\/.*|\*(?:\/|\**[^*/])*(?:\*+\/?)?)/],
         [PR['PR_PUNCTUATION'], /^(?:\.+|\/)/]
        ]),
    ['scala']);
// Copyright (C) 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for SQL.
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-sql">(my SQL code)</pre>
 *
 *
 * http://savage.net.au/SQL/sql-99.bnf.html is the basis for the grammar, and
 * http://msdn.microsoft.com/en-us/library/aa238507(SQL.80).aspx and
 * http://meta.stackoverflow.com/q/92352/137403 as the bases for the keyword
 * list.
 *
 * @author mikesamuel@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // A double or single quoted, possibly multi-line, string.
         [PR['PR_STRING'],      /^(?:"(?:[^\"\\]|\\.)*"|'(?:[^\'\\]|\\.)*')/, null,
          '"\'']
        ],
        [
         // A comment is either a line comment that starts with two dashes, or
         // two dashes preceding a long bracketed block.
         [PR['PR_COMMENT'], /^(?:--[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$))/],
         [PR['PR_KEYWORD'], /^(?:ADD|ALL|ALTER|AND|ANY|APPLY|AS|ASC|AUTHORIZATION|BACKUP|BEGIN|BETWEEN|BREAK|BROWSE|BULK|BY|CASCADE|CASE|CHECK|CHECKPOINT|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMN|COMMIT|COMPUTE|CONNECT|CONSTRAINT|CONTAINS|CONTAINSTABLE|CONTINUE|CONVERT|CREATE|CROSS|CURRENT|CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|CURRENT_USER|CURSOR|DATABASE|DBCC|DEALLOCATE|DECLARE|DEFAULT|DELETE|DENY|DESC|DISK|DISTINCT|DISTRIBUTED|DOUBLE|DROP|DUMMY|DUMP|ELSE|END|ERRLVL|ESCAPE|EXCEPT|EXEC|EXECUTE|EXISTS|EXIT|FETCH|FILE|FILLFACTOR|FOLLOWING|FOR|FOREIGN|FREETEXT|FREETEXTTABLE|FROM|FULL|FUNCTION|GOTO|GRANT|GROUP|HAVING|HOLDLOCK|IDENTITY|IDENTITYCOL|IDENTITY_INSERT|IF|IN|INDEX|INNER|INSERT|INTERSECT|INTO|IS|JOIN|KEY|KILL|LEFT|LIKE|LINENO|LOAD|MATCH|MATCHED|MERGE|NATURAL|NATIONAL|NOCHECK|NONCLUSTERED|NOCYCLE|NOT|NULL|NULLIF|OF|OFF|OFFSETS|ON|OPEN|OPENDATASOURCE|OPENQUERY|OPENROWSET|OPENXML|OPTION|OR|ORDER|OUTER|OVER|PARTITION|PERCENT|PIVOT|PLAN|PRECEDING|PRECISION|PRIMARY|PRINT|PROC|PROCEDURE|PUBLIC|RAISERROR|READ|READTEXT|RECONFIGURE|REFERENCES|REPLICATION|RESTORE|RESTRICT|RETURN|REVOKE|RIGHT|ROLLBACK|ROWCOUNT|ROWGUIDCOL|ROWS?|RULE|SAVE|SCHEMA|SELECT|SESSION_USER|SET|SETUSER|SHUTDOWN|SOME|START|STATISTICS|SYSTEM_USER|TABLE|TEXTSIZE|THEN|TO|TOP|TRAN|TRANSACTION|TRIGGER|TRUNCATE|TSEQUAL|UNBOUNDED|UNION|UNIQUE|UNPIVOT|UPDATE|UPDATETEXT|USE|USER|USING|VALUES|VARYING|VIEW|WAITFOR|WHEN|WHERE|WHILE|WITH|WITHIN|WRITETEXT|XML)(?=[^\w-]|$)/i, null],
         // A number is a hex integer literal, a decimal real literal, or in
         // scientific notation.
         [PR['PR_LITERAL'],
          /^[+-]?(?:0x[\da-f]+|(?:(?:\.\d+|\d+(?:\.\d*)?)(?:e[+\-]?\d+)?))/i],
         // An identifier
         [PR['PR_PLAIN'], /^[a-z_][\w-]*/i],
         // A run of punctuation
         [PR['PR_PUNCTUATION'], /^[^\w\t\n\r \xA0\"\'][^\w\t\n\r \xA0+\-\"\']*/]
        ]),
    ['sql']);
// Copyright (C) 2012 Pyrios.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for TCL
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-tcl">proc foo {} {puts bar}</pre>
 *
 * I copy-pasted lang-lisp.js, so this is probably not 100% accurate.
 * I used http://wiki.tcl.tk/1019 for the keywords, but tried to only
 * include as keywords that had more impact on the program flow
 * rather than providing convenience. For example, I included 'if'
 * since that provides branching, but left off 'open' since that is more
 * like a proc. Add more if it makes sense.
 *
 * @author pyrios@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         ['opn',             /^\{+/, null, '{'],
         ['clo',             /^\}+/, null, '}'],
         // A line comment that starts with ;
         [PR['PR_COMMENT'],     /^#[^\r\n]*/, null, '#'],
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // A double quoted, possibly multi-line, string.
         [PR['PR_STRING'],      /^\"(?:[^\"\\]|\\[\s\S])*(?:\"|$)/, null, '"']
        ],
        [
         [PR['PR_KEYWORD'],     /^(?:after|append|apply|array|break|case|catch|continue|error|eval|exec|exit|expr|for|foreach|if|incr|info|proc|return|set|switch|trace|uplevel|upvar|while)\b/, null],
         [PR['PR_LITERAL'],
          /^[+\-]?(?:[0#]x[0-9a-f]+|\d+\/\d+|(?:\.\d+|\d+(?:\.\d*)?)(?:[ed][+\-]?\d+)?)/i],
         // A single quote possibly followed by a word that optionally ends with
         // = ! or ?.
         [PR['PR_LITERAL'],
          /^\'(?:-*(?:\w|\\[\x21-\x7e])(?:[\w-]*|\\[\x21-\x7e])[=!?]?)?/],
         // A word that optionally ends with = ! or ?.
         [PR['PR_PLAIN'],
          /^-*(?:[a-z_]|\\[\x21-\x7e])(?:[\w-]*|\\[\x21-\x7e])[=!?]?/i],
         // A printable non-space non-special character
         [PR['PR_PUNCTUATION'], /^[^\w\t\n\r \xA0()\"\\\';]+/]
        ]),
    ['tcl']);
// Copyright (C) 2011 Martin S.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview
 * Support for tex highlighting as discussed on
 * <a href="http://meta.tex.stackexchange.com/questions/872/text-immediate-following-double-backslashes-is-highlighted-as-macro-inside-a-code/876#876">meta.tex.stackexchange.com</a>.
 *
 * @author Martin S.
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // whitespace
         [PR['PR_PLAIN'],   /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0'],
         // all comments begin with '%'
         [PR['PR_COMMENT'], /^%[^\r\n]*/, null, '%']
        ],
        [
         //[PR['PR_DECLARATION'], /^\\([egx]?def|(new|renew|provide)(command|environment))\b/],
         // any command starting with a \ and contains
         // either only letters (a-z,A-Z), '@' (internal macros)
         [PR['PR_KEYWORD'], /^\\[a-zA-Z@]+/],
         // or contains only one character
         [PR['PR_KEYWORD'], /^\\./],
         // Highlight dollar for math mode and ampersam for tabular
         [PR['PR_TYPE'],    /^[$&]/],
         // numeric measurement values with attached units
         [PR['PR_LITERAL'],
          /[+-]?(?:\.\d+|\d+(?:\.\d*)?)(cm|em|ex|in|pc|pt|bp|mm)/i],
         // punctuation usually occurring within commands
         [PR['PR_PUNCTUATION'], /^[{}()\[\]=]+/]
        ]),
    ['latex', 'tex']);
// Copyright (C) 2009 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for various flavors of basic.
 *
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-vb"></pre>
 *
 *
 * http://msdn.microsoft.com/en-us/library/aa711638(VS.71).aspx defines the
 * visual basic grammar lexical grammar.
 *
 * @author mikesamuel@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t\n\r \xA0\u2028\u2029]+/, null, '\t\n\r \xA0\u2028\u2029'],
         // A double quoted string with quotes escaped by doubling them.
         // A single character can be suffixed with C.
         [PR['PR_STRING'],      /^(?:[\"\u201C\u201D](?:[^\"\u201C\u201D]|[\"\u201C\u201D]{2})(?:[\"\u201C\u201D]c|$)|[\"\u201C\u201D](?:[^\"\u201C\u201D]|[\"\u201C\u201D]{2})*(?:[\"\u201C\u201D]|$))/i, null,
          '"\u201C\u201D'],
         // A comment starts with a single quote and runs until the end of the
         // line.
         // VB6 apparently allows _ as an escape sequence for newlines though
         // this is not a documented feature of VB.net.
         // http://meta.stackoverflow.com/q/121497/137403
         [PR['PR_COMMENT'],     /^[\'\u2018\u2019](?:_(?:\r\n?|[^\r]?)|[^\r\n_\u2028\u2029])*/, null, '\'\u2018\u2019']
        ],
        [
         [PR['PR_KEYWORD'], /^(?:AddHandler|AddressOf|Alias|And|AndAlso|Ansi|As|Assembly|Auto|Boolean|ByRef|Byte|ByVal|Call|Case|Catch|CBool|CByte|CChar|CDate|CDbl|CDec|Char|CInt|Class|CLng|CObj|Const|CShort|CSng|CStr|CType|Date|Decimal|Declare|Default|Delegate|Dim|DirectCast|Do|Double|Each|Else|ElseIf|End|EndIf|Enum|Erase|Error|Event|Exit|Finally|For|Friend|Function|Get|GetType|GoSub|GoTo|Handles|If|Implements|Imports|In|Inherits|Integer|Interface|Is|Let|Lib|Like|Long|Loop|Me|Mod|Module|MustInherit|MustOverride|MyBase|MyClass|Namespace|New|Next|Not|NotInheritable|NotOverridable|Object|On|Option|Optional|Or|OrElse|Overloads|Overridable|Overrides|ParamArray|Preserve|Private|Property|Protected|Public|RaiseEvent|ReadOnly|ReDim|RemoveHandler|Resume|Return|Select|Set|Shadows|Shared|Short|Single|Static|Step|Stop|String|Structure|Sub|SyncLock|Then|Throw|To|Try|TypeOf|Unicode|Until|Variant|Wend|When|While|With|WithEvents|WriteOnly|Xor|EndIf|GoSub|Let|Variant|Wend)\b/i, null],
         // A second comment form
         [PR['PR_COMMENT'], /^REM\b[^\r\n\u2028\u2029]*/i],
         // A boolean, numeric, or date literal.
         [PR['PR_LITERAL'],
          /^(?:True\b|False\b|Nothing\b|\d+(?:E[+\-]?\d+[FRD]?|[FRDSIL])?|(?:&H[0-9A-F]+|&O[0-7]+)[SIL]?|\d*\.\d+(?:E[+\-]?\d+)?[FRD]?|#\s+(?:\d+[\-\/]\d+[\-\/]\d+(?:\s+\d+:\d+(?::\d+)?(\s*(?:AM|PM))?)?|\d+:\d+(?::\d+)?(\s*(?:AM|PM))?)\s+#)/i],
         // An identifier.  Keywords can be turned into identifers
         // with square brackets, and there may be optional type
         // characters after a normal identifier in square brackets.
         [PR['PR_PLAIN'], /^(?:(?:[a-z]|_\w)\w*(?:\[[%&@!#]+\])?|\[(?:[a-z]|_\w)\w*\])/i],
         // A run of punctuation
         [PR['PR_PUNCTUATION'],
          /^[^\w\t\n\r \"\'\[\]\xA0\u2018\u2019\u201C\u201D\u2028\u2029]+/],
         // Square brackets
         [PR['PR_PUNCTUATION'], /^(?:\[|\])/]
        ]),
    ['vb', 'vbs']);
/**
 * @fileoverview
 * Registers a language handler for VHDL '93.
 *
 * Based on the lexical grammar and keywords at
 * http://www.iis.ee.ethz.ch/~zimmi/download/vhdl93_syntax.html
 *
 * @author benoit@ryder.fr
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace
         [PR['PR_PLAIN'], /^[\t\n\r \xA0]+/, null, '\t\n\r \xA0']
        ],
        [
         // String, character or bit string
         [PR['PR_STRING'], /^(?:[BOX]?"(?:[^\"]|"")*"|'.')/i],
         // Comment, from two dashes until end of line.
         [PR['PR_COMMENT'], /^--[^\r\n]*/],
         [PR['PR_KEYWORD'], /^(?:abs|access|after|alias|all|and|architecture|array|assert|attribute|begin|block|body|buffer|bus|case|component|configuration|constant|disconnect|downto|else|elsif|end|entity|exit|file|for|function|generate|generic|group|guarded|if|impure|in|inertial|inout|is|label|library|linkage|literal|loop|map|mod|nand|new|next|nor|not|null|of|on|open|or|others|out|package|port|postponed|procedure|process|pure|range|record|register|reject|rem|report|return|rol|ror|select|severity|shared|signal|sla|sll|sra|srl|subtype|then|to|transport|type|unaffected|units|until|use|variable|wait|when|while|with|xnor|xor)(?=[^\w-]|$)/i, null],
         // Type, predefined or standard
         [PR['PR_TYPE'], /^(?:bit|bit_vector|character|boolean|integer|real|time|string|severity_level|positive|natural|signed|unsigned|line|text|std_u?logic(?:_vector)?)(?=[^\w-]|$)/i, null],
         // Predefined attributes
         [PR['PR_TYPE'], /^\'(?:ACTIVE|ASCENDING|BASE|DELAYED|DRIVING|DRIVING_VALUE|EVENT|HIGH|IMAGE|INSTANCE_NAME|LAST_ACTIVE|LAST_EVENT|LAST_VALUE|LEFT|LEFTOF|LENGTH|LOW|PATH_NAME|POS|PRED|QUIET|RANGE|REVERSE_RANGE|RIGHT|RIGHTOF|SIMPLE_NAME|STABLE|SUCC|TRANSACTION|VAL|VALUE)(?=[^\w-]|$)/i, null],
         // Number, decimal or based literal
         [PR['PR_LITERAL'], /^\d+(?:_\d+)*(?:#[\w\\.]+#(?:[+\-]?\d+(?:_\d+)*)?|(?:\.\d+(?:_\d+)*)?(?:E[+\-]?\d+(?:_\d+)*)?)/i],
         // Identifier, basic or extended
         [PR['PR_PLAIN'], /^(?:[a-z]\w*|\\[^\\]*\\)/i],
         // Punctuation
         [PR['PR_PUNCTUATION'], /^[^\w\t\n\r \xA0\"\'][^\w\t\n\r \xA0\-\"\']*/]
        ]),
    ['vhdl', 'vhd']);
// Copyright (C) 2009 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * Registers a language handler for Wiki pages.
 *
 * Based on WikiSyntax at http://code.google.com/p/support/wiki/WikiSyntax
 *
 * @author mikesamuel@gmail.com
 */


PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace
         [PR['PR_PLAIN'],       /^[\t \xA0a-gi-z0-9]+/, null,
          '\t \xA0abcdefgijklmnopqrstuvwxyz0123456789'],
         // Wiki formatting
         [PR['PR_PUNCTUATION'], /^[=*~\^\[\]]+/, null, '=*~^[]']
        ],
        [
         // Meta-info like #summary, #labels, etc.
         ['lang-wiki.meta',  /(?:^^|\r\n?|\n)(#[a-z]+)\b/],
         // A WikiWord
         [PR['PR_LITERAL'],     /^(?:[A-Z][a-z][a-z0-9]+[A-Z][a-z][a-zA-Z0-9]+)\b/
          ],
         // A preformatted block in an unknown language
         ['lang-',           /^\{\{\{([\s\S]+?)\}\}\}/],
         // A block of source code in an unknown language
         ['lang-',           /^`([^\r\n`]+)`/],
         // An inline URL.
         [PR['PR_STRING'],
          /^https?:\/\/[^\/?#\s]*(?:\/[^?#\s]*)?(?:\?[^#\s]*)?(?:#\S*)?/i],
         [PR['PR_PLAIN'],       /^(?:\r\n|[\s\S])[^#=*~^A-Zh\{`\[\r\n]*/]
        ]),
    ['wiki']);

PR['registerLangHandler'](
    PR['createSimpleLexer']([[PR['PR_KEYWORD'], /^#[a-z]+/i, null, '#']], []),
    ['wiki.meta']);
// Copyright (C) 2011 Patrick Wied
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview
 * Registers a language handler for XQuery.
 *
 * To use, include prettify.js and this file in your HTML page.
 * Then put your code in an HTML tag like
 *      <pre class="prettyprint lang-xq"></pre>
 *
 *
 * @author Patrick Wied ( patpa7p@live.de )
 * @version 2010-09-28
 */

// Falls back to plain for stylesheets that don't style fun.
var PR_FUNCTION = 'fun pln';
// Falls back to plaiin for stylesheets that don't style var.
var PR_VARIABLE = 'var pln';

PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Matching $var-ia_bles
         [PR_VARIABLE, /^\$[A-Za-z0-9_\-]+/, null, "$"]
        ],
        [
         // Matching lt and gt operators
         // Not the best matching solution but you have to differentiate between the gt operator and the tag closing char
         [PR['PR_PLAIN'], /^[\s=][<>][\s=]/],
         // Matching @Attributes
         [PR['PR_LITERAL'], /^\@[\w-]+/],
         // Matching xml tags
         [PR['PR_TAG'], /^<\/?[a-z](?:[\w.:-]*\w)?|\/?>$/i],
         // Matching single or multiline xquery comments -> (: <text> :)
         [PR['PR_COMMENT'], /^\(:[\s\S]*?:\)/],
         // Tokenizing /{}:=;*,[]() as plain
         [PR['PR_PLAIN'], /^[\/\{\};,\[\]\(\)]$/],
         // Matching a double or single quoted, possibly multi-line, string.
         // with the special condition that a { in a string changes to xquery context 
         [PR['PR_STRING'], /^(?:\"(?:[^\"\\\{]|\\[\s\S])*(?:\"|$)|\'(?:[^\'\\\{]|\\[\s\S])*(?:\'|$))/, null, '"\''],
         // Matching standard xquery keywords
         [PR['PR_KEYWORD'], /^(?:xquery|where|version|variable|union|typeswitch|treat|to|then|text|stable|sortby|some|self|schema|satisfies|returns|return|ref|processing-instruction|preceding-sibling|preceding|precedes|parent|only|of|node|namespace|module|let|item|intersect|instance|in|import|if|function|for|follows|following-sibling|following|external|except|every|else|element|descending|descendant-or-self|descendant|define|default|declare|comment|child|cast|case|before|attribute|assert|ascending|as|ancestor-or-self|ancestor|after|eq|order|by|or|and|schema-element|document-node|node|at)\b/],
         // Matching standard xquery types
         [PR['PR_TYPE'], /^(?:xs:yearMonthDuration|xs:unsignedLong|xs:time|xs:string|xs:short|xs:QName|xs:Name|xs:long|xs:integer|xs:int|xs:gYearMonth|xs:gYear|xs:gMonthDay|xs:gDay|xs:float|xs:duration|xs:double|xs:decimal|xs:dayTimeDuration|xs:dateTime|xs:date|xs:byte|xs:boolean|xs:anyURI|xf:yearMonthDuration)\b/, null],
         // Matching standard xquery functions
         [PR_FUNCTION, /^(?:xp:dereference|xinc:node-expand|xinc:link-references|xinc:link-expand|xhtml:restructure|xhtml:clean|xhtml:add-lists|xdmp:zip-manifest|xdmp:zip-get|xdmp:zip-create|xdmp:xquery-version|xdmp:word-convert|xdmp:with-namespaces|xdmp:version|xdmp:value|xdmp:user-roles|xdmp:user-last-login|xdmp:user|xdmp:url-encode|xdmp:url-decode|xdmp:uri-is-file|xdmp:uri-format|xdmp:uri-content-type|xdmp:unquote|xdmp:unpath|xdmp:triggers-database|xdmp:trace|xdmp:to-json|xdmp:tidy|xdmp:subbinary|xdmp:strftime|xdmp:spawn-in|xdmp:spawn|xdmp:sleep|xdmp:shutdown|xdmp:set-session-field|xdmp:set-response-encoding|xdmp:set-response-content-type|xdmp:set-response-code|xdmp:set-request-time-limit|xdmp:set|xdmp:servers|xdmp:server-status|xdmp:server-name|xdmp:server|xdmp:security-database|xdmp:security-assert|xdmp:schema-database|xdmp:save|xdmp:role-roles|xdmp:role|xdmp:rethrow|xdmp:restart|xdmp:request-timestamp|xdmp:request-status|xdmp:request-cancel|xdmp:request|xdmp:redirect-response|xdmp:random|xdmp:quote|xdmp:query-trace|xdmp:query-meters|xdmp:product-edition|xdmp:privilege-roles|xdmp:privilege|xdmp:pretty-print|xdmp:powerpoint-convert|xdmp:platform|xdmp:permission|xdmp:pdf-convert|xdmp:path|xdmp:octal-to-integer|xdmp:node-uri|xdmp:node-replace|xdmp:node-kind|xdmp:node-insert-child|xdmp:node-insert-before|xdmp:node-insert-after|xdmp:node-delete|xdmp:node-database|xdmp:mul64|xdmp:modules-root|xdmp:modules-database|xdmp:merging|xdmp:merge-cancel|xdmp:merge|xdmp:md5|xdmp:logout|xdmp:login|xdmp:log-level|xdmp:log|xdmp:lock-release|xdmp:lock-acquire|xdmp:load|xdmp:invoke-in|xdmp:invoke|xdmp:integer-to-octal|xdmp:integer-to-hex|xdmp:http-put|xdmp:http-post|xdmp:http-options|xdmp:http-head|xdmp:http-get|xdmp:http-delete|xdmp:hosts|xdmp:host-status|xdmp:host-name|xdmp:host|xdmp:hex-to-integer|xdmp:hash64|xdmp:hash32|xdmp:has-privilege|xdmp:groups|xdmp:group-serves|xdmp:group-servers|xdmp:group-name|xdmp:group-hosts|xdmp:group|xdmp:get-session-field-names|xdmp:get-session-field|xdmp:get-response-encoding|xdmp:get-response-code|xdmp:get-request-username|xdmp:get-request-user|xdmp:get-request-url|xdmp:get-request-protocol|xdmp:get-request-path|xdmp:get-request-method|xdmp:get-request-header-names|xdmp:get-request-header|xdmp:get-request-field-names|xdmp:get-request-field-filename|xdmp:get-request-field-content-type|xdmp:get-request-field|xdmp:get-request-client-certificate|xdmp:get-request-client-address|xdmp:get-request-body|xdmp:get-current-user|xdmp:get-current-roles|xdmp:get|xdmp:function-name|xdmp:function-module|xdmp:function|xdmp:from-json|xdmp:forests|xdmp:forest-status|xdmp:forest-restore|xdmp:forest-restart|xdmp:forest-name|xdmp:forest-delete|xdmp:forest-databases|xdmp:forest-counts|xdmp:forest-clear|xdmp:forest-backup|xdmp:forest|xdmp:filesystem-file|xdmp:filesystem-directory|xdmp:exists|xdmp:excel-convert|xdmp:eval-in|xdmp:eval|xdmp:estimate|xdmp:email|xdmp:element-content-type|xdmp:elapsed-time|xdmp:document-set-quality|xdmp:document-set-property|xdmp:document-set-properties|xdmp:document-set-permissions|xdmp:document-set-collections|xdmp:document-remove-properties|xdmp:document-remove-permissions|xdmp:document-remove-collections|xdmp:document-properties|xdmp:document-locks|xdmp:document-load|xdmp:document-insert|xdmp:document-get-quality|xdmp:document-get-properties|xdmp:document-get-permissions|xdmp:document-get-collections|xdmp:document-get|xdmp:document-forest|xdmp:document-delete|xdmp:document-add-properties|xdmp:document-add-permissions|xdmp:document-add-collections|xdmp:directory-properties|xdmp:directory-locks|xdmp:directory-delete|xdmp:directory-create|xdmp:directory|xdmp:diacritic-less|xdmp:describe|xdmp:default-permissions|xdmp:default-collections|xdmp:databases|xdmp:database-restore-validate|xdmp:database-restore-status|xdmp:database-restore-cancel|xdmp:database-restore|xdmp:database-name|xdmp:database-forests|xdmp:database-backup-validate|xdmp:database-backup-status|xdmp:database-backup-purge|xdmp:database-backup-cancel|xdmp:database-backup|xdmp:database|xdmp:collection-properties|xdmp:collection-locks|xdmp:collection-delete|xdmp:collation-canonical-uri|xdmp:castable-as|xdmp:can-grant-roles|xdmp:base64-encode|xdmp:base64-decode|xdmp:architecture|xdmp:apply|xdmp:amp-roles|xdmp:amp|xdmp:add64|xdmp:add-response-header|xdmp:access|trgr:trigger-set-recursive|trgr:trigger-set-permissions|trgr:trigger-set-name|trgr:trigger-set-module|trgr:trigger-set-event|trgr:trigger-set-description|trgr:trigger-remove-permissions|trgr:trigger-module|trgr:trigger-get-permissions|trgr:trigger-enable|trgr:trigger-disable|trgr:trigger-database-online-event|trgr:trigger-data-event|trgr:trigger-add-permissions|trgr:remove-trigger|trgr:property-content|trgr:pre-commit|trgr:post-commit|trgr:get-trigger-by-id|trgr:get-trigger|trgr:document-scope|trgr:document-content|trgr:directory-scope|trgr:create-trigger|trgr:collection-scope|trgr:any-property-content|thsr:set-entry|thsr:remove-term|thsr:remove-synonym|thsr:remove-entry|thsr:query-lookup|thsr:lookup|thsr:load|thsr:insert|thsr:expand|thsr:add-synonym|spell:suggest-detailed|spell:suggest|spell:remove-word|spell:make-dictionary|spell:load|spell:levenshtein-distance|spell:is-correct|spell:insert|spell:double-metaphone|spell:add-word|sec:users-collection|sec:user-set-roles|sec:user-set-password|sec:user-set-name|sec:user-set-description|sec:user-set-default-permissions|sec:user-set-default-collections|sec:user-remove-roles|sec:user-privileges|sec:user-get-roles|sec:user-get-description|sec:user-get-default-permissions|sec:user-get-default-collections|sec:user-doc-permissions|sec:user-doc-collections|sec:user-add-roles|sec:unprotect-collection|sec:uid-for-name|sec:set-realm|sec:security-version|sec:security-namespace|sec:security-installed|sec:security-collection|sec:roles-collection|sec:role-set-roles|sec:role-set-name|sec:role-set-description|sec:role-set-default-permissions|sec:role-set-default-collections|sec:role-remove-roles|sec:role-privileges|sec:role-get-roles|sec:role-get-description|sec:role-get-default-permissions|sec:role-get-default-collections|sec:role-doc-permissions|sec:role-doc-collections|sec:role-add-roles|sec:remove-user|sec:remove-role-from-users|sec:remove-role-from-role|sec:remove-role-from-privileges|sec:remove-role-from-amps|sec:remove-role|sec:remove-privilege|sec:remove-amp|sec:protect-collection|sec:privileges-collection|sec:privilege-set-roles|sec:privilege-set-name|sec:privilege-remove-roles|sec:privilege-get-roles|sec:privilege-add-roles|sec:priv-doc-permissions|sec:priv-doc-collections|sec:get-user-names|sec:get-unique-elem-id|sec:get-role-names|sec:get-role-ids|sec:get-privilege|sec:get-distinct-permissions|sec:get-collection|sec:get-amp|sec:create-user-with-role|sec:create-user|sec:create-role|sec:create-privilege|sec:create-amp|sec:collections-collection|sec:collection-set-permissions|sec:collection-remove-permissions|sec:collection-get-permissions|sec:collection-add-permissions|sec:check-admin|sec:amps-collection|sec:amp-set-roles|sec:amp-remove-roles|sec:amp-get-roles|sec:amp-doc-permissions|sec:amp-doc-collections|sec:amp-add-roles|search:unparse|search:suggest|search:snippet|search:search|search:resolve-nodes|search:resolve|search:remove-constraint|search:parse|search:get-default-options|search:estimate|search:check-options|prof:value|prof:reset|prof:report|prof:invoke|prof:eval|prof:enable|prof:disable|prof:allowed|ppt:clean|pki:template-set-request|pki:template-set-name|pki:template-set-key-type|pki:template-set-key-options|pki:template-set-description|pki:template-in-use|pki:template-get-version|pki:template-get-request|pki:template-get-name|pki:template-get-key-type|pki:template-get-key-options|pki:template-get-id|pki:template-get-description|pki:need-certificate|pki:is-temporary|pki:insert-trusted-certificates|pki:insert-template|pki:insert-signed-certificates|pki:insert-certificate-revocation-list|pki:get-trusted-certificate-ids|pki:get-template-ids|pki:get-template-certificate-authority|pki:get-template-by-name|pki:get-template|pki:get-pending-certificate-requests-xml|pki:get-pending-certificate-requests-pem|pki:get-pending-certificate-request|pki:get-certificates-for-template-xml|pki:get-certificates-for-template|pki:get-certificates|pki:get-certificate-xml|pki:get-certificate-pem|pki:get-certificate|pki:generate-temporary-certificate-if-necessary|pki:generate-temporary-certificate|pki:generate-template-certificate-authority|pki:generate-certificate-request|pki:delete-template|pki:delete-certificate|pki:create-template|pdf:make-toc|pdf:insert-toc-headers|pdf:get-toc|pdf:clean|p:status-transition|p:state-transition|p:remove|p:pipelines|p:insert|p:get-by-id|p:get|p:execute|p:create|p:condition|p:collection|p:action|ooxml:runs-merge|ooxml:package-uris|ooxml:package-parts-insert|ooxml:package-parts|msword:clean|mcgm:polygon|mcgm:point|mcgm:geospatial-query-from-elements|mcgm:geospatial-query|mcgm:circle|math:tanh|math:tan|math:sqrt|math:sinh|math:sin|math:pow|math:modf|math:log10|math:log|math:ldexp|math:frexp|math:fmod|math:floor|math:fabs|math:exp|math:cosh|math:cos|math:ceil|math:atan2|math:atan|math:asin|math:acos|map:put|map:map|map:keys|map:get|map:delete|map:count|map:clear|lnk:to|lnk:remove|lnk:insert|lnk:get|lnk:from|lnk:create|kml:polygon|kml:point|kml:interior-polygon|kml:geospatial-query-from-elements|kml:geospatial-query|kml:circle|kml:box|gml:polygon|gml:point|gml:interior-polygon|gml:geospatial-query-from-elements|gml:geospatial-query|gml:circle|gml:box|georss:point|georss:geospatial-query|georss:circle|geo:polygon|geo:point|geo:interior-polygon|geo:geospatial-query-from-elements|geo:geospatial-query|geo:circle|geo:box|fn:zero-or-one|fn:years-from-duration|fn:year-from-dateTime|fn:year-from-date|fn:upper-case|fn:unordered|fn:true|fn:translate|fn:trace|fn:tokenize|fn:timezone-from-time|fn:timezone-from-dateTime|fn:timezone-from-date|fn:sum|fn:subtract-dateTimes-yielding-yearMonthDuration|fn:subtract-dateTimes-yielding-dayTimeDuration|fn:substring-before|fn:substring-after|fn:substring|fn:subsequence|fn:string-to-codepoints|fn:string-pad|fn:string-length|fn:string-join|fn:string|fn:static-base-uri|fn:starts-with|fn:seconds-from-time|fn:seconds-from-duration|fn:seconds-from-dateTime|fn:round-half-to-even|fn:round|fn:root|fn:reverse|fn:resolve-uri|fn:resolve-QName|fn:replace|fn:remove|fn:QName|fn:prefix-from-QName|fn:position|fn:one-or-more|fn:number|fn:not|fn:normalize-unicode|fn:normalize-space|fn:node-name|fn:node-kind|fn:nilled|fn:namespace-uri-from-QName|fn:namespace-uri-for-prefix|fn:namespace-uri|fn:name|fn:months-from-duration|fn:month-from-dateTime|fn:month-from-date|fn:minutes-from-time|fn:minutes-from-duration|fn:minutes-from-dateTime|fn:min|fn:max|fn:matches|fn:lower-case|fn:local-name-from-QName|fn:local-name|fn:last|fn:lang|fn:iri-to-uri|fn:insert-before|fn:index-of|fn:in-scope-prefixes|fn:implicit-timezone|fn:idref|fn:id|fn:hours-from-time|fn:hours-from-duration|fn:hours-from-dateTime|fn:floor|fn:false|fn:expanded-QName|fn:exists|fn:exactly-one|fn:escape-uri|fn:escape-html-uri|fn:error|fn:ends-with|fn:encode-for-uri|fn:empty|fn:document-uri|fn:doc-available|fn:doc|fn:distinct-values|fn:distinct-nodes|fn:default-collation|fn:deep-equal|fn:days-from-duration|fn:day-from-dateTime|fn:day-from-date|fn:data|fn:current-time|fn:current-dateTime|fn:current-date|fn:count|fn:contains|fn:concat|fn:compare|fn:collection|fn:codepoints-to-string|fn:codepoint-equal|fn:ceiling|fn:boolean|fn:base-uri|fn:avg|fn:adjust-time-to-timezone|fn:adjust-dateTime-to-timezone|fn:adjust-date-to-timezone|fn:abs|feed:unsubscribe|feed:subscription|feed:subscribe|feed:request|feed:item|feed:description|excel:clean|entity:enrich|dom:set-pipelines|dom:set-permissions|dom:set-name|dom:set-evaluation-context|dom:set-domain-scope|dom:set-description|dom:remove-pipeline|dom:remove-permissions|dom:remove|dom:get|dom:evaluation-context|dom:domains|dom:domain-scope|dom:create|dom:configuration-set-restart-user|dom:configuration-set-permissions|dom:configuration-set-evaluation-context|dom:configuration-set-default-domain|dom:configuration-get|dom:configuration-create|dom:collection|dom:add-pipeline|dom:add-permissions|dls:retention-rules|dls:retention-rule-remove|dls:retention-rule-insert|dls:retention-rule|dls:purge|dls:node-expand|dls:link-references|dls:link-expand|dls:documents-query|dls:document-versions-query|dls:document-version-uri|dls:document-version-query|dls:document-version-delete|dls:document-version-as-of|dls:document-version|dls:document-update|dls:document-unmanage|dls:document-set-quality|dls:document-set-property|dls:document-set-properties|dls:document-set-permissions|dls:document-set-collections|dls:document-retention-rules|dls:document-remove-properties|dls:document-remove-permissions|dls:document-remove-collections|dls:document-purge|dls:document-manage|dls:document-is-managed|dls:document-insert-and-manage|dls:document-include-query|dls:document-history|dls:document-get-permissions|dls:document-extract-part|dls:document-delete|dls:document-checkout-status|dls:document-checkout|dls:document-checkin|dls:document-add-properties|dls:document-add-permissions|dls:document-add-collections|dls:break-checkout|dls:author-query|dls:as-of-query|dbk:convert|dbg:wait|dbg:value|dbg:stopped|dbg:stop|dbg:step|dbg:status|dbg:stack|dbg:out|dbg:next|dbg:line|dbg:invoke|dbg:function|dbg:finish|dbg:expr|dbg:eval|dbg:disconnect|dbg:detach|dbg:continue|dbg:connect|dbg:clear|dbg:breakpoints|dbg:break|dbg:attached|dbg:attach|cvt:save-converted-documents|cvt:part-uri|cvt:destination-uri|cvt:basepath|cvt:basename|cts:words|cts:word-query-weight|cts:word-query-text|cts:word-query-options|cts:word-query|cts:word-match|cts:walk|cts:uris|cts:uri-match|cts:train|cts:tokenize|cts:thresholds|cts:stem|cts:similar-query-weight|cts:similar-query-nodes|cts:similar-query|cts:shortest-distance|cts:search|cts:score|cts:reverse-query-weight|cts:reverse-query-nodes|cts:reverse-query|cts:remainder|cts:registered-query-weight|cts:registered-query-options|cts:registered-query-ids|cts:registered-query|cts:register|cts:query|cts:quality|cts:properties-query-query|cts:properties-query|cts:polygon-vertices|cts:polygon|cts:point-longitude|cts:point-latitude|cts:point|cts:or-query-queries|cts:or-query|cts:not-query-weight|cts:not-query-query|cts:not-query|cts:near-query-weight|cts:near-query-queries|cts:near-query-options|cts:near-query-distance|cts:near-query|cts:highlight|cts:geospatial-co-occurrences|cts:frequency|cts:fitness|cts:field-words|cts:field-word-query-weight|cts:field-word-query-text|cts:field-word-query-options|cts:field-word-query-field-name|cts:field-word-query|cts:field-word-match|cts:entity-highlight|cts:element-words|cts:element-word-query-weight|cts:element-word-query-text|cts:element-word-query-options|cts:element-word-query-element-name|cts:element-word-query|cts:element-word-match|cts:element-values|cts:element-value-ranges|cts:element-value-query-weight|cts:element-value-query-text|cts:element-value-query-options|cts:element-value-query-element-name|cts:element-value-query|cts:element-value-match|cts:element-value-geospatial-co-occurrences|cts:element-value-co-occurrences|cts:element-range-query-weight|cts:element-range-query-value|cts:element-range-query-options|cts:element-range-query-operator|cts:element-range-query-element-name|cts:element-range-query|cts:element-query-query|cts:element-query-element-name|cts:element-query|cts:element-pair-geospatial-values|cts:element-pair-geospatial-value-match|cts:element-pair-geospatial-query-weight|cts:element-pair-geospatial-query-region|cts:element-pair-geospatial-query-options|cts:element-pair-geospatial-query-longitude-name|cts:element-pair-geospatial-query-latitude-name|cts:element-pair-geospatial-query-element-name|cts:element-pair-geospatial-query|cts:element-pair-geospatial-boxes|cts:element-geospatial-values|cts:element-geospatial-value-match|cts:element-geospatial-query-weight|cts:element-geospatial-query-region|cts:element-geospatial-query-options|cts:element-geospatial-query-element-name|cts:element-geospatial-query|cts:element-geospatial-boxes|cts:element-child-geospatial-values|cts:element-child-geospatial-value-match|cts:element-child-geospatial-query-weight|cts:element-child-geospatial-query-region|cts:element-child-geospatial-query-options|cts:element-child-geospatial-query-element-name|cts:element-child-geospatial-query-child-name|cts:element-child-geospatial-query|cts:element-child-geospatial-boxes|cts:element-attribute-words|cts:element-attribute-word-query-weight|cts:element-attribute-word-query-text|cts:element-attribute-word-query-options|cts:element-attribute-word-query-element-name|cts:element-attribute-word-query-attribute-name|cts:element-attribute-word-query|cts:element-attribute-word-match|cts:element-attribute-values|cts:element-attribute-value-ranges|cts:element-attribute-value-query-weight|cts:element-attribute-value-query-text|cts:element-attribute-value-query-options|cts:element-attribute-value-query-element-name|cts:element-attribute-value-query-attribute-name|cts:element-attribute-value-query|cts:element-attribute-value-match|cts:element-attribute-value-geospatial-co-occurrences|cts:element-attribute-value-co-occurrences|cts:element-attribute-range-query-weight|cts:element-attribute-range-query-value|cts:element-attribute-range-query-options|cts:element-attribute-range-query-operator|cts:element-attribute-range-query-element-name|cts:element-attribute-range-query-attribute-name|cts:element-attribute-range-query|cts:element-attribute-pair-geospatial-values|cts:element-attribute-pair-geospatial-value-match|cts:element-attribute-pair-geospatial-query-weight|cts:element-attribute-pair-geospatial-query-region|cts:element-attribute-pair-geospatial-query-options|cts:element-attribute-pair-geospatial-query-longitude-name|cts:element-attribute-pair-geospatial-query-latitude-name|cts:element-attribute-pair-geospatial-query-element-name|cts:element-attribute-pair-geospatial-query|cts:element-attribute-pair-geospatial-boxes|cts:document-query-uris|cts:document-query|cts:distance|cts:directory-query-uris|cts:directory-query-depth|cts:directory-query|cts:destination|cts:deregister|cts:contains|cts:confidence|cts:collections|cts:collection-query-uris|cts:collection-query|cts:collection-match|cts:classify|cts:circle-radius|cts:circle-center|cts:circle|cts:box-west|cts:box-south|cts:box-north|cts:box-east|cts:box|cts:bearing|cts:arc-intersection|cts:and-query-queries|cts:and-query-options|cts:and-query|cts:and-not-query-positive-query|cts:and-not-query-negative-query|cts:and-not-query|css:get|css:convert|cpf:success|cpf:failure|cpf:document-set-state|cpf:document-set-processing-status|cpf:document-set-last-updated|cpf:document-set-error|cpf:document-get-state|cpf:document-get-processing-status|cpf:document-get-last-updated|cpf:document-get-error|cpf:check-transition|alert:spawn-matching-actions|alert:rule-user-id-query|alert:rule-set-user-id|alert:rule-set-query|alert:rule-set-options|alert:rule-set-name|alert:rule-set-description|alert:rule-set-action|alert:rule-remove|alert:rule-name-query|alert:rule-insert|alert:rule-id-query|alert:rule-get-user-id|alert:rule-get-query|alert:rule-get-options|alert:rule-get-name|alert:rule-get-id|alert:rule-get-description|alert:rule-get-action|alert:rule-action-query|alert:remove-triggers|alert:make-rule|alert:make-log-action|alert:make-config|alert:make-action|alert:invoke-matching-actions|alert:get-my-rules|alert:get-all-rules|alert:get-actions|alert:find-matching-rules|alert:create-triggers|alert:config-set-uri|alert:config-set-trigger-ids|alert:config-set-options|alert:config-set-name|alert:config-set-description|alert:config-set-cpf-domain-names|alert:config-set-cpf-domain-ids|alert:config-insert|alert:config-get-uri|alert:config-get-trigger-ids|alert:config-get-options|alert:config-get-name|alert:config-get-id|alert:config-get-description|alert:config-get-cpf-domain-names|alert:config-get-cpf-domain-ids|alert:config-get|alert:config-delete|alert:action-set-options|alert:action-set-name|alert:action-set-module-root|alert:action-set-module-db|alert:action-set-module|alert:action-set-description|alert:action-remove|alert:action-insert|alert:action-get-options|alert:action-get-name|alert:action-get-module-root|alert:action-get-module-db|alert:action-get-module|alert:action-get-description|zero-or-one|years-from-duration|year-from-dateTime|year-from-date|upper-case|unordered|true|translate|trace|tokenize|timezone-from-time|timezone-from-dateTime|timezone-from-date|sum|subtract-dateTimes-yielding-yearMonthDuration|subtract-dateTimes-yielding-dayTimeDuration|substring-before|substring-after|substring|subsequence|string-to-codepoints|string-pad|string-length|string-join|string|static-base-uri|starts-with|seconds-from-time|seconds-from-duration|seconds-from-dateTime|round-half-to-even|round|root|reverse|resolve-uri|resolve-QName|replace|remove|QName|prefix-from-QName|position|one-or-more|number|not|normalize-unicode|normalize-space|node-name|node-kind|nilled|namespace-uri-from-QName|namespace-uri-for-prefix|namespace-uri|name|months-from-duration|month-from-dateTime|month-from-date|minutes-from-time|minutes-from-duration|minutes-from-dateTime|min|max|matches|lower-case|local-name-from-QName|local-name|last|lang|iri-to-uri|insert-before|index-of|in-scope-prefixes|implicit-timezone|idref|id|hours-from-time|hours-from-duration|hours-from-dateTime|floor|false|expanded-QName|exists|exactly-one|escape-uri|escape-html-uri|error|ends-with|encode-for-uri|empty|document-uri|doc-available|doc|distinct-values|distinct-nodes|default-collation|deep-equal|days-from-duration|day-from-dateTime|day-from-date|data|current-time|current-dateTime|current-date|count|contains|concat|compare|collection|codepoints-to-string|codepoint-equal|ceiling|boolean|base-uri|avg|adjust-time-to-timezone|adjust-dateTime-to-timezone|adjust-date-to-timezone|abs)\b/],
         // Matching normal words if none of the previous regular expressions matched
         [PR['PR_PLAIN'], /^[A-Za-z0-9_\-\:]+/],
         // Matching whitespaces
         [PR['PR_PLAIN'], /^[\t\n\r \xA0]+/]
         ]),
    ['xq', 'xquery']);
// Contributed by ribrdb @ code.google.com

/**
 * @fileoverview
 * Registers a language handler for YAML.
 *
 * @author ribrdb
 */


PR['registerLangHandler'](
  PR['createSimpleLexer'](
    [
      [PR['PR_PUNCTUATION'], /^[:|>?]+/, null, ':|>?'],
      [PR['PR_DECLARATION'],  /^%(?:YAML|TAG)[^#\r\n]+/, null, '%'],
      [PR['PR_TYPE'], /^[&]\S+/, null, '&'],
      [PR['PR_TYPE'], /^!\S*/, null, '!'],
      [PR['PR_STRING'], /^"(?:[^\\"]|\\.)*(?:"|$)/, null, '"'],
      [PR['PR_STRING'], /^'(?:[^']|'')*(?:'|$)/, null, "'"],
      [PR['PR_COMMENT'], /^#[^\r\n]*/, null, '#'],
      [PR['PR_PLAIN'], /^\s+/, null, ' \t\r\n']
    ],
    [
      [PR['PR_DECLARATION'], /^(?:---|\.\.\.)(?:[\r\n]|$)/],
      [PR['PR_PUNCTUATION'], /^-/],
      [PR['PR_KEYWORD'], /^\w+:[ \r\n]/],
      [PR['PR_PLAIN'], /^\w+/]
    ]), ['yaml', 'yml']);
(function() {


}).call(this);
