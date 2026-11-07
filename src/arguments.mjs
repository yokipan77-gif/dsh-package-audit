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
      else if (arg === '--sarif') options.sarif = true
      else if (arg === '--fail-on-warning') options.failOnWarning = true
      else if (['--packlist', '--dsh-version', '--platform'].includes(arg)) {
        if (!args[i + 1] || args[i + 1].startsWith('-')) throw new Error(`${arg} requires a value`)
        const key = { '--packlist': 'packlist', '--dsh-version': 'dshVersion', '--platform': 'platform' }[arg]
        options[key] = args[++i]
      } else throw new Error(`Unknown option ${arg}`)
    } else {
      if (directorySeen) throw new Error('Supply one package directory')
      options.directory = arg
      directorySeen = true
    }
  }
  if (options.json && options.sarif) throw new Error('Choose either --json or --sarif')
  return options
}
