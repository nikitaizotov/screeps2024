const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "dist");
const destDir = path.join(__dirname, "dist-flat");

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
        /require\(".*\//gm,
        'require("./'
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
