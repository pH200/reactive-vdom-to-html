var escape = require('escape-html');
var extend = require('xtend');
var isVNode = require('virtual-dom/vnode/is-vnode');
var isVText = require('virtual-dom/vnode/is-vtext');
var isThunk = require('virtual-dom/vnode/is-thunk');
var softHook = require('virtual-dom/virtual-hyperscript/hooks/soft-set-hook');
var attrHook = require('virtual-dom/virtual-hyperscript/hooks/attribute-hook');
var paramCase = require('param-case');
var createAttribute = require('./create-attribute');
var voidElements = require('./void-elements');
var Rx = require('rx');

module.exports = toHTML;

function toHTML(node, parent) {
  if (!node) return Rx.Observable.just('');

  if (isThunk(node)) {
    node = node.render();
  }

  if (isReactiveVDOMWidget(node)) {
    return node.getVNodeObservable().flatMap(function (innerNode) {
      return toHTML(innerNode);
    });
  }

  if (isVNode(node)) {
    return tagContent(node).map(function (content) {
      return openTag(node) + content + closeTag(node);
    });
  } else if (isVText(node)) {
    if (parent && parent.tagName.toLowerCase() === 'script') {
      return Rx.Observable.just(String(node.text));
    }
    return Rx.Observable.just(escape(String(node.text)));
  }

  return Rx.Observable.just('');
}

function isReactiveVDOMWidget(node) {
  return node.isReactiveVDOMWidget && node.getVNodeObservable;
}

function openTag(node) {
  var props = node.properties;
  var ret = '<' + node.tagName.toLowerCase();

  for (var name in props) {
    var value = props[name];
    if (value == null) continue;

    if (name == 'attributes') {
      value = extend({}, value);
      for (var attrProp in value) {
        ret += ' ' + createAttribute(attrProp, value[attrProp], true);
      }
      continue;
    }

    if (name == 'style') {
      var css = '';
      value = extend({}, value);
      for (var styleProp in value) {
        css += paramCase(styleProp) + ': ' + value[styleProp] + '; ';
      }
      value = css.trim();
    }

    if (value instanceof softHook || value instanceof attrHook) {
      ret += ' ' + createAttribute(name, value.value, true);
      continue;
    }

    var attr = createAttribute(name, value);
    if (attr) ret += ' ' + attr;
  }

  return ret + '>';
}

function tagContent(node) {
  var innerHTML = node.properties.innerHTML;
  if (innerHTML != null) {
    return Rx.Observable.just(innerHTML);
  } else {
    var ret = [];
    if (node.children && node.children.length) {
      for (var i = 0, l = node.children.length; i<l; i++) {
        var child = node.children[i];
        ret.push(toHTML(child, node));
      }
    }
    if (ret.length === 0) {
      return Rx.Observable.just('');
    }
    return Rx.Observable.concat(ret).reduce(function (acc, x) {
      return acc + x;
    });
  }
}

function closeTag(node) {
  var tag = node.tagName.toLowerCase();
  return voidElements[tag] ? '' : '</' + tag + '>';
}
