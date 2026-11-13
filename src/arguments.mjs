export function parseArgs(args) {
  const options = { directory: '.', json: false, help: false }
  let directorySeen = false
  const seen = new Set()
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('-')) {
      if (seen.has(arg)) throw new Error(`Repeated option ${arg}`)
      seen.add(arg)
      if (arg === '--help') options.help = true
      else if (arg === '--json') options.json = true
      else if (arg === '--workspace') options.workspace = true
      else if (arg === '--include-root') options.includeRoot = true
      else if (arg === '--sarif') options.sarif = true
      else if (arg === '--markdown') options.markdown = true
      else if (arg === '--fail-on-warning') options.failOnWarning = true
      else if (arg === '--publish-check') options.publishCheck = true
      else if (['--packlist', '--dsh-version', '--node-version', '--platform', '--arch', '--output', '--max-unpacked-size'].includes(arg)) {
        if (!args[i + 1] || (args[i + 1].startsWith('-') && !(arg === '--packlist' && args[i + 1] === '-'))) throw new Error(`${arg} requires a value`)
        const key = { '--packlist': 'packlist', '--dsh-version': 'dshVersion', '--node-version': 'nodeVersion', '--platform': 'platform', '--arch': 'arch', '--output': 'output', '--max-unpacked-size': 'maxUnpackedSize' }[arg]
        options[key] = args[++i]
      } else throw new Error(`Unknown option ${arg}`)
    } else {
      if (directorySeen) throw new Error('Supply one package directory')
      options.directory = arg
      directorySeen = true
    }
  }
  if ([options.json, options.sarif, options.markdown].filter(Boolean).length > 1) throw new Error('Choose one of --json, --sarif or --markdown')
  if (options.includeRoot && !options.workspace) throw new Error('--include-root requires --workspace')
  if (options.maxUnpackedSize !== undefined) {
    if (!/^(0|[1-9]\d*)$/u.test(options.maxUnpackedSize) || !Number.isSafeInteger(Number(options.maxUnpackedSize))) throw new Error('--max-unpacked-size requires a non-negative integer byte count')
    options.maxUnpackedSize = Number(options.maxUnpackedSize)
    if (!options.packlist) throw new Error('--max-unpacked-size requires --packlist')
  }
  return options
}
