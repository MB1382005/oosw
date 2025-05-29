
window.setActiveNavLink = window.setActiveNavLink || function() {
  console.log('setActiveNavLink fallback implementation called');
  try {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'home2.html';
    
    document.querySelectorAll('nav a, .nav-link, .navbar a').forEach(link => {
      link.classList.remove('active');
      
      const href = link.getAttribute('href');
      if (href && (href === currentPage || href.endsWith('/' + currentPage))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  } catch (error) {
    console.error('Error in fallback setActiveNavLink:', error);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('Product detail fix script loaded - attaching event listeners');
  
  window.addToFavorites = function() {
    console.log('Original addToFavorites function called - using our fixed version instead');
    handleAddToFavorites();
    return false; 
  };
  
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  
  const favButton = document.querySelector('.add-fav');
  if (favButton) {
    console.log('Found favorites button, attaching click handler');
    
    favButton.removeAttribute('onclick');
    
    favButton.addEventListener('click', handleAddToFavorites);
  } else {
    console.error('Favorites button not found in the DOM');
    
    setTimeout(() => {
      const delayedFavButton = document.querySelector('.add-fav');
      if (delayedFavButton) {
        console.log('Found favorites button on delayed check, attaching click handler');
        delayedFavButton.removeAttribute('onclick');
        delayedFavButton.addEventListener('click', handleAddToFavorites);
      }
    }, 1000);
  }
  
  const cartButton = document.querySelector('.add-cart');
  if (cartButton) {
    console.log('Found cart button, attaching click handler');
    
    cartButton.removeAttribute('onclick');
    
    cartButton.addEventListener('click', handleAddToCart);
  } else {
    console.error('Cart button not found in the DOM');
    
    setTimeout(() => {
      const delayedCartButton = document.querySelector('.add-cart');
      if (delayedCartButton) {
        console.log('Found cart button on delayed check, attaching click handler');
        delayedCartButton.removeAttribute('onclick');
        delayedCartButton.addEventListener('click', handleAddToCart);
      }
    }, 1000);
  }
  
  function handleAddToFavorites(event) {
    if (event) event.preventDefault();
    console.log('Add to favorites button clicked via event listener');
    
    if (!productId) {
      console.error('Product ID not found in URL parameters');
      showToast('Cannot identify product', 'error');
      return;
    }
    
    showToast('Adding to favorites...', 'info');
    console.log(`Sending request to add product ID ${productId} to favorites`);
    
    fetch('/oop/manage_login/check_login.php')
      .then(response => response.text())
      .then(text => {
        let loginData;
        try {
          loginData = JSON.parse(text);
        } catch (e) {
          const match = text.match(/\{"loggedIn":(true|false)[^}]*\}/);
          if (match) {
            loginData = JSON.parse(match[0]);
          } else {
            throw new Error('Invalid login response format');
          }
        }
        
        if (!loginData || !loginData.loggedIn) {
          showToast('Please log in to add favorites', 'error');
          setTimeout(() => {
            window.location.href = '/oop/home/html/login.html?redirect=' + encodeURIComponent(window.location.href);
          }, 1500);
          return;
        }
        
        const requestBody = { 
          product_id: productId,
          action: "add",
          timestamp: new Date().getTime()
        };
        
        console.log('Sending wishlist request with payload:', requestBody);
        
        return fetch('/oop/add_to_wishlist.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify(requestBody)
        });
      })
      .then(response => {
        if (!response) return null;
        return response.text();
      })
      .then(text => {
        if (!text) return;
        
        console.log('Raw wishlist response:', text);
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('JSON parsing error:', parseError);
          
          const successMatch = text.match(/\{"success":true[^}]*\}/);
          const errorMatch = text.match(/\{"success":false,"message":"[^"]*"\}/);
          
          if (successMatch) {
            data = JSON.parse(successMatch[0]);
          } else if (errorMatch) {
            data = JSON.parse(errorMatch[0]);
          } else {
            showToast('Error adding to favorites: Invalid response', 'error');
            return;
          }
        }
        
        if (data && (data.success || data.message === 'Product already in wishlist')) {
          showToast('Product added to favorites!', 'success');
          
          const favButton = document.querySelector('.add-fav');
          if (favButton) {
            favButton.innerHTML = '<i class="fas fa-heart"></i> Added to Favorites';
            favButton.classList.add('added');
            
            favButton.removeEventListener('click', handleAddToFavorites);
          }
          
          updateFavCount();
        } else {
          if (data && data.message && data.message.includes('not logged in')) {
            showToast('Please log in to add favorites', 'error');
            setTimeout(() => {
              window.location.href = '/oop/home/html/login.html?redirect=' + encodeURIComponent(window.location.href);
            }, 1500);
          } else {
            const errorMessage = data && data.message ? data.message : 'Failed to add to favorites';
            showToast(errorMessage, 'error');
            console.error('Server returned error:', data);
            
            addToLocalFavorites(productId);
          }
        }
      })
      .catch(error => {
        console.error('Error adding to favorites:', error);
        showToast('Network error adding to favorites', 'error');
        
        addToLocalFavorites(productId);
      });
  }
  
  function addToLocalFavorites(productId) {
    try {
      const productName = document.querySelector('.product-name').textContent;
      const productPrice = document.querySelector('.price').textContent.replace('SAR', '').trim();
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      
      if (!favorites.some(p => p.id === productId)) {
        favorites.push({
          id: productId,
          name: productName,
          price: productPrice,
          added_at: new Date().toISOString()
        });
        localStorage.setItem('favorites', JSON.stringify(favorites));
        showToast('Added to offline favorites', 'success');
      }
    } catch (e) {
      console.error('Error adding to local storage:', e);
    }
  }
  
  function handleAddToCart(event) {
    if (event) event.preventDefault();
    console.log('Add to cart button clicked via event listener');
    
    if (!productId) {
      showToast('Product ID not found', 'error');
      return;
    }
    
    const productName = document.querySelector('.product-name').textContent;
    
    showToast('Adding to cart...', 'info');
    
    fetch('/oop/cart/add_to_cart.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId })
    })
    .then(response => response.text())
    .then(text => {
      console.log('Raw cart response:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        
        const successMatch = text.match(/\{"success":true,"product_name":"[^"]*"\}/);
        const errorMatch = text.match(/\{"success":false,"message":"[^"]*"\}/);
        
        if (successMatch) {
          data = JSON.parse(successMatch[0]);
        } else if (errorMatch) {
          data = JSON.parse(errorMatch[0]);
        } else {
          showToast('Error adding to cart: Invalid response', 'error');
          return;
        }
      }
      
      if (data && data.success) {
        showToast(`${data.product_name || productName} added to cart!`, 'success');
        
        const cartButton = document.querySelector('.add-cart');
        if (cartButton) {
          cartButton.innerHTML = '<i class="fas fa-check"></i> Added to Cart';
          cartButton.classList.add('added');
          
          setTimeout(() => {
            cartButton.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
            cartButton.classList.remove('added');
          }, 3000);
        }
      } else {
        const errorMessage = data && data.message ? data.message : 'Failed to add to cart';
        showToast(errorMessage, 'error');
      }
    })
    .catch(error => {
      console.error('Error adding to cart:', error);
      showToast('Network error adding to cart', 'error');
    });
  }
  
  window.addToCart = function(productName) {
    handleAddToCart(null);
  };
  
  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const messageElement = toast.querySelector('.toast-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
    
    toast.className = 'toast ' + type;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  function updateFavCount() {
    const favCountElement = document.getElementById('favCount');
    if (favCountElement) {
      fetch('/oop/get_wishlist.php')
        .then(response => response.text())
        .then(text => {
          try {
            const match = text.match(/\{"success":true,"message":"[^"]*","wishlist":\[.*?\],"user_id":\d+,"count":\d+,"timestamp":\d+\}/);
            if (match) {
              const data = JSON.parse(match[0]);
              favCountElement.textContent = data.count || '0';
            }
          } catch (error) {
            console.error('Error updating favorites count:', error);
          }
        })
        .catch(error => {
          console.error('Network error updating favorites count:', error);
        });
    }
  }

  const reviewsList = document.querySelector('.reviews-list');
  
  if (reviewsList) {
    window.addEventListener('error', (event) => {
      if (event.error && event.error.message && event.error.message.includes('reviews')) {
        if (reviewsList.querySelector('.reviews-loading')) {
          reviewsList.innerHTML = `
            <div class="review-error">
              <i class="fas fa-exclamation-circle"></i>
              <p>Reviews could not be loaded at this time.</p>
            </div>
          `;
        }
      }
    });
    
    setTimeout(() => {
      if (reviewsList.querySelector('.reviews-loading')) {
        reviewsList.innerHTML = `
          <div class="no-reviews">
            <i class="fas fa-comment-slash"></i>
            <p>No reviews yet. Be the first to review this product!</p>
          </div>
        `;
      }
    }, 5000);
  }
}); 
