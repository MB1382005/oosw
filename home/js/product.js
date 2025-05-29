let products = [];
let productCategories = [];
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;
let userWishlist = [];

function fetchCategories() {
  fetch("/oop/classes/Category.php?action=all")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        productCategories = data;
        renderCategories();
      } else {
        console.error("Error fetching categories: Invalid data format");
        showCategoriesError("Could not load categories (invalid data)");
      }
    })
    .catch(error => {
      console.error("Error fetching categories:", error);
      showCategoriesError("Failed to load categories");
    });
}

function showCategoriesError(message) {
  const categoriesContainer = document.querySelector('.categories-filter');
  if (!categoriesContainer) return;
  const allProductsBtn = categoriesContainer.querySelector('[data-category="all"]');
  categoriesContainer.innerHTML = '';
  if (allProductsBtn) {
    categoriesContainer.appendChild(allProductsBtn);
  } else {
    const newAllBtn = document.createElement('button');
    newAllBtn.className = 'filter-btn active';
    newAllBtn.setAttribute('data-category', 'all');
    newAllBtn.innerHTML = `
      <i class="fas fa-th-large"></i>
      <span>All Products</span>
    `;
    categoriesContainer.appendChild(newAllBtn);
  }
  const errorMsg = document.createElement('div');
  errorMsg.className = 'categories-error';
  errorMsg.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
  categoriesContainer.appendChild(errorMsg);
  categoriesContainer.querySelector('[data-category="all"]').addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    categoriesContainer.querySelector('[data-category="all"]').classList.add('active');
    currentPage = 1;
    filterAndSortProducts();
  });
}

function renderCategories() {
  const categoriesContainer = document.querySelector('.categories-filter');
  if (!categoriesContainer) return;
  const loadingIndicator = categoriesContainer.querySelector('.categories-loading');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
  categoriesContainer.innerHTML = `
    <button class="filter-btn active" data-category="all">
      <i class="fas fa-th-large"></i>
      <span>All Products</span>
    </button>
  `;
  productCategories.forEach(category => {
    const categoryBtn = document.createElement('button');
    categoryBtn.className = 'filter-btn';
    categoryBtn.setAttribute('data-category', category.name);
    categoryBtn.innerHTML = `
      <i class="fas fa-capsules"></i>
      <span>${category.name}</span>
    `;
    categoriesContainer.appendChild(categoryBtn);
  });
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPage = 1;
      filterAndSortProducts();
    });
  });
}

