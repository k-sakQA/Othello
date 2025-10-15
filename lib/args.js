function parseArgs(argv) {
  const res = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') res.url = argv[++i];
    else if (a === '--max-iterations') res.maxIterations = parseInt(argv[++i], 10);
    else if (a === '--browser') res.browser = argv[++i];
    else if (a === '--output') res.output = argv[++i];
    else if (a === '--config') res.config = argv[++i];
    else if (a === '--auto-approve') res.autoApprove = true;
    else if (a === '-p' || a === '--print') res.print = true;
    else if (a === '-h' || a === '--help') res.help = true;
  }
  return res;
}

module.exports = { parseArgs };
