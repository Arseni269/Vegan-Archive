const path = require("path");
const fs = require("fs");
const Image = require("@11ty/eleventy-img");

module.exports = function (eleventyConfig) {

  // 1. SMART IMAGE SHORTCODE
  eleventyConfig.addNunjucksAsyncShortcode("image", async function(imagePath, alt) {
    let cleanPath = imagePath.replace(/^\.?\/?src\//, "").replace(/^\//, "");
    
    const extensions = [".jpg", ".jpeg", ".png", ".webp", ".GIF", ".PNG", ".JPG", ".JPEG"];
    let resolvedPath = null;

    for (let ext of extensions) {
      const fullPath = path.join(__dirname, "src", cleanPath + ext);
      if (fs.existsSync(fullPath)) {
        resolvedPath = fullPath;
        break;
      }
    }

    if (!resolvedPath) {
      console.warn(`[Image Shortcode] File not found: src/${cleanPath}.(ext)`);
      return `<div class="placeholder-thumb">Image Missing: src/${cleanPath}</div>`;
    }

    let metadata = await Image(resolvedPath, {
      widths: [600],
      formats: ["webp"],
      outputDir: "./docs/img/",
      urlPath: "/Vegan-Archive/img/" 
    });

    let imageAttributes = {
      alt,
      loading: "lazy",
      decoding: "async",
    };

    return Image.generateHTML(metadata, imageAttributes);
  });

  // 2. AUTOMATIC IMAGE FINDER FILTER
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

// Keep whatever passthrough copies you already have, just add these if missing:
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.jpg");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.png");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.webp");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.mp4");

 // CASE-INSENSITIVE DEDUPLICATED TAG COLLECTION (CommonJS Format)
  eleventyConfig.addCollection("uniqTags", function(collectionApi) {
    const allTags = collectionApi.getAll().flatMap(item => item.data.tags || []);
    const uniqueSlugs = new Set();
    const cleanTags = [];

    allTags.forEach(tag => {
      if (!tag || ["all", "posts", "tagList"].includes(tag)) return;
      
      const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      if (!uniqueSlugs.has(slug)) {
        uniqueSlugs.add(slug);
        cleanTags.push(tag);
      }
    });

    return cleanTags;
  });

  // Look for your existing return statement at the bottom and make it look like this:
  return {
    pathPrefix: "/Vegan-Archive/", // <-- JUST ADD THIS LINE HERE
    dir: {
      input: "src",
      output: "docs"
    }
  };
};