#!/usr/bin/env node

import fs from 'node:fs';
import crypto from 'node:crypto';

function toBase64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const map = {};

  for (let index = 0; index < args.length; index += 1) {
    const currentArg = args[index];
    if (!currentArg.startsWith('--')) continue;

    const key = currentArg.slice(2);
    const nextArg = args[index + 1];
    if (!nextArg || nextArg.startsWith('--')) {
      map[key] = true;
    } else {
      map[key] = nextArg;
      index += 1;
    }
  }

  return map;
}

function printUsageAndExit() {
  console.error(
    [
      'Usage:',
      '  node scripts/generate-apple-secret.mjs \\',
      '    --team-id <APPLE_TEAM_ID> \\',
      '    --key-id <APPLE_KEY_ID> \\',
      '    --client-id <APPLE_CLIENT_ID> \\',
      '    --private-key <PATH_TO_P8> \\',
      '    [--expires-days 180]',
      '',
      'Example:',
      '  node scripts/generate-apple-secret.mjs \\',
      '    --team-id ABC123XYZ9 \\',
      '    --key-id SA663LRCR9 \\',
      '    --client-id com.glamora.app.auth \\',
      '    --private-key /Users/you/Downloads/AuthKey_SA663LRCR9.p8',
    ].join('\n')
  );
  process.exit(1);
}

function getRequiredArg(args, key) {
  const value = args[key];
  if (!value || typeof value !== 'string') {
    console.error(`Missing required argument: --${key}`);
    printUsageAndExit();
  }
  return value;
}

const args = parseArgs();

if (args.help) {
  printUsageAndExit();
}

const teamId = getRequiredArg(args, 'team-id');
const keyId = getRequiredArg(args, 'key-id');
const clientId = getRequiredArg(args, 'client-id');
const privateKeyPath = getRequiredArg(args, 'private-key');

if (!fs.existsSync(privateKeyPath)) {
  console.error(`Private key file not found: ${privateKeyPath}`);
  process.exit(1);
}

const expiresDays = Number(args['expires-days'] || 180);
if (!Number.isFinite(expiresDays) || expiresDays <= 0) {
  console.error('--expires-days must be a positive number');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const now = Math.floor(Date.now() / 1000);
const exp = now + Math.floor(expiresDays * 24 * 60 * 60);

const header = {
  alg: 'ES256',
  kid: keyId,
  typ: 'JWT',
};

const payload = {
  iss: teamId,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: clientId,
};

const encodedHeader = toBase64Url(JSON.stringify(header));
const encodedPayload = toBase64Url(JSON.stringify(payload));
const signingInput = `${encodedHeader}.${encodedPayload}`;

const sign = crypto.createSign('SHA256');
sign.update(signingInput);
sign.end();

let signature;
try {
  signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
} catch (error) {
  console.error('Failed to sign JWT. Check the private key format and key details.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const token = `${signingInput}.${toBase64Url(signature)}`;

console.log(token);
console.error('\nToken generated. Paste this JWT into Supabase > Apple provider > Secret Key (for OAuth).');
