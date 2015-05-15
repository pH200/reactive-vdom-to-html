
var VNode = require('virtual-dom/vnode/vnode');
var VText = require('virtual-dom/vnode/vtext');
var h = require('virtual-dom/h');
var svg = require('virtual-dom/virtual-hyperscript/svg');
var partial = require('vdom-thunk');
var assert = require('assert');
var toHTML = require('..');
var Rx = require('rx');

function assertEqual(observable, target) {
  observable.subscribe(function (value) {
    assert.equal(value, target);
  });
}

function createReactiveWidget(getVNodeObservable) {
  return Object.create({
    type: 'Widget',
    isReactiveVDOMWidget: true,
    getVNodeObservable: getVNodeObservable
  });
}

describe('reactive toHTML', function () {
  it('should render reactive widget', function () {
    var widget = createReactiveWidget(function () {
      return Rx.Observable.just(new VNode('span'));
    });
    assertEqual(toHTML(widget), '<span></span>');
  });

  it('should render nested reactive widget', function () {
    var inner = createReactiveWidget(function () {
      return Rx.Observable.just(new VNode('span'));
    });
    var outer = createReactiveWidget(function () {
      return Rx.Observable.just(h('div.foo', [inner]));
    });
    assertEqual(toHTML(outer), '<div class="foo"><span></span></div>');
  });

  it('should render reactive widget list', function (done) {
    var inner = createReactiveWidget(function () {
      return Rx.Observable.just(new VText('bar'));
    });
    var outer = createReactiveWidget(function () {
      return Rx.Observable.just(h('div.foo', [inner, inner]));
    });
    toHTML(h('section', [
      outer,
      outer
    ])).subscribe(function (html) {
      assert.equal(html, '<section>' +
        '<div class="foo">barbar</div><div class="foo">barbar</div>' +
        '</section>');
      done();
    });
  });

  it('should render reactive widget which has delayed observable', function (done) {
    var widget = createReactiveWidget(function () {
      return Rx.Observable.timer(50).map(function () {
        return new VNode('span');
      });
    });
    toHTML(widget).subscribe(function (html) {
      assert.equal(html, '<span></span>');
      done();
    });
  });
});

