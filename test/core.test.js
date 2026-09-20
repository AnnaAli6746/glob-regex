import { test } from 'node:test';
import assert from 'node:assert/strict';
import { globToRegExp } from '../src/core.js';

const matches = (pattern, value, options) =>
  assert.match(value, globToRegExp(pattern, options));

const doesNotMatch = (pattern, value, options) =>
  assert.doesNotMatch(value, globToRegExp(pattern, options));

test('exact literal match', () => {
  matches('abc', 'abc');
  doesNotMatch('abc', 'abd');
  doesNotMatch('abc', 'abcd');
});

test('star matches within a path segment', () => {
  matches('*.js', 'file.js');
  matches('*.js', '.js');
  doesNotMatch('*.js', 'dir/file.js');
});

test('double star matches across path separators', () => {
  matches('**/*.js', 'file.js', { globstar: true });
  matches('**/*.js', 'dir/file.js', { globstar: true });
  matches('**/*.js', 'a/b/c/file.js', { globstar: true });
  doesNotMatch('**/*.js', 'file.txt', { globstar: true });
});

test('globstar is disabled by default', () => {
  matches('**/*.js', 'dir/file.js');
});

test('question mark matches exactly one non-slash character', () => {
  matches('a?c', 'abc');
  doesNotMatch('a?c', 'a/c');
  doesNotMatch('a?c', 'ac');
  doesNotMatch('a?c', 'abbc');
});

test('character class with ranges and negation', () => {
  matches('[a-c]at', 'bat');
  doesNotMatch('[a-c]at', 'dat');
  matches('[!a-c]at', 'dat');
  doesNotMatch('[!a-c]at', 'bat');
  matches('[^a-c]at', 'dat');
});

test('unterminated character class is literal', () => {
  matches('[abc', '[abc');
  doesNotMatch('[abc', 'a');
});

test('brace expansion alternation', () => {
  matches('{foo,bar}.js', 'foo.js', { extended: true });
  matches('{foo,bar}.js', 'bar.js', { extended: true });
  doesNotMatch('{foo,bar}.js', 'baz.js', { extended: true });
});

test('brace expansion is disabled by default', () => {
  doesNotMatch('{foo,bar}.js', 'foo.js');
});

test('backslash escapes glob metacharacters', () => {
  matches('\\*.js', '*.js');
  doesNotMatch('\\*.js', 'a.js');
});

test('regex metacharacters are escaped in literals', () => {
  matches('a+b', 'a+b');
  doesNotMatch('a+b', 'aab');
  matches('a.b', 'a.b');
  doesNotMatch('a.b', 'axb');
});

test('empty class never matches', () => {
  doesNotMatch('[]', '');
  doesNotMatch('[]', 'a');
  doesNotMatch('[!]', '');
});

test('pattern is anchored', () => {
  doesNotMatch('foo', 'foobar');
  doesNotMatch('foo', 'barfoo');
});

test('non-string pattern throws TypeError', () => {
  assert.throws(() => globToRegExp(42), TypeError);
});
