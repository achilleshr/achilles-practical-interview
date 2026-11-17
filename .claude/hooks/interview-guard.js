#!/usr/bin/env node
// Interview-mode guard for Claude Code's PreToolUse hook.
//
// Exit code 2 blocks the tool call and shows stderr to Claude. Exit 0 allows it.
//
// Rules:
//  1. Claude may not write docs/design.md. The candidate writes it.
//  2. Claude may not change src/, prisma/ or scripts/ until docs/design.md
//     exists with real content.
//  3. A single edit or new file may be at most MAX_LINES lines.
//  4. Bash commands that look like they write into protected paths are
//     blocked, so rules 1-3 can't be bypassed with heredocs, sed -i, etc.
//     This one is a heuristic.

const fs = require('fs')
const path = require('path')

const MAX_LINES = 60
const MIN_DESIGN_CHARS = 300
const DESIGN_DOC = 'docs/design.md'
const PROTECTED = /(^|\/)(src|prisma|scripts)\//
const GUARD_FILES = /(^|\/)(CLAUDE\.md|\.claude\/)/

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()

function block(message) {
  process.stderr.write(`Interview mode: ${message}\n`)
  process.exit(2)
}

function relative(filePath) {
  if (!filePath) return ''
  const abs = path.resolve(projectDir, filePath)
  return path.relative(projectDir, abs).split(path.sep).join('/')
}

function designDocReady() {
  try {
    const text = fs.readFileSync(path.join(projectDir, DESIGN_DOC), 'utf8')
    return text.replace(/\s+/g, ' ').trim().length >= MIN_DESIGN_CHARS
  } catch {
    return false
  }
}

function countLines(text) {
  if (!text) return 0
  return text.replace(/\n$/, '').split('\n').length
}

function checkFileEdit(toolName, input) {
  const rel = relative(input.file_path || input.notebook_path)

  if (GUARD_FILES.test(rel)) {
    block(`${rel} configures interview mode and can't be changed by Claude.`)
  }
  if (rel === DESIGN_DOC) {
    block(
      `${DESIGN_DOC} must be written by the candidate, not by Claude. ` +
        'Help them think it through instead.',
    )
  }
  if (PROTECTED.test(rel) && !designDocReady()) {
    block(
      `code changes are locked until the candidate writes ${DESIGN_DOC} ` +
        '(their data model, how reminders are scheduled and sent, failure ' +
        'handling, and open questions). Help them with the design instead.',
    )
  }

  let lines = 0
  if (toolName === 'Write') lines = countLines(input.content)
  else if (toolName === 'Edit') lines = countLines(input.new_string)
  else if (toolName === 'MultiEdit')
    lines = (input.edits || []).reduce(
      (n, e) => n + countLines(e.new_string),
      0,
    )
  else if (toolName === 'NotebookEdit') lines = countLines(input.new_source)

  if (lines > MAX_LINES) {
    block(
      `this change is ${lines} lines; the limit is ${MAX_LINES} per edit. ` +
        'Break it into smaller steps and let the candidate review each one.',
    )
  }
}

function checkBash(command) {
  if (!command) return
  const target = String.raw`['"]?[\w./~-]*(src|prisma|scripts|docs/design\.md|CLAUDE\.md|\.claude)\b`
  const writesThere = [
    new RegExp(String.raw`(^|[^0-9&])>>?\s*` + target), // > file, >> file
    new RegExp(String.raw`\btee\s+(-a\s+)?` + target),
    new RegExp(String.raw`\b(sed|perl)\s+[^|;&]*-i\b[^|;&]*` + target),
    new RegExp(String.raw`\b(cp|mv|rm|ln|install|touch|truncate)\b[^|;&]*` + target),
  ]
  const scripted =
    /\b(python3?|node|perl|ruby|deno|bun)\b/.test(command) &&
    /(src|prisma|scripts)\/|design\.md|CLAUDE\.md|\.claude/.test(command) &&
    /(write|open\(|\.replace\(|writeFile|appendFile|unlink|rename)/i.test(
      command,
    )
  // Applying migrations or generating the client only touches generated files.
  const allowed = /^\s*(pnpm|npx)\s+(prisma|prisma:generate|prisma:migrate)\b/

  if (allowed.test(command)) return
  if (writesThere.some((re) => re.test(command)) || scripted) {
    block(
      'this Bash command looks like it writes to protected files. Use the ' +
        'Edit/Write tools so interview-mode limits apply, and keep changes small.',
    )
  }
}

let raw = ''
process.stdin.on('data', (chunk) => (raw += chunk))
process.stdin.on('end', () => {
  let event
  try {
    event = JSON.parse(raw)
  } catch {
    process.exit(0)
  }
  const { tool_name: toolName, tool_input: input = {} } = event
  if (toolName === 'Bash') checkBash(input.command)
  else checkFileEdit(toolName, input)
  process.exit(0)
})
