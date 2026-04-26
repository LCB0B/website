// Renders posts/*.md to posts/*.html using a shared template.
// Run: node scripts/build_posts.js

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const TEMPLATE_PATH = path.join(__dirname, 'post_template.html');

const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

const mdFiles = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

for (const file of mdFiles) {
    const slug = file.replace(/\.md$/, '');
    const md = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const titleMatch = md.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : slug;
    const html = marked.parse(md);
    const out = template
        .replace(/\{\{TITLE\}\}/g, title)
        .replace(/\{\{CONTENT\}\}/g, html);
    fs.writeFileSync(path.join(POSTS_DIR, slug + '.html'), out);
    console.log('built', slug + '.html');
}
