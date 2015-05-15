# reactive-vdom-to-html

A fork of [vdom-to-html](https://github.com/nthtran/vdom-to-html).

Turn [virtual-dom](https://github.com/Matt-Esch/virtual-dom/) nodes into
Rx observable of HTML

## Installation

```sh
npm install --save reactive-vdom-to-html
```

## Usage

```js
var VNode = require('vtree/vnode');
var toHTML = require('vdom-to-html');

toHTML(new VNode('input', { className: 'name', type: 'text' }))
  .subscribe(function (html) {
    console.log(html);
    // => '<input class="name" type="text">'
  });
```
