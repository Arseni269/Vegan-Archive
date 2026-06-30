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