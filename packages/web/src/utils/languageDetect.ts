/**
 * Maps file extensions to refractor/Prism language identifiers.
 * refractor's "common" bundle pre-registers ~36 popular languages.
 * This map covers those plus extras we can lazy-register if needed.
 */
const extMap: Record<string, string> = {
  // JavaScript / TypeScript
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',

  // Web
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  svg: 'markup',
  css: 'css',
  scss: 'scss',
  less: 'less',

  // Data formats
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',

  // Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',

  // Systems
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  rs: 'rust',
  go: 'go',
  zig: 'zig',

  // JVM
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  groovy: 'groovy',

  // Scripting
  py: 'python',
  rb: 'ruby',
  php: 'php',
  lua: 'lua',
  pl: 'perl',
  pm: 'perl',
  r: 'r',

  // .NET
  cs: 'csharp',
  fs: 'fsharp',

  // Mobile
  swift: 'swift',
  m: 'objectivec',
  mm: 'objectivec',
  dart: 'dart',

  // Config / DevOps
  dockerfile: 'docker',
  tf: 'hcl',
  hcl: 'hcl',
  ini: 'ini',
  conf: 'ini',

  // Markup / Docs
  md: 'markdown',
  mdx: 'markdown',
  tex: 'latex',
  rst: 'rest',

  // Other
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  proto: 'protobuf',
  makefile: 'makefile',
  cmake: 'cmake',
  diff: 'diff',
};

/**
 * Detect the Prism/refractor language for a file path.
 * Returns undefined if the language isn't recognized.
 */
export function detectLanguage(filePath: string): string | undefined {
  // Handle dotfiles and extensionless names like "Makefile", "Dockerfile"
  const basename = filePath.split('/').pop() ?? '';
  const lowerBasename = basename.toLowerCase();

  // Special filenames
  if (lowerBasename === 'makefile' || lowerBasename === 'gnumakefile') return 'makefile';
  if (lowerBasename === 'dockerfile' || lowerBasename.startsWith('dockerfile.')) return 'docker';
  if (lowerBasename === 'cmakelists.txt') return 'cmake';

  const ext = basename.includes('.') ? basename.split('.').pop()?.toLowerCase() : undefined;
  if (!ext) return undefined;

  return extMap[ext];
}
