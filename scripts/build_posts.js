// Renders posts/*.md to blog/{slug}/index.html using a shared template.
// Run: node scripts/build_posts.js

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const BLOG_DIR = path.join(__dirname, '..', 'blog');
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
    const outDir = path.join(BLOG_DIR, slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), out);
    console.log('built blog/' + slug + '/index.html');
}
