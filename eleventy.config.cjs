const path = require("path");
const fs = require("fs");
const Image = require("@11ty/eleventy-img");

module.exports = function (eleventyConfig) {

  // 1. SMART IMAGE SHORTCODE (Upgraded)
  eleventyConfig.addAsyncShortcode("image", async function (basePathWithoutExtension, alt = "") {
    const extensions = [".webp", ".jpg", ".jpeg", ".png", ".PNG", ".JPG"];
    let resolvedPath = null;

    // Defensively clean the input path string so it doesn't duplicate folder roots
    let cleanPath = basePathWithoutExtension
      .trim()
      .replace(/^src\//, "")
      .replace(/^\.\/src\//, "")
      .replace(/^\//, "");

    // Safety: If the path doesn't start with archive/, ensure it does
    if (!cleanPath.startsWith("archive/")) {
      cleanPath = "archive/" + cleanPath;
    }

    for (let ext of extensions) {
      const fullPath = path.join(__dirname, "src", cleanPath + ext);
      if (fs.existsSync(fullPath)) {
        resolvedPath = fullPath;
        break;
      }
    }

    if (!resolvedPath) {
      console.warn(`[Image Shortcode] File not found: src/${cleanPath}.(webp/jpg/png)`);
      return `<div class="placeholder-thumb">Image Missing: src/${cleanPath}</div>`;
    }

    let metadata = await Image(resolvedPath, {
      widths: [600],
      formats: ["webp"],
      outputDir: "./_site/img/",
      urlPath: "/img/"
    });

    let imageAttributes = {
      alt,
      loading: "lazy",
      decoding: "async",
    };

    return Image.generateHTML(metadata, imageAttributes);
  });

  // NEW TOOL: 2. AUTOMATIC IMAGE FINDER FILTER
  // AUTOMATIC IMAGE FINDER FILTER (Upgraded)
  // AUTOMATIC IMAGE FINDER FILTER (Final Bulletproof Version)
  eleventyConfig.addFilter("getImagesData", function (inputPath) {
    let relativeDirPath = inputPath.includes('.md') ? path.dirname(inputPath) : inputPath;
    relativeDirPath = relativeDirPath.replace(/^\.\//, "").replace(/^src\//, "");

    const fullDirPath = path.join(__dirname, "src", relativeDirPath);

    if (!fs.existsSync(fullDirPath) || !fs.statSync(fullDirPath).isDirectory()) {
      console.warn(`[getImagesData] Directory invalid: ${fullDirPath}`);
      return { files: [], folder: relativeDirPath };
    }

    const files = fs.readdirSync(fullDirPath)
      .filter(file => {
        const fullFilePath = path.join(fullDirPath, file);
        return !file.startsWith('.') && !file.endsWith('.md') && fs.statSync(fullFilePath).isFile();
      })
      .map(file => path.parse(file).name)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    return { files, folder: relativeDirPath };
  });
  // 3. PASSTHROUGH COPIES
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.jpg");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.png");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.webp");

  return {
    dir: {
      input: "src",
      output: "_site"
    },
    pathPrefix: "/Vegan-Archive/"
  };
};