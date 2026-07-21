const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/components/LandingPage.jsx');
let content = fs.readFileSync(file, 'utf8');

// Replacements
content = content.replace(/text-neutral-950/g, 'text-text');
content = content.replace(/text-neutral-900/g, 'text-text');
content = content.replace(/text-neutral-800/g, 'text-text');
content = content.replace(/text-neutral-700/g, 'text-text');

content = content.replace(/text-neutral-600/g, 'text-muted');
content = content.replace(/text-neutral-500/g, 'text-muted');
content = content.replace(/text-neutral-450/g, 'text-muted');
content = content.replace(/text-neutral-400/g, 'text-muted');
content = content.replace(/text-neutral-300/g, 'text-muted');
content = content.replace(/text-neutral-200/g, 'text-muted');

content = content.replace(/bg-neutral-50/g, 'bg-card-sunken');
content = content.replace(/bg-neutral-100/g, 'bg-card-sunken');
content = content.replace(/bg-neutral-150/g, 'bg-border/50');
content = content.replace(/bg-neutral-200/g, 'bg-border/50');
content = content.replace(/bg-neutral-250/g, 'bg-border');

content = content.replace(/border-neutral-50/g, 'border-border');
content = content.replace(/border-neutral-100/g, 'border-border');
content = content.replace(/border-neutral-150/g, 'border-border');
content = content.replace(/border-neutral-200/g, 'border-border');
content = content.replace(/border-neutral-250/g, 'border-border');
content = content.replace(/border-neutral-300/g, 'border-border');
content = content.replace(/border-neutral-350/g, 'border-border');

content = content.replace(/bg-neutral-950/g, 'bg-neutral-900 dark:bg-card-elevated');
content = content.replace(/bg-neutral-900/g, 'bg-neutral-800 dark:bg-card-elevated');
content = content.replace(/bg-neutral-850/g, 'bg-neutral-800 dark:bg-card-sunken');
content = content.replace(/bg-neutral-800/g, 'bg-neutral-700 dark:bg-card-sunken');

content = content.replace(/border-neutral-900/g, 'border-neutral-800 dark:border-border');
content = content.replace(/border-neutral-850/g, 'border-neutral-700 dark:border-border');

fs.writeFileSync(file, content);
console.log('Done!');
