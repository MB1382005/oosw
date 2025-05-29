// Globals
let allProducts = [];
let isLoggedIn = false; 
let currentView = 'grid'; 

// Update the favorites count in the UI
function updateFavCount() {
  const favCountEl = document.getElementById('favCount');
  const favCountLabel = document.getElementById('favCountLabel');
  
  if (!favCountEl && !favCountLabel) return;
  
  fetchWishlist().then(wishlist => {
    const count = wishlist ? wishlist.length : 0;
    if (favCountEl) favCountEl.textContent = count;
    if (favCountLabel) favCountLabel.textContent = count;
  });
}

// Check if user is logged in
async function checkLoginStatus() {
  try {
    const response = await fetch('/oop/manage_login/check_login.php');
    const data = await response.json();
    isLoggedIn = data.loggedIn === true;
    return isLoggedIn;
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
}

// Fetch wishlist from server if logged in
async function fetchWishlist() {
  try {
    // Check login status first
    const loginResponse = await fetch('/oop/manage_login/check_login.php');
    const loginData = await loginResponse.json();
    isLoggedIn = loginData.loggedIn === true;
    
    // If not logged in, return local storage data
    if (!isLoggedIn) {
      console.log('User not logged in, using localStorage wishlist');
      return JSON.parse(localStorage.getItem('favorites')) || [];
    }
    
    console.log('User logged in, fetching server wishlist');
    const response = await fetch('/oop/get_wishlist.php');
    
    if (!response.ok) {
      console.warn('HTTP error getting wishlist:', response.status);
      return JSON.parse(localStorage.getItem('favorites')) || [];
    }
    
    const responseText = await response.text();
    console.log('Raw wishlist response:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      
      if (data.success && Array.isArray(data.wishlist)) {
        console.log('Server wishlist fetched:', data.wishlist.length, 'items');
        // Sync with localStorage
        localStorage.setItem('favorites', JSON.stringify(data.wishlist));
        return data.wishlist;
      } else {
        console.warn('Server returned error fetching wishlist:', data.message);
        return JSON.parse(localStorage.getItem('favorites')) || [];
      }
    } catch (parseError) {
      console.error('Error parsing wishlist response:', parseError);
      return JSON.parse(localStorage.getItem('favorites')) || [];
    }
  } catch (error) {
    console.error('Error in fetchWishlist:', error);
    return JSON.parse(localStorage.getItem('favorites')) || [];
  }
}

// Fetch all products to have access to the complete product data
async function fetchAllProducts() {
  try {
    // Show loading spinner
    toggleLoadingSpinner(true);

    const response = await fetch('/oop/manger_panel/GetProducts.php');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.status === 'success') {
      allProducts = data.products || [];
      console.log('Products fetched successfully, count:', allProducts.length);
      await renderFavorites();
    } else {
      console.error('Error fetching products:', data.message);
      showToast('Error loading product data', 'error');
    }
    
    // Hide loading spinner
    toggleLoadingSpinner(false);
  } catch (error) {
    console.error('Error in fetchAllProducts:', error);
    showToast('Error connecting to product database', 'error');
    toggleLoadingSpinner(false);
  }
}

// Toggle loading spinner visibility
function toggleLoadingSpinner(show) {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.style.display = show ? 'block' : 'none';
  }
}

// Toggle between grid and list view
function toggleView(viewType) {
  if (viewType !== 'grid' && viewType !== 'list') return;
  
  currentView = viewType;
  
  // Update buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewType);
  });
  
  // Update container class
  const container = document.getElementById('favoritesContainer');
  if (container) {
    if (viewType === 'list') {
      container.classList.add('list-view');
    } else {
      container.classList.remove('list-view');
    }
  }
}

