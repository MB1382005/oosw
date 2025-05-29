document.addEventListener('DOMContentLoaded', () => {
  renderComparison();
  updateFavCount(); 
});

function renderComparison() {
  const container = document.getElementById('comparisonContainer');
  const compareList = JSON.parse(localStorage.getItem('compare')) || [];

  if (compareList.length === 0) {
    container.innerHTML = `<p>No products selected for comparison.</p>`;
    return;
  }

  container.innerHTML = '';

  compareList.forEach(product => {
    const div = document.createElement('div');
    div.className = 'compare-card';
    div.innerHTML = `
      <img src="${product.img}" alt="${product.name}" class="compare-image">
      <h3>${product.name}</h3>
      <p>Price: ${product.price} EGP</p>
      <p>Rating: ${'⭐'.repeat(product.rating)}${'☆'.repeat(5 - product.rating)}</p>
      <p>Category: ${product.category || 'N/A'}</p>
      <button class="remove-compare" data-name="${product.name}">Remove</button>
    `;
    container.appendChild(div);
  });
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('remove-compare')) {
    const name = e.target.dataset.name;
    let compareList = JSON.parse(localStorage.getItem('compare')) || [];
    compareList = compareList.filter(p => p.name !== name);
    localStorage.setItem('compare', JSON.stringify(compareList));
    renderComparison();
  }
});
function updateFavCount() {
  const favCount = document.getElementById('favCount');
  if (favCount) {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    favCount.textContent = favorites.length;
  }
}

function addToFavorites(item) {
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  const exists = favorites.some(fav => fav.name === item.name);

  if (!exists) {
    favorites.push(item);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavCount();
  } 
}

document.addEventListener('DOMContentLoaded', () => {
  updateFavCount();
});