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

 /// CASE-INSENSITIVE DEDUPLICATED TAG COLLECTION (Safe CommonJS)
  eleventyConfig.addCollection("uniqTags", function(collectionApi) {
    const uniqueSlugs = new Set();
    const cleanTags = [];

    collectionApi.getAll().forEach(function(item) {
      const tags = item.data.tags || [];
      tags.forEach(function(tag) {
        if (!tag || ["all", "posts", "tagList"].includes(tag)) return;
        
        // Safe URL slug conversion
        const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        if (!uniqueSlugs.has(slug)) {
          uniqueSlugs.add(slug);
          cleanTags.push(tag);
        }
      });
    });

    // DYNAMIC CREATOR ARCHIVE COLLECTION
  eleventyConfig.addCollection("creators", function(collectionApi) {
    const creatorMap = {};
    
    collectionApi.getAll().forEach(function(item) {
      const author = item.data.author;
      if (!author) return;
      
      // Create a URL-safe slug for the author
      const slug = author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      if (!creatorMap[slug]) {
        creatorMap[slug] = {
          name: author,
          count: 0
        };
      }
      creatorMap[slug].count++;
    });
    
    return creatorMap;
  });
    return cleanTags;
  });

  // Helper filter to convert Nunjucks collections into standard sortable arrays
  eleventyConfig.addFilter("collectionsToArray", function(obj) {
    if (!obj) return [];
    return Object.keys(obj).map(key => ({ key: key, value: obj[key] }));
  });

  // 1. Pre-Sorted Dynamic Creators
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

    // Convert to array and sort by count descending
    return Object.values(creatorMap).sort((a, b) => b.count - a.count);
  });

  // 2. Pre-Sorted Case-Insensitive Topics (Excludes Creators and Specific Targets)
  eleventyConfig.addCollection("sortedTopics", function(collectionApi) {
    const uniqueSlugs = new Set();
    const topicMap = {};

    // First, gather creator slugs to filter them out
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
        if (creatorSlugs.has(slug)) return; // Skip if it's a creator name

        if (!topicMap[slug]) {
          topicMap[slug] = { name: tag, slug: slug, count: 0 };
        }
        topicMap[slug].count++;
      });
    });

    return Object.values(topicMap).sort((a, b) => b.count - a.count);
  });

  // 3. MASTER FILTERS COLLECTION (Generates pages for both Creators and Topics)
  eleventyConfig.addCollection("allFilters", function(collectionApi) {
    const filterSet = new Set();

    collectionApi.getAll().forEach(function(item) {
      // Add author slug if it exists
      if (item.data.author) {
        const authorSlug = item.data.author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        filterSet.add(authorSlug);
      }
      
      // Add standard tag slugs
      const tags = item.data.tags || [];
      tags.forEach(function(tag) {
        if (!tag || ["all", "posts", "tagList", "uniqTags"].includes(tag)) return;
        const tagSlug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        filterSet.add(tagSlug);
      });
    });

    return Array.from(filterSet);
  });
  // Look for your existing return statement at the bottom and make it look like this:
  return {
    dir: {
      input: "src",
      output: "docs", // Make sure this says docs, not _site
      includes: "_includes"
    },
    pathPrefix: "/Vegan-Archive/"
  };
};