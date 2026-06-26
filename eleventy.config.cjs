const path = require("path");
const fs = require("fs");
const Image = require("@11ty/eleventy-img");
const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {

  let markdownOptions = {
    html: true,
    breaks: true,
    linkify: true // <-- THIS turned plain text URLs back into clickable hyperlinks!
  };
  
  eleventyConfig.setLibrary("md", markdownIt(markdownOptions));

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

 /// CASE-INSENSITIVE DEDUPLICATED TAG COLLECTION (Safe CommonJS)
  // 1. CASE-INSENSITIVE DEDUPLICATED TAG COLLECTION
  eleventyConfig.addCollection("uniqTags", function(collectionApi) {
    const uniqueSlugs = new Set();
    const cleanTags = [];

    collectionApi.getAll().forEach(function(item) {
      const tags = item.data.tags || [];
      tags.forEach(function(tag) {
        if (!tag || ["all", "posts", "tagList"].includes(tag)) return;
        const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
     
        if (!uniqueSlugs.has(slug)) {
          uniqueSlugs.add(slug);
          cleanTags.push(tag);
        }
      });
    });
    return cleanTags;
  });

  // 2. Pre-Sorted Dynamic Creators
  eleventyConfig.addCollection("sortedCreators", function(collectionApi) {
    const creatorMap = {};
    
    collectionApi.getAll().forEach(function(item) {
      const author = item.data.author;
      if (!author) return;
      const slug = author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      if (!creatorMap[slug]) {
        creatorMap[slug] = { name: author, slug: slug, count: 0 };
      }
      creatorMap[slug].count++;
    });

    return Object.values(creatorMap).sort((a, b) => b.count - a.count);
  });

  // 3. Pre-Sorted Case-Insensitive Topics
  eleventyConfig.addCollection("sortedTopics", function(collectionApi) {
    const topicMap = {};
    const creatorSlugs = new Set();

    collectionApi.getAll().forEach(function(item) {
      if (item.data.author) {
        creatorSlugs.add(item.data.author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      }
    });

    collectionApi.getAll().forEach(function(item) {
      const tags = item.data.tags || [];
      tags.forEach(function(tag) {
        if (!tag || ["all", "posts", "tagList", "uniqTags", "ex-vegans", "carnivore-diet"].includes(tag)) return;
        
        const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (creatorSlugs.has(slug)) return; 

        if (!topicMap[slug]) {
          topicMap[slug] = { name: tag, slug: slug, count: 0 };
        }
        topicMap[slug].count++;
      });
    });

    return Object.values(topicMap).sort((a, b) => b.count - a.count);
  });

  // 4. MASTER FILTERS COLLECTION (For generating subpages)
  eleventyConfig.addCollection("allFilters", function(collectionApi) {
    const filterSet = new Set();

    collectionApi.getAll().forEach(function(item) {
      if (item.data.author) {
        const authorSlug = item.data.author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        filterSet.add(authorSlug);
      }
      
      const tags = item.data.tags || [];
      tags.forEach(function(tag) {
        if (!tag || ["all", "posts", "tagList", "uniqTags"].includes(tag)) return;
        const tagSlug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        filterSet.add(tagSlug);
      });
    });

    return Array.from(filterSet);
  });

  // 5. Helper filter to convert Nunjucks collections into arrays
  eleventyConfig.addFilter("collectionsToArray", function(obj) {
    if (!obj) return [];
    return Object.keys(obj).map(key => ({ key: key, value: obj[key] }));
  });

  return {
    dir: {
      input: "src",
      output: "docs",
      includes: "_includes"
    },
    pathPrefix: "/Vegan-Archive/"
  };
};