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
      else if (arg === '--packlist') {
        if (!args[i + 1] || args[i + 1].startsWith('-')) throw new Error('--packlist requires a JSON report path')
        options.packlist = args[++i]
      } else throw new Error(`Unknown option ${arg}`)
    } else {
      if (directorySeen) throw new Error('Supply one package directory')
      options.directory = arg
      directorySeen = true
    }
  }
  return options
}
