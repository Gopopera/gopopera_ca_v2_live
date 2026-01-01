#!/usr/bin/env node
/**
 * Encode Firebase private key for env var storage
 * 
 * Usage:
 *   pbpaste | npm run encode:firebase:key
 *   cat private-key.pem | npm run encode:firebase:key
 * 
 * Output: single line with literal \n (ready for Vercel env var)
 */

let input = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  // Replace actual newlines with literal \n
  const encoded = input.trim().replace(/\n/g, '\\n');
  process.stdout.write(encoded);
});