async function fetchProducts() {
  try {
    console.log("Fetching products...");
    const response = await fetch("/oop/manger_panel/GetProducts.php");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const responseText = await response.text();
    console.log("Raw products response:", responseText.substring(0, 100) + "...");
    try {
      const data = JSON.parse(responseText);
      if (data.status === "success") {
        products = data.products || [];
        console.log("Products fetched successfully:", products.length, "items");
        filterAndSortProducts();
        return products;
      } else {
        console.error("Server returned error fetching products:", data.message);
        showToast("Error loading products: " + (data.message || "Unknown error"), 'error');
        return [];
      }
    } catch (parseError) {
      console.error("Error parsing products JSON:", parseError);
      showToast("Error parsing product data", 'error');
      return [];
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    showToast("Error connecting to product database", 'error');
    return [];
  }
}

async function fetchWishlist() {
  try {
    console.log("Fetching user wishlist...");
    const loginResponse = await fetch('/oop/manage_login/check_login.php');
    if (!loginResponse.ok) {
      throw new Error(`HTTP error! status: ${loginResponse.status}`);
    }
    const loginData = await loginResponse.json();
    console.log("Login check result:", loginData);
    if (!loginData.loggedIn) {
      console.log("User not logged in, using localStorage wishlist");
      const localFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
      userWishlist = localFavorites.map(item => parseInt(item.id)).filter(id => !isNaN(id));
      console.log("Local wishlist:", userWishlist);
      return userWishlist;
    }
    const timestamp = new Date().getTime();
    const response = await fetch(`/oop/get_wishlist.php?t=${timestamp}`);
    if (!response.ok) {
      console.warn("HTTP error fetching wishlist:", response.status, response.statusText);
      const localFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
      userWishlist = localFavorites.map(item => parseInt(item.id)).filter(id => !isNaN(id));
      console.log("Fallback to local wishlist:", userWishlist);
      return userWishlist;
    }
    const responseText = await response.text();
    console.log("Raw wishlist response:", responseText);
    try {
      const data = JSON.parse(responseText);
      console.log("Parsed wishlist data:", data);
      if (data.success) {
        if (Array.isArray(data.wishlist)) {
          userWishlist = data.wishlist.map(item => parseInt(item.id)).filter(id => !isNaN(id));
          console.log("Server wishlist populated:", userWishlist);
          const localFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
          if (userWishlist.length === 0 && localFavorites.length > 0) {
            console.log("Server wishlist empty but localStorage has items, syncing...");
            for (const item of localFavorites) {
              if (item && item.id) {
                try {
                  await addToWishlist(parseInt(item.id));
                  if (!userWishlist.includes(parseInt(item.id))) {
                    userWishlist.push(parseInt(item.id));
                  }
                } catch (e) {
                  console.error("Error adding item to server wishlist:", e);
                }
              }
            }
          }
          updateWishlistUI();
          return userWishlist;
        } else {
          console.warn("Server returned success but wishlist is not an array");
          const localFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
          userWishlist = localFavorites.map(item => parseInt(item.id)).filter(id => !isNaN(id));
          return userWishlist;
        }
      } else {
        console.log("Wishlist not available:", data.message);
        const localFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
        userWishlist = localFavorites.map(item => parseInt(item.id)).filter(id => !isNaN(id));
        return userWishlist;
      }
    } catch (parseError) {
      console.error("Error parsing wishlist JSON:", parseError);
      const localFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
      userWishlist = localFavorites.map(item => parseInt(item.id)).filter(id => !isNaN(id));
      return userWishlist;
    }
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    const localFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
    userWishlist = localFavorites.map(item => parseInt(item.id)).filter(id => !isNaN(id));
    return userWishlist;
  }
}

function updateWishlistUI() {
  try {
    console.log("Updating wishlist UI with", userWishlist.length, "items");
    document.querySelectorAll('.fav-btn').forEach(btn => {
      const productElement = btn.closest('.product-card');
      if (productElement) {
        const img = productElement.querySelector('.product-image');
        if (img) {
          const productId = parseInt(img.getAttribute('data-id'));
          if (userWishlist.includes(productId)) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-heart"></i>';
          } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-heart"></i>';
          }
        }
      }
    });
    updateFavCount();
  } catch (error) {
    console.error("Error updating wishlist UI:", error);
  }
}

function renderProducts(filteredProducts) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const productsToShow = filteredProducts.slice(startIndex, endIndex);
  grid.innerHTML = '';
  if (filteredProducts.length === 0) {
    grid.innerHTML = `<p class="no-results">❌ No products found.</p>`;
    updatePagination(0);
    return;
  }
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  productsToShow.forEach(product => {
    const stars = Array.from({length: 5}, (_, i) => `<i class='fa${i < product.rating ? 's' : 'r'} fa-star'></i>`).join('');
    const isFavorite = favorites.some(fav => fav.name === product.name) || userWishlist.includes(parseInt(product.id));
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
      <div class="product-card-header">
        <button class="fav-btn ${isFavorite ? 'active' : ''}" data-product="${product.name}" title="Add to favorites">
          <i class="fas fa-heart"></i>
        </button>
      </div>
      <div class="product-image-wrapper">
        <img src="${product.img}" alt="${product.name}" class="product-image" loading="lazy" data-id="${product.id}">
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-price">${parseFloat(product.price).toFixed(2)} EGP</p>
        <div class="product-rating">${stars}</div>
        <div class="product-actions">
          <button class="add-to-cart" data-product="${product.name}" title="Add to cart">
            <i class="fas fa-cart-plus"></i>
          </button>
          <button class="add-compare" data-product="${product.name}" title="Compare">
            <i class="fas fa-balance-scale"></i>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(productCard);
  });
  updatePagination(filteredProducts.length);
  document.querySelectorAll('.product-image').forEach(img => {
    img.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      if (id) {
        window.location.href = `product_detail.html?id=${id}`;
      }
    });
  });
}

