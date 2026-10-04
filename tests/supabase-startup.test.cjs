const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/core/supabase.js'), 'utf8');

test('the auth callback stays synchronous and defers the initial cloud refresh', () => {
  const setupStart = source.indexOf('async function setupAuthListener()');
  const setupEnd = source.indexOf('function handleAuthState(', setupStart);
  const setupSource = source.slice(setupStart, setupEnd);

  assert.match(setupSource, /onAuthStateChange\(\(event, session\) =>/);
  assert.doesNotMatch(setupSource, /onAuthStateChange\(async/);
  assert.match(setupSource, /queueSupabaseRefresh\(0, 2\)/);
});

test('startup sync requests are coalesced and lifecycle listeners cover iOS resume', () => {
  const pullStart = source.indexOf('pullFromSupabase()');
  const pullEnd = source.indexOf('pushToSupabase()', pullStart);
  const pullSource = source.slice(pullStart, pullEnd);

  assert.match(pullSource, /if\s*\(supabasePullPromise\)\s*return supabasePullPromise/);
  assert.match(source, /window\.addEventListener\('pageshow'/);
  assert.match(source, /window\.addEventListener\('online'/);
});
