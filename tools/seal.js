#!/usr/bin/env node
/*
  Seal or open the private page behind the "okay" stone.

  The site is a public repo, so the private page is only ever committed
  encrypted (garden.json). The plaintext lives in private/ (git-ignored).

    OKAY_PASS="the passphrase" node tools/seal.js seal private/trip.html
    OKAY_PASS="the passphrase" node tools/seal.js open > private/trip.html

  Format: PBKDF2-SHA256 (600,000 rounds) derives a 256-bit key from the
  normalized passphrase; AES-256-GCM encrypts the page. The browser does the
  same with WebCrypto. The salt is kept across re-seals so a device that chose
  "remember" keeps working after content updates. Changing the passphrase
  means a new salt: pass --new-salt.
*/
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OUT = path.join(__dirname, "..", "garden.json");
const ITER = 600000;

function normalize(p) {
  return p.trim().toLowerCase().replace(/[\s_-]+/g, "-");
}
function key(pass, salt) {
  return crypto.pbkdf2Sync(Buffer.from(normalize(pass), "utf8"), salt, ITER, 32, "sha256");
}

const [cmd, file] = process.argv.slice(2);
const pass = process.env.OKAY_PASS;
if (!pass || !["seal", "open"].includes(cmd)) {
  console.error('Usage: OKAY_PASS="..." node tools/seal.js seal <file> [--new-salt] | open');
  process.exit(1);
}

if (cmd === "seal") {
  const html = fs.readFileSync(file);
  let salt;
  if (!process.argv.includes("--new-salt") && fs.existsSync(OUT)) {
    salt = Buffer.from(JSON.parse(fs.readFileSync(OUT, "utf8")).salt, "base64");
  } else {
    salt = crypto.randomBytes(16);
  }
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(pass, salt), iv);
  const ct = Buffer.concat([c.update(html), c.final(), c.getAuthTag()]);
  fs.writeFileSync(OUT, JSON.stringify({
    v: 1, kdf: "PBKDF2-SHA256", iter: ITER,
    salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64")
  }));
  console.error("Sealed " + html.length + " bytes into garden.json");
} else {
  const box = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const ct = Buffer.from(box.ct, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", key(pass, Buffer.from(box.salt, "base64")), Buffer.from(box.iv, "base64"));
  d.setAuthTag(ct.subarray(ct.length - 16));
  process.stdout.write(Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]));
}
