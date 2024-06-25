const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "dist");
const destDir = path.join(__dirname, "dist_flattened");

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

const copyFilesAndUpdateImports = (dir, dest) => {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    const destPath = path.join(dest, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      copyFilesAndUpdateImports(filePath, dest);
    } else {
      const fileContents = fs.readFileSync(filePath, "utf8");
      const updatedContents = fileContents.replace(
        /from\s+['"](.*?)['"]/g,
        (match, p1) => {
          const newImportPath = path.relative(dest, path.resolve(dir, p1));
          return `from '${newImportPath}'`;
        }
      );
      fs.writeFileSync(
        path.join(dest, path.basename(filePath)),
        updatedContents,
        "utf8"
      );
    }
  });
};

copyFilesAndUpdateImports(srcDir, destDir);
