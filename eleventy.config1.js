import pluginRss from "@11ty/eleventy-plugin-rss";
import path from "path";
import fs from "fs";
import Image from "@11ty/eleventy-img";
import markdownIt from "markdown-it";
import sitemap from "@quasibit/eleventy-plugin-sitemap";

// 2. You also need to define __dirname since it doesn't exist in ESM by default
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Single source of truth for which tags count as "languages" — used by the
// sortedLanguages collection below AND exposed as global data so templates
// (e.g. post.njk) can group language tags together without duplicating this list.
const languageTerms = ["english", "russian", "spanish", "czech", "ukrainian", "german", "french", "japanese", "swahili", "ttalian", "hindi", "french", "chinese", "portuguese", "turkish"];

// Given a map of { slug: {name, slug, count} }, attaches an intensityPercent
// (0-100) to each item, relative to whichever item in that same category has
// the highest count. Used to color filter list entries brighter/dimmer based
// on how many posts they actually have, so the busiest filters stand out at
// a glance instead of every entry looking equally weighted.
const withIntensity = (map) => {
  const values = Object.values(map);
  const maxCount = Math.max(1, ...values.map(v => v.count));
  return values.map(v => ({ ...v, intensityPercent: Math.round((v.count / maxCount) * 100) }));
};

export default function(eleventyConfig) {
  eleventyConfig.addFilter("slugify", slugify);
  eleventyConfig.addGlobalData("languageTerms", languageTerms);
  // Now pluginRss is defined and will work here
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addGlobalData("permalink", () => {
    return (data) => {
      const stem = data.page.filePathStem;

      if (!stem.startsWith("/archive/")) {
        return stem + "/index.html";
      }

      // The archive's own listing page (src/archive/index.njk) must always
      // stay pinned at /archive/, regardless of whatever title it has —
      // otherwise it gets swept into the title-slug logic below and the
      // site's main archive URL 404s.
      if (stem === "/archive/index") {
        return "/archive/";
      }

      // Individual posts: replace the duplicated folder/filename segment
      // with a slug built from the post's title.
      if (data.layout === "post.njk") {
        const lastSlash = stem.lastIndexOf("/");
        const dir = stem.substring(0, lastSlash);
        const titleSlug = data.title ? slugify(data.title) : stem.substring(lastSlash + 1);
        return `${dir}/${titleSlug}/`;
      }

      // Anything else under /archive/ (tag pages, etc.) keeps the old behavior.
      return `${stem}/`;
    };
  });
eleventyConfig.addPlugin(sitemap, {
    sitemap: {
      hostname: "https://end-animal-use.com", // Replace with your actual domain
    },
  });
eleventyConfig.addCollection("postsSorted", function(collectionApi) {
  return collectionApi.getFilteredByGlob(["src/posts/*.md", "src/ukrainian/*.md"])
    .map(post => {
      if (post.data.tags) {
        // Force every tag to lowercase for the collection
        post.data.tags = post.data.tags.map(t => t.toLowerCase());
      }
      return post;
    })
    .sort((a, b) => {
      const dateA = a.date ? a.date.getTime() : 0;
      const dateB = b.date ? b.date.getTime() : 0;
      return dateB - dateA;
    });
});
  let markdownOptions = {
    html: true,
    breaks: true,
    linkify: true // <-- THIS turned plain text URLs back into clickable hyperlinks!
  };
  
  eleventyConfig.setLibrary("md", markdownIt(markdownOptions));

  // Pulls out just the markdown body (post.njk wraps it in
  // <div id="description-content">) from the fully rendered page HTML that
  // base.njk receives — otherwise the social-share description ends up
  // built from the whole page (title, tags, creator card, etc.) instead of
  // the actual write-up. Falls back to the untouched input on pages that
  // don't have that div (archive, tag pages, etc.).
  eleventyConfig.addFilter("extractPostDescription", function(html) {
    if (typeof html !== "string") return html;
    const match = html.match(/<div id="description-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
    return match ? match[1] : html;
  });

  // Normalizes a front-matter field that may be a single string or an array
  // into an array, so templates can always safely loop over it.
  eleventyConfig.addFilter("ensureArray", function(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === "") return [];
    return [value];
  });

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
  eleventyConfig.addPassthroughCopy("src/ukrainian");
  eleventyConfig.addPassthroughCopy("src/**/*.png");
  eleventyConfig.addPassthroughCopy("src/**/*.webp");
  eleventyConfig.addPassthroughCopy("src/german");
  eleventyConfig.addPassthroughCopy("src/japanese");
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

    return withIntensity(creatorMap).sort((a, b) => a.name.localeCompare(b.name));
  });

  // 3. DYNAMIC LANGUAGES COLLECTION
  eleventyConfig.addCollection("sortedLanguages", function(collectionApi) {
    const langMap = {};

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
    return withIntensity(langMap).sort((a, b) => a.name.localeCompare(b.name));
  });
