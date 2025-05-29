async function addToCart(productId) {
  if (!productId) {
    console.error('No product ID provided');
    return;
  }

  try {
    const response = await fetch('../../cart/add_to_cart.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId })
    });

    const result = await response.json();
    if (result.success) {
      alert(`✅ ${result.product_name} added to cart!`);
      loadCartItems();
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Error in addToCart:', error);
    alert('Failed to add 222item to cart');
  }
}

async function loadCartItems() {
  console.log('Loading cart items...');
  try {
    const response = await fetch('../../cart/get_cart.php');
    console.log('Cart response:', response);
    const cartItems = await response.json();
    console.log('Cart items:', cartItems);
    
    const container = document.querySelector('.cart-container');
    if (!container) {
      console.error('Cart container not found!');
      return;
    }
    console.log('Found cart container');
    
    container.innerHTML = '';

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      container.innerHTML = "<p style='text-align:center; font-size:18px;'>🛒 Your cart is empty.</p>";
      return;
    }

    let total = 0;
    cartItems.forEach(item => {
      const cartItem = document.createElement('div');
      cartItem.classList.add('cart-item');
      cartItem.innerHTML = `
        <img src="${item.image_url}" alt="${item.name}" />
        <div class="item-info">
          <h3>${item.name}</h3>
          <p>${item.category_name}</p>
        </div>
        <div class="quantity">
          <input type="number" 
                 value="${item.quantity}" 
                 min="1" 
                 data-product-id="${item.id}"
                 onchange="updateQuantity(${item.id}, this.value)">
        </div>
        <div class="price">${item.price} EGP</div>
        <button class="remove-btn" onclick="removeItem(${item.id})">Remove</button>
      `;
      container.appendChild(cartItem);
      total += item.price * item.quantity;
    });

    const totalElement = document.getElementById('total-amount');
    if (totalElement) {
      totalElement.textContent = total.toFixed(2);
    }
  } catch (error) {
    console.error('Error loading cart:', error);
  }
}

async function updateQuantity(productId, quantity) {
  try {
    const response = await fetch('../../cart/update_cart.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        quantity: quantity
      })
    });
    
    const result = await response.json();
    if (!result.success) {
      alert(result.message);
      return;
    }
    loadCartItems();
  } catch (error) {
    console.error('Error:', error);
  }
}

async function removeItem(productId) {
  try {
    const response = await fetch('../../cart/remove_from_cart.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: productId })
    });
    
    const result = await response.json();
    if (result.success) {
      loadCartItems();
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function updateStorageQuantity(name, quantity) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const item = cart.find(i => i.name === name);
  if (item) item.quantity = quantity;
  localStorage.setItem('cart', JSON.stringify(cart));
}

function checkIfCartEmpty() {
  if (document.querySelectorAll('.cart-item').length === 0) {
    document.querySelector('.cart-container').innerHTML = "<p style='text-align:center; font-size:18px;'>🛒 Your cart is empty.</p>";
    localStorage.removeItem('cart');
  }
}



function updateCartCount(count) {
  const cartCount = document.getElementById('cartCount');
  if (cartCount) {
    cartCount.textContent = count;
  }
}

function generateOrderNumber(orders) {
  const last = orders.length > 0 ? parseInt(orders[orders.length - 1].orderNumber) : 123;
  return String(last + 1).padStart(5, '0');
}
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
  } else {
  }
}

async function checkout() {
  try {
    let address = '';
    let phone = '';
    
    const response = await fetch('../process_checkout.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, phone })
    });

    const result = await response.json();
    
    if (result.needsInfo) {
      address = prompt('Please enter your delivery address:');
      if (!address) {
        showCustomMessage('Address is required to complete the order.', 'error');
        return;
      }

      phone = prompt('Please enter your phone number:');
      if (!phone) {
        showCustomMessage('Phone number is required to complete the order.', 'error');
        return;
      }

      const retryResponse = await fetch('../process_checkout.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, phone })
      });

      const retryResult = await retryResponse.json();
      if (retryResult.success) {
        window.location.href = '../html/order.html';
      } else {
        alert(retryResult.message || 'An error occurred while completing the request.');
      }
    } else if (result.success) {
      window.location.href = '../html/order.html';
    } else {
      alert(result.message || 'An error occurred while completing the request.');
    }
  } catch (error) {
    console.error('Error during checkout:', error);
    alert('An error occurred while completing your request. Please try again.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, initializing cart...');
  loadCartItems();
  updateCartCount();
  updateFavCount();
});