describe('toHTML()', function () {
  it('should not render invalid virtual nodes', function () {
    assertEqual(toHTML(null), '');
    assertEqual(toHTML('hi'), '');
  });

  it('should render simple HTML', function () {
    var node = new VNode('span');
    assertEqual(toHTML(node), '<span></span>');
  });

  it('should render inner text', function () {
    var node = new VNode('span', null, [new VText('hello')]);
    assertEqual(toHTML(node), '<span>hello</span>');
  });

  it('should convert properties to attributes', function () {
    var node = new VNode('form', {
      className: 'login',
      acceptCharset: 'ISO-8859-1',
      accessKey: 'h' // prop to lower case
    });
    assertEqual(toHTML(node), '<form class="login" accept-charset="ISO-8859-1" accesskey="h"></form>');
  });

  it('should not render end tags for void elements', function () {
    var node = new VNode('input');
    assertEqual(toHTML(node), '<input>');
    node = new VNode('br');
    assertEqual(toHTML(node), '<br>');
  });

  it('should not render non-standard properties', function () {
    var node = new VNode('web-component', {
      'ev-click': function () {},
      'random-prop': 'random!'
    });
    assertEqual(toHTML(node), '<web-component></web-component>');
  });

  it('should not render null properties', function () {
    var node = new VNode('web-component', {
      'className': null,
      'id': null
    });
    assertEqual(toHTML(node), '<web-component></web-component>');
  });

  it('should render CSS for style property', function () {
    var node = new VNode('div', {
      style: {
        background: 'black',
        color: 'red'
      }
    });
    assertEqual(toHTML(node), '<div style="background: black; color: red;"></div>');
  });

  it('should convert style property to param-case', function () {
    var node = new VNode('div', {
      style: {
        background: 'black',
        color: 'red',
        zIndex: '1'
      }
    });
    assertEqual(toHTML(node), '<div style="background: black; color: red; z-index: 1;"></div>');
  });

  it('should render boolean properties', function () {
    var node = new VNode('input', {
      autofocus: true,
      disabled: false
    });
    assertEqual(toHTML(node), '<input autofocus>');
  });

  it('should render overloaded boolean properties', function () {
    var node = new VNode('a', {
      href: '/images/xxx.jpg',
      download: true
    });
    assertEqual(toHTML(node), '<a href="/images/xxx.jpg" download></a>');
    node = new VNode('a', {
      href: '/images/xxx.jpg',
      download: 'sfw'
    });
    assertEqual(toHTML(node), '<a href="/images/xxx.jpg" download="sfw"></a>');
  });

  it('should render any attributes', function () {
    var node = new VNode('circle', {
      attributes: {
        cx: "60",
        cy: "60",
        r: "50"
      }
    });
    assertEqual(toHTML(node), '<circle cx="60" cy="60" r="50"></circle>');
  });

  it('should not render null attributes', function () {
    var node = new VNode('circle', {
      attributes: {
        cx: "60",
        cy: "60",
        r: null
      }
    });
    assertEqual(toHTML(node), '<circle cx="60" cy="60" ></circle>');
  });

  it('should render nested children', function () {
    var node = new VNode('div', null, [
      new VNode('div', { id: 'a-div' }, [
        new VNode('div', null, [new VText('HI!')])
      ]),
      new VNode('div', { className: 'just-another-div' })
    ]);
    assertEqual(toHTML(node), '<div><div id="a-div"><div>HI!</div></div><div class="just-another-div"></div></div>');
  });

  it('should encode attribute names/values and text contents', function () {
    var node = new VNode('div', {
      attributes: {
        'data-"hi"': '"hello"'
      }
    }, [new VText('<span>sup</span>')]);
    assertEqual(toHTML(node), '<div data-&quot;hi&quot;="&quot;hello&quot;">&lt;span&gt;sup&lt;/span&gt;</div>');
  });

  it('should not encode script tag contents', function () {
    var node = new VNode('div', null, [
      new VNode('script', null, [new VText('console.log("zzz");')])
    ]);
    assertEqual(toHTML(node), '<div><script>console.log("zzz");</script></div>');
  });

  it('should render `innerHTML`', function () {
    var node = new VNode('div', {
      innerHTML: '<span>sup</span>'
    });
    assertEqual(toHTML(node), '<div><span>sup</span></div>');
  });

  it('should render thunks', function () {
    var fn = function fn(text) {
      return new VNode('span', null, [new VText(text)]);
    };
    var node = partial(fn, 'hello');
    assertEqual(toHTML(node), '<span>hello</span>');
  });

  it('should render tag in lowercase', function () {
    var node = new VNode('SPAN', null, [new VText('hello')]);
    assertEqual(toHTML(node), '<span>hello</span>');
  });

  it('should render hyperscript', function () {
    var node = h('span', null, 'test');
    assertEqual(toHTML(node), '<span>test</span>');
  });

  it('should not encode script tag contents, when using hyperscript', function () {
    var node = h('div', null, [
      h('script', null, 'console.log("zzz");')
    ]);
    assertEqual(toHTML(node), '<div><script>console.log("zzz");</script></div>');
  });

  it('should not render end tags for void elements, when using hyperscript', function () {
    var node = h('input');
    assertEqual(toHTML(node), '<input>');
    node = h('br');
    assertEqual(toHTML(node), '<br>');
  });

  it('should preserve UTF-8 entities and escape special html characters', function () {
    var node = h('span', null, '测试&\"\'<>');
    assertEqual(toHTML(node), '<span>测试&amp;&quot;&#39;&lt;&gt;</span>');
  });

  it('should render svg with attributes in default namespace', function () {
    var node = svg('svg', {
      'viewBox': '0 0 10 10'
    });
    assertEqual(toHTML(node), '<svg viewBox="0 0 10 10"></svg>');
  });

  it('should render svg with attributes in non-default namespace', function () {
    var node = svg('use', {
      'xlink:href': '/abc.jpg'
    });
    assertEqual(toHTML(node), '<use xlink:href="/abc.jpg"></use>');
  });

  it('should render input value', function () {
    var node = h('input', { type: 'submit', value: 'add' });
    assertEqual(toHTML(node), '<input type="submit" value="add">');
  });
});