eleventyConfig.addCollection("sortedMisinformers", function(collectionApi) {
  const misinformerMap = {};
  collectionApi.getAll().forEach(item => {
    if (item.data.misinformer) {
    console.log(`Found post: ${item.filePathStem} | Data:`, item.data.misinformer);
} else {
    // This will help us see if Eleventy is skipping your post entirely
    // console.log(`No misinformers found in: ${item.filePathStem}`);
}
    const data = item.data.misinformer || [];
    const names = Array.isArray(data) ? data : [data];
    
    names.forEach(name => {
      // 1. Force everything to lowercase FIRST
      const normalizedName = name.toLowerCase(); 
      // 2. Use your existing slugify logic on the normalized name
      const slug = normalizedName.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      if (!slug) return;
      
      if (!misinformerMap[slug]) {
        // Store the original "pretty" name (capitalized) 
        // but use the slug for the map key
        misinformerMap[slug] = { name: name, slug: slug, count: 0 };
      }
      misinformerMap[slug].count++;
    });
  });
  return withIntensity(misinformerMap).sort((a, b) => a.name.localeCompare(b.name));
});
  // 5. DYNAMIC TOPICS COLLECTION
  eleventyConfig.addCollection("sortedTopics", function(collectionApi) {
    const topicMap = {};
    const creatorSlugs = new Set();
    const reservedTerms = ["all", "posts", "taglist", "uniqtags", "english", "russian", "spanish", "german", "french", "ukrainian", "turkish", "czech", "japanese", "swahili", "italian", "hindi", "french", "chinese", "portuguese"];

    // First pass: collect creators
    collectionApi.getAll().forEach(function(item) {
      if (item.data.author) {
        creatorSlugs.add(slugify(item.data.author));
      }
    });

    // Second pass: collect topics
    collectionApi.getAll().forEach(function(item) {
      const tags = item.data.tags || [];
      const misinformers = item.data.misinformer || [];
      const misinformerList = Array.isArray(misinformers) ? misinformers : [misinformers];
      const misinformerSlugs = misinformerList.map(m => slugify(m));

      tags.forEach(function(tag) {
        if (!tag) return;
        const slug = slugify(tag);

        // Exclude if it's a reserved term, a creator, or a misinformer
        if (reservedTerms.includes(slug) || creatorSlugs.has(slug) || misinformerSlugs.includes(slug)) return;

        if (!topicMap[slug]) {
          topicMap[slug] = { name: tag, slug: slug, count: 0 };
        }
        topicMap[slug].count++;
      });
    });
    
    return withIntensity(topicMap).sort((a, b) => a.name.localeCompare(b.name));
  });
  // Add this helper filter
eleventyConfig.addFilter("getMisinformerCount", function(collection, name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const item = collection.find(m => m.slug === slug);
  return item ? item.count : 0;
});

  // 6. SITE-WIDE SEARCH INDEX — every real post (title + url), covering all
  // language folders (unlike the older postsSorted collection above, which
  // only ever looked at src/posts/ and src/ukrainian/). Meant to be dumped
  // as JSON and embedded on any page that wants the search bar + suggestions
  // (currently the archive and individual posts), not just the archive grid.
  eleventyConfig.addCollection("searchablePosts", function(collectionApi) {
    return collectionApi.getAll()
      .filter(item => item.data.layout === "post.njk")
      .map(item => ({ title: item.data.title, url: item.url }));
  });

  // Merges the four separate tag-category collections (creators/topics/
  // languages/misinformers) into one flat list with a category attached to
  // each, for the same JSON-embed-and-search-client-side purpose as above.
  // Usage: {{ collections.sortedCreators | mergeTagCategories(collections.sortedTopics, collections.sortedLanguages, collections.sortedMisinformers) | dump | safe }}
  eleventyConfig.addFilter("mergeTagCategories", function(creators, topics, languages, misinformers) {
    const tag = (arr, category) => (arr || []).map(v => ({ name: v.name, slug: v.slug, category }));
    return [
      ...tag(creators, "creator"),
      ...tag(topics, "topic"),
      ...tag(languages, "language"),
      ...tag(misinformers, "misinformer")
    ];
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