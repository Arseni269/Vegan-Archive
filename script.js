const tags = document.querySelectorAll('.filter-button');
const posts = document.querySelectorAll('.post-card');

tags.forEach(tag => {
  tag.addEventListener('click', () => {
    const filterValue = tag.getAttribute('data-filter');
    
    posts.forEach(post => {
      const postTags = post.getAttribute('data-tags');
      if (filterValue === 'all' || postTags.includes(filterValue)) {
        post.style.display = 'flex';
      } else {
        post.style.display = 'none';
      }
    });
  });
});


const backToTopBtn = document.getElementById("back-to-top");

    window.addEventListener("scroll", () => {
      // Show button after user scrolls down 400px
      if (window.scrollY > 400) {
        backToTopBtn.classList.add("is-visible");
      } else {
        backToTopBtn.classList.remove("is-visible");
      }
    });

backToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    })

    <script>
  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("archive-search-input");
    const datalist = document.createElement('datalist');
    datalist.id = 'search-suggestions';
    document.body.appendChild(datalist);
    searchInput.setAttribute('list', 'search-suggestions');

    // 1. Automatically collect all unique creators, tags, and titles
    const terms = new Set();
    
    document.querySelectorAll('.post-card').forEach(card => {
      // Add creator
      const creator = card.getAttribute('data-creator');
      if (creator) terms.add(creator);
      
      // Add tags
      const tags = card.getAttribute('data-tags');
      if (tags) tags.split(',').forEach(t => terms.add(t.trim()));
      
      // Add title (assuming your card has a title element, e.g., h3)
      const title = card.querySelector('h3'); 
      if (title) terms.add(title.innerText.trim());
    });

    // 2. Populate the datalist
    terms.forEach(term => {
      const option = document.createElement('option');
      option.value = term;
      datalist.appendChild(option);
    });
  });
