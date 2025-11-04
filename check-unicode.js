#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function checkFileForInvalidSurrogates(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for invalid surrogates
    const surrogatePattern = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g;
    const matches = content.match(surrogatePattern);

    if (matches) {
      console.log(`❌ Found invalid surrogates in: ${filePath}`);
      console.log(`   Count: ${matches.length}`);

      // Find position
      for (let i = 0; i < content.length; i++) {
        const charCode = content.charCodeAt(i);
        if ((charCode >= 0xD800 && charCode <= 0xDBFF &&
             (i + 1 >= content.length || content.charCodeAt(i + 1) < 0xDC00 || content.charCodeAt(i + 1) > 0xDFFF)) ||
            (charCode >= 0xDC00 && charCode <= 0xDFFF &&
             (i === 0 || content.charCodeAt(i - 1) < 0xD800 || content.charCodeAt(i - 1) > 0xDBFF))) {
          console.log(`   Position: ${i} (char code: 0x${charCode.toString(16)})`);
        }
      }
      return true;
    }
  } catch (err) {
    // Skip files that can't be read as UTF-8
  }
  return false;
}

function walkDirectory(dir, excludeDirs = ['node_modules', '.git', 'dist', 'build']) {
  const files = fs.readdirSync(dir);
  const issues = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        issues.push(...walkDirectory(fullPath, excludeDirs));
      }
    } else if (stat.isFile()) {
      // Check text files only
      const ext = path.extname(file);
      if (['.js', '.ts', '.json', '.md', '.txt', '.csv', '.html', '.css'].includes(ext)) {
        if (checkFileForInvalidSurrogates(fullPath)) {
          issues.push(fullPath);
        }
      }
    }
  }

  return issues;
}

console.log('🔍 Checking for invalid Unicode surrogates...\n');
const issues = walkDirectory('.');

if (issues.length > 0) {
  console.log(`\n⚠️  Found ${issues.length} file(s) with invalid surrogates:`);
  issues.forEach(f => console.log(`   - ${f}`));
  console.log('\n💡 These files may cause JSON encoding errors.');
} else {
  console.log('✅ No invalid surrogates found in text files.');
}