function updatePagination(totalItems) {
  const paginationContainer = document.querySelector('.pagination-container');
  if (!paginationContainer) return;
  const paginationNumbers = paginationContainer.querySelector('.pagination-numbers');
  if (paginationNumbers) {
    let paginationHTML = '';
    paginationHTML += `<button class="pagination-btn ${currentPage === 1 ? 'active' : ''}" onclick="changePage(1)">1</button>`;
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    if (startPage > 2) {
      paginationHTML += '<span class="pagination-dots">...</span>';
    }
    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `<button class="pagination-btn ${currentPage === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    if (endPage < totalPages - 1) {
      paginationHTML += '<span class="pagination-dots">...</span>';
    }
    if (totalPages > 1) {
      paginationHTML += `<button class="pagination-btn ${currentPage === totalPages ? 'active' : ''}" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    paginationNumbers.innerHTML = paginationHTML;
  }
  const prevBtn = paginationContainer.querySelector('.pagination-btn.prev');
  const nextBtn = paginationContainer.querySelector('.pagination-btn.next');
  if (prevBtn) {
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(currentPage - 1);
  }
  if (nextBtn) {
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(currentPage + 1);
  }
  const currentItems = paginationContainer.querySelector('.current-items');
  const totalItemsEl = paginationContainer.querySelector('.total-items');
  if (currentItems && totalItemsEl) {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    currentItems.textContent = `${start}-${end}`;
    totalItemsEl.textContent = totalItems;
  }
}

function changePage(newPage) {
  if (newPage < 1 || newPage > totalPages) return;
  currentPage = newPage;
  filterAndSortProducts();
}

function filterAndSortProducts() {
  const activeCategory = document.querySelector('.filter-btn.active')?.dataset.category?.toLowerCase().trim() || 'all';
  const searchInput = document.querySelector('.search-input');
  const searchQuery = searchInput?.value.trim() || '';
  const normalizedSearch = searchQuery.toLowerCase();
  const sortValue = document.getElementById('sortSelect')?.value || 'price-asc';
  const idFilter = document.getElementById('idFilterInput')?.value.trim() || '';
  const categoryFilter = activeCategory;
  let filtered = products.filter(p => {
    if (categoryFilter === 'all') {
      return true;
    }
    if (typeof p.category_name === 'string') {
      const productCategory = p.category_name.toLowerCase().trim();
      const selectedCategory = categoryFilter.toLowerCase().trim();
      console.log(`Comparing: "${productCategory}" with "${selectedCategory}"`);
      return productCategory === selectedCategory || 
             productCategory.includes(selectedCategory) || 
             selectedCategory.includes(productCategory);
    }
    return false;
  }).filter(p => {
    const matchesSearch = !searchQuery || (
      (typeof p.name === 'string' && p.name.toLowerCase().includes(normalizedSearch)) ||
      (typeof p.description === 'string' && p.description.toLowerCase().includes(normalizedSearch)) ||
      (typeof p.brand === 'string' && p.brand.toLowerCase().includes(normalizedSearch))
    );
    const matchesId = !idFilter || (p.id && p.id.toString().includes(idFilter));
    return matchesSearch && matchesId;
  });
  switch (sortValue) {
    case 'price-asc':
      filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      break;
    case 'price-desc':
      filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      break;
    case 'rating-desc':
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case 'rating-asc':
      filtered.sort((a, b) => a.rating - b.rating);
      break;
    case 'newest':
      filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      break;
    default:
      filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  }
  console.log("Filtering by category:", categoryFilter);
  console.log("Filtered products count:", filtered.length);
  renderProducts(filtered);
}

