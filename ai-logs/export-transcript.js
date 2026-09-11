#!/usr/bin/env node
/**
 * Converts a Claude Code .jsonl transcript into the readable markdown
 * export in this folder, redacting secrets on the way out.
 *
 * Claude Code's own /export writes the raw transcript of an *interactive*
 * terminal session; this does the same job from the on-disk transcript
 * (~/.claude/projects/<project>/<session>.jsonl), which is what the
 * VS Code extension keeps, and adds the redaction pass the brief asks for.
 *
 * Usage:
 *   REDACT_EXTRA='secret1,secret2' \
 *     node ai-logs/export-transcript.js <input.jsonl> <output.md>
 *
 * The output file is a single deliverable holding both sessions: a
 * hand-written part 1 (the mobile session, which has no machine-readable
 * transcript) followed by this generated part 2. To keep both in one file
 * and still allow regeneration, everything ABOVE the marker below is
 * preserved as-is when the output file already exists; only what follows
 * is rewritten.
 *
 * Secrets are never hardcoded here: pass them through REDACT_EXTRA so this
 * script can live in the repository without leaking what it redacts.
 */
const fs = require('fs');

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: node export-transcript.js <input.jsonl> <output.md>');
  process.exit(1);
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const REDACTIONS = [
  // Shapes that are always secret, whatever the session.
  [/gh[pousr]_[A-Za-z0-9]{20,}/g, '[TOKEN GITHUB CAVIARDE]'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, '[TOKEN GITHUB CAVIARDE]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[JWT CAVIARDE]'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[CLE PRIVEE CAVIARDEE]'],
  // Session-specific literals (server password, generated secrets...).
  ...(process.env.REDACT_EXTRA ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => [new RegExp(escapeRegExp(s), 'g'), '[SECRET CAVIARDE]']),
];

// Tool output carries ANSI colour codes (docker logs, jest, npm) and the
// odd stray control byte, which make the export unreadable and count as
// "binary" for grep. Strip them; keep newlines and tabs.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`, 'g');
const CONTROL = new RegExp('[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]', 'g');
const stripControl = (s) => s.replace(ANSI, '').replace(CONTROL, '');

const redact = (s) => REDACTIONS.reduce((acc, [re, by]) => acc.replace(re, by), stripControl(s));
const truncate = (s, max) =>
  s.length > max ? `${s.slice(0, max)}\n[... ${s.length - max} caracteres tronques ...]` : s;

const MARKER = '<!-- TRANSCRIPT GENERE AUTOMATIQUEMENT - NE RIEN ECRIRE SOUS CETTE LIGNE -->';

const lines = fs.readFileSync(inPath, 'utf8').split('\n').filter(Boolean);
const out = [];

// Preserve the hand-written part of the deliverable (everything down to
// the marker) so a regeneration never loses it.
if (fs.existsSync(outPath)) {
  const existing = fs.readFileSync(outPath, 'utf8');
  const at = existing.indexOf(MARKER);
  if (at === -1) {
    console.error(`refus: ${outPath} existe mais ne contient pas le marqueur - regeneration annulee`);
    process.exit(1);
  }
  out.push(existing.slice(0, at + MARKER.length));
} else {
  out.push('# Export de session - Claude Code (VS Code), modele Opus 5');
  out.push('');
  out.push("Session dediee a l'exercice DIV \"Portail de depot de pieces\".");
  out.push(MARKER);
}
out.push('');

for (const line of lines) {
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    continue;
  }

  const msg = entry.message;
  if (!msg || !msg.role) continue;

  const content = Array.isArray(msg.content)
    ? msg.content
    : [{ type: 'text', text: String(msg.content ?? '') }];

  for (const block of content) {
    if (block.type === 'text' && block.text && block.text.trim()) {
      out.push(msg.role === 'user' ? '## Daniel' : '## Claude');
      out.push('');
      out.push(redact(truncate(block.text.trim(), 6000)));
      out.push('');
    } else if (block.type === 'thinking' && block.thinking) {
      out.push('> _(raisonnement interne)_');
      out.push('');
      out.push(
        redact(truncate(block.thinking.trim(), 2000))
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n'),
      );
      out.push('');
    } else if (block.type === 'tool_use') {
      out.push(`**Outil \`${block.name}\`**`);
      out.push('');
      out.push('```json');
      out.push(redact(truncate(JSON.stringify(block.input ?? {}, null, 2), 2500)));
      out.push('```');
      out.push('');
    } else if (block.type === 'tool_result') {
      const raw = Array.isArray(block.content)
        ? block.content.map((c) => (c.type === 'text' ? c.text : `[${c.type}]`)).join('\n')
        : String(block.content ?? '');
      if (!raw.trim()) continue;
      out.push('**Resultat**');
      out.push('');
      out.push('```');
      out.push(redact(truncate(raw.trim(), 2500)));
      out.push('```');
      out.push('');
    }
  }
}

fs.writeFileSync(outPath, out.join('\n'), 'utf8');
console.log(`wrote ${outPath} (${out.join('\n').length} chars, ${lines.length} transcript entries)`);
