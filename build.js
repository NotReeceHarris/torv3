const fs = require('fs');
const path = require('path');
const uglify = require('uglify-js');

const toMinify = [
	'index.js',
];

const outputDir = path.join(__dirname, 'build');
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir);
}

toMinify.forEach((file) => {
	const inputFile = fs.readFileSync(file, 'utf8');
	const minified = uglify.minify(inputFile);

	fs.writeFileSync(path.join(outputDir, file), minified.code);
});