function toggleFavorite(productName) {
  if (!productName) return;
  const product = products.find(p => p.name === productName);
  if (!product) {
    console.error('Product not found:', productName);
    return;
  }
  let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  const existingIndex = favorites.findIndex(p => p.name === productName);
  const productId = parseInt(product.id);
  console.log('Toggle favorite for:', product.name, 'ID:', productId, 'Currently in favorites:', existingIndex !== -1);
  try {
    if (existingIndex === -1) {
      console.log('Adding product to favorites:', product.name, product.id);
      favorites.push(product);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      document.querySelectorAll(`.fav-btn[data-product="${productName}"]`).forEach(btn => {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-heart"></i>';
      });
      document.querySelectorAll('.fav-count').forEach(el => {
        el.textContent = favorites.length;
      });
      addToWishlist(productId)
        .then(result => {
          console.log('Server add result:', result);
        })
        .catch(error => {
          console.error('Error adding to server wishlist:', error);
        });
    } 
    else {
      console.log('Removing product from favorites:', product.name, product.id);
      favorites.splice(existingIndex, 1);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      document.querySelectorAll(`.fav-btn[data-product="${productName}"]`).forEach(btn => {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="far fa-heart"></i>';
      });
      document.querySelectorAll('.fav-count').forEach(el => {
        el.textContent = favorites.length;
      });
      removeFromWishlist(productId)
        .then(result => {
          console.log('Server remove result:', result);
        })
        .catch(error => {
          console.error('Error removing from server wishlist:', error);
        });
    }
    window.dispatchEvent(new Event('favoritesUpdated'));
  } catch (error) {
    console.error('Error in toggleFavorite:', error);
    showToast('Error updating favorites', 'error');
  }
}

