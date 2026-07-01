const path = require("path");
const fs = require("fs");
const Image = require("@11ty/eleventy-img");
const markdownIt = require("markdown-it");

// Robust slugify helper
const slugify = (text) => {
  // If it's an array, take the first element
  if (Array.isArray(text)) {
    text = text[0];
  }
  
  // If it's not a string (null, undefined, number, etc.), return empty string
  if (typeof text !== 'string') {
    return '';
  }
  
  // Now it is guaranteed to be a string, safe to call toLowerCase()
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};
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
      urlPath: "/img/" 
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
    if (!inputPath) {
      return { files: [], folder: "" };
    }

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
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map(file => {
        const parsed = path.parse(file);
        const ext = parsed.ext.toLowerCase();
        const isVid = [".mp4", ".mov", ".webm", ".m4v"].includes(ext);
        
        // Return explicit object bindings with default fallbacks
        return {
          name: parsed.name || "",
          fullName: file || "",
          isVideo: isVid ? true : false
        };
      });

    return { files, folder: relativeDirPath };
  });
  // Passthrough copies
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.jpg");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.png");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.webp");
  eleventyConfig.addPassthroughCopy("src/archive/**/*.mp4");
  eleventyConfig.addPassthroughCopy("src/spanish/**/*.webp");
  eleventyConfig.addPassthroughCopy("src/spanish");

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

  // 2. DYNAMIC CREATORS COLLECTION (Only one version kept)
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

  // 3. DYNAMIC LANGUAGES COLLECTION
  eleventyConfig.addCollection("sortedLanguages", function(collectionApi) {
    const langMap = {};
    const languageTerms = ["english", "russian", "spanish", "german", "french"];

    collectionApi.getAll().forEach(function(item) {
      const tags = item.data.tags || [];
      tags.forEach(function(tag) {
        if (!tag) return;
        const slug = slugify(tag);
        if (languageTerms.includes(slug)) {
          if (!langMap[slug]) {
            langMap[slug] = { name: tag, slug: slug, count: 0 };
          }
          langMap[slug].count++;
        }
      });
    });
    return Object.values(langMap).sort((a, b) => b.count - a.count);
  });

// 4. DYNAMIC MISINFORMERS COLLECTION
eleventyConfig.addCollection("sortedMisinformers", function(collectionApi) {
  const misinformerMap = {};

  collectionApi.getAll().forEach(function(item) {
    const misinformerData = item.data.misinformer;
    if (!misinformerData) return;

    // Normalize to an array, then loop through each
    const names = Array.isArray(misinformerData) ? misinformerData : [misinformerData];

    names.forEach(name => {
      const slug = slugify(name);
      if (!slug) return; // Skip if slugification resulted in empty string
      
      if (!misinformerMap[slug]) {
        misinformerMap[slug] = { name: name, slug: slug, count: 0 };
      }
      misinformerMap[slug].count++;
    });
  });
  
  return Object.values(misinformerMap).sort((a, b) => b.count - a.count);
});

  // 5. DYNAMIC TOPICS COLLECTION
  eleventyConfig.addCollection("sortedTopics", function(collectionApi) {
    const topicMap = {};
    const creatorSlugs = new Set();
    const reservedTerms = ["all", "posts", "taglist", "uniqtags", "english", "russian", "spanish", "german", "french", "niko", "peb", "roberto"];

    // First pass: collect creators
    collectionApi.getAll().forEach(function(item) {
      if (item.data.author) {
        creatorSlugs.add(slugify(item.data.author));
      }
    });

    // Second pass: collect topics
    collectionApi.getAll().forEach(function(item) {
      const tags = item.data.tags || [];
      tags.forEach(function(tag) {
        if (!tag) return;
        const slug = slugify(tag);
        
        // Exclude if it's a reserved term, a creator, or a misinformer
        const misinformerSlug = item.data.misinformer ? slugify(item.data.misinformer) : "";
        if (reservedTerms.includes(slug) || creatorSlugs.has(slug) || slug === misinformerSlug) return; 

        if (!topicMap[slug]) {
          topicMap[slug] = { name: tag, slug: slug, count: 0 };
        }
        topicMap[slug].count++;
      });
    });
    
    return Object.values(topicMap).sort((a, b) => b.count - a.count);
  });
  return {
    dir: {
      input: "src",
      output: "docs",
      includes: "_includes"
    },
    pathPrefix: "/",
  };
};