// Render the list of favorite products
async function renderFavorites() {
  try {
    const container = document.getElementById('favoritesContainer');
    const noFavoritesMessage = document.getElementById('noFavoritesMessage');
    
    if (!container) {
      console.log('Favorites container not found - skipping render');
      return;
    }
    
    // Get favorites based on login status
    const favorites = await fetchWishlist();
    
    // Clear container
    container.innerHTML = '';
    
    // Show/hide appropriate elements based on favorites count
    if (favorites.length === 0) {
      if (noFavoritesMessage) noFavoritesMessage.style.display = 'block';
      container.style.display = 'none';
      return;
    } else {
      if (noFavoritesMessage) noFavoritesMessage.style.display = 'none';
      container.style.display = 'grid'; // Default to grid, will be changed if in list view
    }
    
    // Apply current view
    toggleView(currentView);
    
    // Get complete product data for each favorite
    favorites.forEach(favProduct => {
      // Find the complete product data from allProducts
      const fullProduct = allProducts.find(p => p.id === favProduct.id) || favProduct;
      
      // Use the most complete data available
      const product = {...favProduct, ...fullProduct};
      
      // Create rating stars display
      const stars = `<span class="stars">${'★'.repeat(product.rating || 0)}${'☆'.repeat(5 - (product.rating || 0))}</span>`;
      
      // Get appropriate image URL
      const imageUrl = getProductImage(product);
      
      // Create product card
      const div = document.createElement('div');
      div.className = 'favorite-card';
      div.innerHTML = `
        <img src="${imageUrl}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/320x180?text=No+Image'">
        <div class="favorite-card-content">
          <h3>${product.name}</h3>
          <div class="price">${parseFloat(product.price).toFixed(2)} EGP</div>
          ${stars}
          <p class="product-category">${product.category_name || 'General'}</p>
          <div class="action-buttons">
            <button class="view-details" data-id="${product.id}">
              <i class="fas fa-eye"></i> View Details
            </button>
            <button class="add-to-cart" data-id="${product.id}">
              <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
            <button class="remove-fav" data-id="${product.id}">
              <i class="fas fa-trash"></i> Remove
            </button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
    
    // Add event listeners to buttons
    addEventListeners();
    
  } catch (error) {
    console.error('Error in renderFavorites:', error);
    showToast('Error displaying favorites', 'error');
  }
}

// Get appropriate product image URL
function getProductImage(product) {
  if (!product) return 'https://via.placeholder.com/320x180?text=No+Image';
  
  // Try different possible image properties
  let imgUrl = product.img || product.image_url || product.image;
  
  // If imgUrl exists but doesn't start with http or /, add a path
  if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
    imgUrl = `/oop/images/${imgUrl}`;
  }
  
  return imgUrl || 'https://via.placeholder.com/320x180?text=No+Image';
}

// Add event listeners to the favorite cards buttons
function addEventListeners() {
  // View details buttons
  document.querySelectorAll('.view-details').forEach(btn => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.id;
      window.location.href = `product_detail.html?id=${productId}`;
    });
  });
  
  // Add to cart buttons
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', async () => {
      const productId = btn.dataset.id;
      await addToCart(productId);
    });
  });
  
  // Remove from favorites buttons
  document.querySelectorAll('.remove-fav').forEach(btn => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.id;
      removeFromFavorites(productId);
    });
  });
  
  // Add listeners to view toggle buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleView(btn.dataset.view);
    });
  });
}

// Remove a product from favorites
async function removeFromFavorites(productId) {
  try {
    if (isLoggedIn) {
      // Show loading spinner
      toggleLoadingSpinner(true);
      
      // Remove from database
      const response = await fetch('/oop/remove_from_wishlist.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: productId })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        showToast(data.message || 'Error removing product from favorites', 'error');
        toggleLoadingSpinner(false);
        return;
      }
    } else {
      // Remove from localStorage
      let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
      favorites = favorites.filter(p => p.id !== productId);
      localStorage.setItem('favorites', JSON.stringify(favorites));
    }
    
    showToast('Product removed from favorites', 'success');
    
    // Update the UI
    await renderFavorites();
    updateFavCount();
    
    toggleLoadingSpinner(false);
  } catch (error) {
    console.error('Error removing from favorites:', error);
    showToast('Error removing product', 'error');
    toggleLoadingSpinner(false);
  }
}

// Add product to cart
async function addToCart(productId) {
  if (!productId) {
    showToast('Invalid product', 'error');
    return;
  }
  
  try {
    const response = await fetch('/oop/add_to_cart.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId })
    });
    
    // Get response as text first
    const responseText = await response.text();
    console.log('Raw cart response:', responseText);
    
    let data;
    // Try to extract valid JSON using pattern matching
    const successMatch = responseText.match(/\{"success":true,"product_name":"[^"]*"\}/);
    const errorMatch = responseText.match(/\{"success":false,"message":"[^"]*"\}/);
    
    if (successMatch) {
      data = JSON.parse(successMatch[0]);
      showToast(`${data.product_name} added to cart successfully`, 'success');
    } else if (errorMatch) {
      data = JSON.parse(errorMatch[0]);
      showToast(data.message || 'Failed to add to cart', 'error');
    } else {
      throw new Error('Invalid server response');
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    showToast('Error connecting to server', 'error');
  }
}

function showToast(message, type = 'success') {
  if (document.querySelector('.toast-notification')) {
    document.querySelector('.toast-notification').remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Initializing favorites page...');
    
    toggleLoadingSpinner(true);
    
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleView(btn.dataset.view));
    });
    
    isLoggedIn = await checkLoginStatus();
    console.log('User login status:', isLoggedIn ? 'Logged in' : 'Not logged in');
    
    await fetchAllProducts();
    
    updateFavCount();
  } catch (error) {
    console.error('Error initializing favorites:', error);
    showToast('Error initializing page', 'error');
    toggleLoadingSpinner(false);
  }
});

window.addEventListener('favoritesUpdated', async () => {
  await renderFavorites();
  updateFavCount();
});