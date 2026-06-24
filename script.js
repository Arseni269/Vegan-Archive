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