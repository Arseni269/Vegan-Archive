const fs = require("fs");
const path = require("path");

module.exports = {
  // A helper function to read all files inside a target directory
  getImages: function(postFolderPath) {
    const fullDirPath = path.join(__dirname, "../", postFolderPath);
    
    // Safety check: if the folder doesn't exist, return an empty list
    if (!fs.existsSync(fullDirPath)) {
      return [];
    }

    // Read files, filter out hidden system files, and strip extensions for your smart shortcode
    return fs.readdirSync(fullDirPath)
      .filter(file => !file.startsWith('.') && !file.endsWith('.md'))
      .map(file => {
        // Strip the file extension (e.g., "1.webp" becomes "1")
        return path.parse(file).name;
      })
      // Optional: Sorts files numerically ("1", "2", "3"...) instead of alphabetically
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }
};