async function addToWishlist(productId) {
  if (!productId || isNaN(parseInt(productId))) {
    console.error("Invalid product ID:", productId);
    return false;
  }
  productId = parseInt(productId);
  try {
    const checkLoginResponse = await fetch('/oop/manage_login/check_login.php');
    if (!checkLoginResponse.ok) {
      throw new Error(`Login check failed with status: ${checkLoginResponse.status}`);
    }
    const loginStatus = await checkLoginResponse.json();
    if (!loginStatus.loggedIn) {
      console.warn('User not logged in, cannot add to server wishlist');
      return true;
    }
    console.log('Adding product to server wishlist, ID:', productId);
    const timestamp = new Date().getTime();
    console.log('Sending wishlist request with data:', JSON.stringify({ product_id: productId }));
    const response = await fetch(`/oop/add_to_wishlist_direct.php?t=${timestamp}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId })
    });
    if (!response.ok) {
      console.warn(`Server returned error status: ${response.status}`);
      return false;
    }
    const responseText = await response.text();
    console.log('Raw wishlist response:', responseText);
    if (!responseText || responseText.trim() === '') {
      console.error('Empty response from server');
      return false;
    }
    try {
      let jsonText = responseText.trim();
      const firstJsonEnd = jsonText.indexOf('}') + 1;
      if (firstJsonEnd > 0 && firstJsonEnd < jsonText.length) {
        jsonText = jsonText.substring(0, firstJsonEnd);
      }
      const result = JSON.parse(jsonText);
      console.log('Parsed wishlist response:', result);
      if (result.success) {
        console.log('Product added to wishlist:', result.message);
        if (!userWishlist.includes(productId)) {
          userWishlist.push(productId);
        }
        return true;
      } else if (result.error) {
        console.error('Server returned error:', result.error);
        return false;
      } else {
        if (result.message && result.message.includes('already in wishlist')) {
          console.log('Product already in wishlist:', productId);
          if (!userWishlist.includes(productId)) {
            userWishlist.push(productId);
          }
          return true;
        }
        console.error('Failed to add to wishlist:', result.message);
        return false;
      }
    } catch (parseError) {
      console.error('Failed to parse wishlist response:', parseError, responseText);
      return false;
    }
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return false;
  }
}

async function removeFromWishlist(productId) {
  try {
    const response = await fetch('/oop/remove_from_wishlist.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId })
    });
    const responseText = await response.text();
    console.log('Raw wishlist remove response:', responseText);
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse wishlist remove response:', error);
      showToast('⚠️ Server returned invalid response', 'error');
      return false;
    }
    if (result.success) {
      console.log('Product removed from wishlist:', result.message);
      showToast(`✅ ${result.message}`, 'success');
      const index = userWishlist.indexOf(parseInt(productId));
      if (index !== -1) {
        userWishlist.splice(index, 1);
      }
      syncWishlistWithLocalStorage();
      return true;
    } else {
      console.error('Failed to remove from wishlist:', result.message);
      showToast(`⚠️ ${result.message}`, 'error');
      return false;
    }
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    showToast('⚠️ Failed to remove from wishlist', 'error');
    return false;
  }
}

function syncWishlistWithLocalStorage() {
  try {
    if (userWishlist && userWishlist.length > 0) {
      const serverFavorites = products.filter(p => 
        p && p.id && userWishlist.includes(parseInt(p.id))
      );
      if (serverFavorites.length > 0) {
        console.log('Syncing localStorage with server wishlist:', serverFavorites.length, 'items');
        localStorage.setItem('favorites', JSON.stringify(serverFavorites));
      }
    }
    updateFavCount();
    updateWishlistUI();
  } catch (error) {
    console.error('Error syncing wishlist with localStorage:', error);
  }
}

function updateFavCount() {
  try {
    if (userWishlist && userWishlist.length > 0) {
      document.querySelectorAll('.fav-count').forEach(el => {
        el.textContent = userWishlist.length;
      });
    } else {
      const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
      document.querySelectorAll('.fav-count').forEach(el => {
        el.textContent = favorites.length;
      });
    }
  } catch (error) {
    console.error('Error updating favorites count:', error);
  }
}

async function addToCart(productName) {
  if (!productName) return;
  const product = products.find(p => p.name === productName);
  if (!product) {
    console.error('Product not found:', productName);
    return;
  }
  console.log('Adding product to cart:', product);
  const url = 'http://localhost/oop/cart  /add_to_cart.php';
  console.log('Sending request to:', url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: product.id })
    });
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      alert('Server returned invalid response format');
      return;
    }
    console.log('Parsed response:', result);
    if (result.success) {
      alert(`✅ ${result.product_name} added to cart!`);
    } else {
      alert(result.message || 'Failed to222 add item to cart');
    }
  } catch (error) {
    console.error('Network error:', error);
    console.error('Request details:', {
      url,
      productId: product.id,
      productName: product.name
    });
    alert('Failed to add ite221m to cart. Check console for details.');
  }
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPage = 1;
    filterAndSortProducts();
  });
});

document.getElementById('sortSelect')?.addEventListener('change', () => {
  currentPage = 1;
  filterAndSortProducts();
});
document.querySelector('.search-btn')?.addEventListener('click', () => {
  currentPage = 1;
  filterAndSortProducts();
});
document.querySelector('.search-input')?.addEventListener('input', () => {
  currentPage = 1;
  filterAndSortProducts();
});

document.addEventListener('click', (e) => {
  if (e.target.closest('.fav-btn')) {
    const btn = e.target.closest('.fav-btn');
    const productName = btn.dataset.product;
    btn.classList.toggle('active');
    btn.innerHTML = '<i class="fas fa-heart"></i>';
    btn.style.transform = 'scale(1.3)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
    }, 300);
    toggleFavorite(productName);
  }
  if (e.target.closest('.add-to-cart')) {
    const productName = e.target.closest('.add-to-cart').dataset.product;
    addToCart(productName);
  }
  if (e.target.closest('.add-compare')) {
    const productName = e.target.closest('.add-compare').dataset.product;
    const product = products.find(p => p.name === productName);
    if (!product) return;
    let compareList = JSON.parse(localStorage.getItem('compare')) || [];
    if (compareList.some(p => p.name === productName)) {
      alert('Product already added to comparison.');
      return;
    }
    compareList.push(product);
    localStorage.setItem('compare', JSON.stringify(compareList));
    alert(`✅ ${productName} added to comparison!`);
  }
});

document.addEventListener("DOMContentLoaded", async function() {
    console.log("Products page loaded");
    try {
        const toastEl = document.getElementById('toast');
        if (toastEl) {
            console.log("Initializing toast...");
            window.toast = {
                element: toastEl,
                show: function(message, type = 'success') {
                    const messageEl = this.element.querySelector('.toast-message');
                    if (messageEl) {
                        messageEl.textContent = message;
                    }
                    this.element.classList.remove('success', 'error', 'info');
                    this.element.classList.add(type);
                    this.element.classList.add('show');
                    setTimeout(() => {
                        this.element.classList.remove('show');
                    }, 5000);
                }
            };
        }
        const loadingEl = document.querySelector('.loading');
        if (loadingEl) {
            window.showLoading = function() {
                loadingEl.classList.remove('d-none');
            };
            window.hideLoading = function() {
                loadingEl.classList.add('d-none');
            };
        }
        const style = document.createElement('style');
        style.textContent = `
            .pagination-container {
                margin-top: 2rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            .pagination {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .pagination-numbers {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .pagination-btn {
                padding: 0.5rem 1rem;
                border: 1px solid var(--primary-color);
                background: #fff;
                color: var(--primary-color);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .pagination-btn:hover:not(:disabled) {
                background: var(--primary-color);
                color: #fff;
            }
            .pagination-btn.active {
                background: var(--primary-color);
                color: #fff;
            }
            .pagination-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .pagination-dots {
                color: var(--primary-color);
            }
            .pagination-info {
                color: var(--primary-color);
                font-size: 0.9rem;
            }
        `;
        document.head.appendChild(style);
        console.log("Fetching categories and products...");
        fetchCategories();
        await fetchProducts();
        await fetchWishlist();
        updateWishlistUI();
        updateFavCount();
        const params = new URLSearchParams(window.location.search);
        const urlCategory = params.get('category');
        if (urlCategory) {
            console.log(`Category from URL: ${urlCategory}`);
            setTimeout(() => {
                let matchedBtn = Array.from(document.querySelectorAll('.filter-btn')).find(
                    btn => btn.dataset.category && 
                           btn.dataset.category.trim().toLowerCase() === urlCategory.trim().toLowerCase()
                );
                if (!matchedBtn) {
                    matchedBtn = Array.from(document.querySelectorAll('.filter-btn')).find(
                        btn => {
                            if (!btn.dataset.category) return false;
                            const btnCategory = btn.dataset.category.trim().toLowerCase();
                            const searchCategory = urlCategory.trim().toLowerCase();
                            return btnCategory.includes(searchCategory) || searchCategory.includes(btnCategory);
                        }
                    );
                }
                if (!matchedBtn) {
                    matchedBtn = document.querySelector('.filter-btn[data-category="all"]');
                    console.log("No matching category found, showing all products");
                } else {
                    console.log(`Matched category: ${matchedBtn.dataset.category}`);
                }
                if (matchedBtn) {
                    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                    matchedBtn.classList.add('active');
                    currentPage = 1;
                    filterAndSortProducts();
                }
            }, 300);
        }
    } catch (error) {
        console.error("Error during initialization:", error);
        showToast("Error initializing page: " + error.message, 'error');
    }
});

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;
    const messageEl = toastEl.querySelector('.toast-message');
    if (messageEl) {
        messageEl.textContent = message;
    }
    toastEl.classList.remove('success', 'error', 'info');
    toastEl.classList.add(type);
    toastEl.classList.add('show');
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 5000);
    if (window.toast && typeof window.toast.show === 'function') {
        try {
            window.toast.show(message, type);
        } catch (e) {
            console.log('Custom toast display fallback used');
        }
    }
}
