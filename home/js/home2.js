function setActiveNavLink() {
    try {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'home2.html';
        
        const navLinks = document.querySelectorAll('nav a, .nav-link, .navbar a');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            
            const href = link.getAttribute('href');
            if (href && (href === currentPage || href.endsWith('/' + currentPage))) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
    } catch (error) {
        console.error('Error setting active nav link:', error);
    }
}

window.setActiveNavLink = setActiveNavLink;



const scrollTopBtn = document.getElementById('scrollTop');
const searchInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-btn');
const resultsDiv = document.getElementById('search-results');
const sliderContainer = document.getElementById('sliderContainer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const slides = document.querySelectorAll('.slide');
const adminLink = document.querySelector('a[href="admin.html"]');
const burgerMenu = document.getElementById("burgerMenu");
const mainNav = document.getElementById("mainNav");

let homeCategories = [];
let currentSlide = 0;
let sliderInterval;

function fetchCategories() {
  fetch("/oop/classes/Category.php?action=all")
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') === -1) {
        console.warn('Response is not JSON, might be an error page:', contentType);
      }
      return response.text().then(text => {
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error('JSON parse error:', e);
          console.error('Raw response:', text);
          throw new Error('Invalid JSON response');
        }
      });
    })
    .then(data => {
      if (Array.isArray(data)) {
        homeCategories = data;
        renderCategoriesGrid();
      } else {
        console.error("Error fetching categories: Invalid data format", data);
        showCategoriesError();
      }
    })
    .catch(error => {
      console.error("Error fetching categories:", error);
      showCategoriesError();
    });
}

function renderCategoriesGrid() {
  const categoriesGrid = document.querySelector('.categories-grid');
  if (!categoriesGrid) return;
  
  const loadingIndicator = categoriesGrid.querySelector('.categories-loading');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
  
  categoriesGrid.innerHTML = '';
  
  homeCategories.forEach(category => {
    const icon = getCategoryIcon(category.name);
    
    const categoryCard = document.createElement('a');
    categoryCard.className = 'category-card';
    categoryCard.href = `product.html?category=${encodeURIComponent(category.name)}`;
    categoryCard.innerHTML = `
      <i class="${icon}"></i>
      <span>${category.name}</span>
    `;
    categoriesGrid.appendChild(categoryCard);
  });
}

function showCategoriesError() {
  const categoriesGrid = document.querySelector('.categories-grid');
  if (!categoriesGrid) return;
  
  categoriesGrid.innerHTML = `
    <div class="categories-error">
      <i class="fas fa-exclamation-triangle"></i>
      <p>Failed to load categories. Please try again later.</p>
    </div>
  `;
}

function getCategoryIcon(categoryName) {
  const categoryIcons = {
    'Antibiotics': 'fa-solid fa-bacterium',
    'Pain Relievers / Antipyretics': 'fa-solid fa-tablets',
    'Digestive System': 'fa-solid fa-pills',
    'Nervous System': 'fa-brands fa-monero',
    'Cardiovascular': 'fa-solid fa-heart-pulse',
    'Diabetes': 'fa-brands fa-superpowers',
    'Dermatology / Allergy': 'fa-solid fa-hand-dots',
    'Nutritional supplements': 'fa-brands fa-mandalorian',
    'Hair care': 'fa-brands fa-hackerrank'
  };

  return categoryIcons[categoryName] || 'fa-solid fa-capsules';
}

function checkAdminStatus() {
        console.log('Checking admin status...');
        fetch('../../classes/checkAdmin.php')
            .then(response => {
                console.log('OK - Fetch successful');
            return response.text();
        })
        .then(text => {
            const trimmed = text.trim();
            console.log('Raw admin check text:', trimmed);
            
            try {
                return JSON.parse(trimmed);
            } catch (e) {
                console.error('JSON parse error:', e);
                
                const matches = trimmed.match(/(\{.*\})/g);
                if (matches && matches.length > 0) {
                    for (const match of matches) {
                        try {
                            const parsed = JSON.parse(match);
                            if (parsed && typeof parsed === 'object') {
                                console.log('Found valid JSON in admin check:', match);
                                return parsed;
                            }
                        } catch (matchError) {
                        }
                    }
                }
                
                return { 
                    success: false, 
                    message: 'Failed to parse admin check response',
                    debug: { raw_response: text }
                };
            }
            })
            .catch(error => {
                console.error('Failed to load admin check file:', error);
                return { success: false, message: 'Failed to load admin check file' };
            })
        .then(data => {
            console.log('Admin check data:', JSON.stringify(data, null, 2));
            if (adminLink) {
                console.log('Admin link found, setting display:', (data.success && data.is_admin) ? 'block' : 'none');
                adminLink.style.display = (data.success && data.is_admin) ? 'block' : 'none';
            } else {
                console.log('Admin link not found in DOM');
            }
        })
        .catch(error => {
            console.error('Error checking admin status:', error);
            if (adminLink) {
                adminLink.style.display = 'none';
            }
        });  
}

function addSearchStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background-color: #fff;
      border-radius: 0 0 4px 4px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 100;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .loading, .no-results, .error {
      padding: 12px;
      text-align: center;
      color: #666;
    }
    
    .error {
      color: #e53935;
    }
    
    .result-item {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .result-item:hover {
      background-color: #f5f5f5;
    }
    
    .result-item strong {
      color: #333;
    }
    
    .result-item .price {
      color: #4CAF50;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);
}


function handleSearch(query) {
  if (!query.trim()) {
    resultsDiv.innerHTML = '';
    return;
  }

  const filtered = products.filter(product =>
    product.name && product.name.toLowerCase().includes(query.toLowerCase())
  );

  resultsDiv.innerHTML = filtered.length === 0 
    ? '<p class="no-results">No results found</p>'
    : `<div class="results">` + filtered.slice(0, 7).map(med => 
        `<div class="result-item" data-id="${med.id}">
          <strong>${med.name}</strong>
          <span class="price">${med.price} جنيه</span>
         </div>`
      ).join('') + `</div>`;

  document.querySelectorAll('.result-item').forEach(item => {
    item.addEventListener('click', () => {
      window.location.href = `../html/product_detail.html?id=${item.dataset.id}`;
    });
  });
}

function handleScroll() {
  const scrolled = window.scrollY;
  if (scrollTopBtn) {
    scrollTopBtn.style.display = scrolled > 500 ? 'block' : 'none';
  }
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function showSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === index);
    slide.setAttribute('aria-hidden', i !== index);
  });
}

function nextSlide() {
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
}

function prevSlide() {
  currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  showSlide(currentSlide);
}

function startSlider() {
  sliderInterval = setInterval(nextSlide, 5000);
}

function stopSlider() {
  clearInterval(sliderInterval);
}


function renderCategories(categories) {
  const grid = document.querySelector('.categories-grid');
  if (!grid) return;
  
  grid.innerHTML = categories.map(cat => 
    `<a href="${cat.link}" class="category-card">
      <i class="${cat.icon}"></i>
      <span>${cat.name}</span>
     </a>`
  ).join('');
}

// Update favorites count
function updateFavoritesCount() {
  const favCountEls = document.querySelectorAll('.fav-count');
  if (favCountEls.length === 0) return;
  
  try {
    // Try to get from localStorage first
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    favCountEls.forEach(el => {
      el.textContent = favorites.length;
    });
    
    // If available, try to fetch from server too (for logged in users)
    fetch('/oop/get_wishlist.php')
      .then(response => {
        if (!response.ok) return null;
        return response.text();
      })
      .then(text => {
        if (!text) return null;
        
        try {
          // First try parsing the whole response
          const data = JSON.parse(text.trim());
          if (data && data.success && Array.isArray(data.wishlist)) {
            favCountEls.forEach(el => {
              el.textContent = data.wishlist.length;
            });
          }
        } catch (e) {
          console.error('Error parsing wishlist JSON:', e);
          // Try to extract valid JSON
          const matches = text.match(/(\{.*\})/g);
          if (matches && matches.length > 0) {
            // Try each match
            for (const match of matches) {
              try {
                const data = JSON.parse(match);
                if (data && data.success && Array.isArray(data.wishlist)) {
                  console.log('Found valid wishlist JSON:', match);
                  favCountEls.forEach(el => {
                    el.textContent = data.wishlist.length;
                  });
                  break;
                }
              } catch (matchError) {
                // Continue to next match
              }
            }
          }
        }
      })
      .catch(error => {
        console.error('Error fetching wishlist:', error);
      });
  } catch (e) {
    console.error('Error updating favorites count:', e);
    favCountEls.forEach(el => {
      el.textContent = '0';
    });
  }
}

function addToFavorites(item) {
  try {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const exists = favorites.some(fav => fav.id === item.id);

    if (!exists) {
      favorites.push(item);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      updateFavoritesCount();
      showNotification('Added to favorites!', 'success');
    } else {
      showNotification('Already in favorites', 'info');
    }
  } catch (error) {
    console.error('Error managing favorites:', error);
    showNotification('Error adding to favorites', 'error');
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }, 100);
}

// دالة مخصصة لتهيئة قائمة البرجر في جميع الصفحات
function initializeBurgerMenu() {
    console.log('Initializing burger menu on this page...');
    
    // البحث عن العناصر باستخدام طرق متعددة للعثور عليها
    const burgerOptions = ['#burgerMenu', '.burger-menu', '[id*="burger"]', '.navbar .fa-bars', '[class*="burger"]'];
    const navOptions = ['#moreNav', '.more-nav', '.mobile-nav', '.responsive-menu', '.side-menu'];
    
    let burger = null;
    let moreNav = null;
    
    // البحث عن عنصر البرجر باستخدام محددات مختلفة
    for (const selector of burgerOptions) {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`Found burger menu with selector: ${selector}`);
            burger = element;
            break;
        }
    }
    
    // البحث عن عنصر القائمة باستخدام محددات مختلفة
    for (const selector of navOptions) {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`Found nav menu with selector: ${selector}`);
            moreNav = element;
            break;
        }
    }
    
    // إذا لم يتم العثور على زر البرجر، قم بإنشائه
    if (!burger) {
        console.log('Creating burger menu button as it was not found');
        burger = document.createElement('div');
        burger.id = 'burgerMenu';
        burger.className = 'burger-menu';
        burger.innerHTML = '<i class="fas fa-bars"></i>';
        burger.style.position = 'fixed';
        burger.style.top = '20px';
        burger.style.right = '20px';
        burger.style.zIndex = '1000';
        burger.style.cursor = 'pointer';
        burger.style.fontSize = '24px';
        burger.style.color = '#333';
        burger.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        burger.style.padding = '10px';
        burger.style.borderRadius = '5px';
        burger.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        const navbar = document.querySelector('.navbar, header, .nav-content');
        if (navbar) {
            navbar.appendChild(burger);
        } else {
            document.body.appendChild(burger);
        }
    }
    
    if (!moreNav) {
        console.log('Creating side navigation menu as it was not found');
        moreNav = document.createElement('nav');
        moreNav.id = 'moreNav';
        moreNav.className = 'more-nav';
        moreNav.style.position = 'fixed';
        moreNav.style.top = '0';
        moreNav.style.right = '-250px';
        moreNav.style.width = '250px';
        moreNav.style.height = '100vh';
        moreNav.style.backgroundColor = '#fff';
        moreNav.style.boxShadow = '-2px 0 5px rgba(0,0,0,0.1)';
        moreNav.style.zIndex = '999';
        moreNav.style.transition = 'right 0.3s ease';
        moreNav.style.padding = '60px 20px 20px';
        moreNav.style.display = 'flex';
        moreNav.style.flexDirection = 'column';
        moreNav.style.overflowY = 'auto';
        
        // إنشاء روابط القائمة
        const menuLinks = [
            { href: 'home2.html', icon: 'fas fa-home', text: 'Home' },
            { href: 'product.html', icon: 'fas fa-capsules', text: 'Products' },
            { href: 'cart.html', icon: 'fas fa-shopping-cart', text: 'Cart' },
            { href: 'about.html', icon: 'fas fa-info-circle', text: 'About' },
            { href: 'favorites.html', icon: 'fas fa-heart', text: 'Favorites' },
            { href: 'compare.html', icon: 'fas fa-balance-scale', text: 'Compare' },
            { href: 'profile.html', icon: 'fas fa-user', text: 'My Profile' },
            { href: '../../classes/logout.php', icon: 'fas fa-sign-out-alt', text: 'Logout' }
        ];
        
        menuLinks.forEach(link => {
            const a = document.createElement('a');
            a.href = link.href;
            a.className = 'nav-link';
            a.innerHTML = `<i class="${link.icon}"></i> ${link.text}`;
            a.style.padding = '10px 0';
            a.style.color = '#333';
            a.style.textDecoration = 'none';
            a.style.borderBottom = '1px solid #eee';
            a.style.display = 'block';
            moreNav.appendChild(a);
        });
        
        document.body.appendChild(moreNav);
        
        const style = document.createElement('style');
        style.innerHTML = `
            .more-nav.active {
                right: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    if (burger && moreNav) {
        console.log('Adding click events to burger menu');
        
        const logoutLink = moreNav.querySelector('a[href*="logout.php"]');
        if (!logoutLink) {
            console.log('Adding logout link to navigation');
            const logoutAnchor = document.createElement('a');
            logoutAnchor.href = '../../classes/logout.php';
            logoutAnchor.className = 'nav-link';
            logoutAnchor.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            logoutAnchor.style.padding = '10px 0';
            logoutAnchor.style.color = '#333';
            logoutAnchor.style.textDecoration = 'none';
            logoutAnchor.style.borderBottom = '1px solid #eee';
            logoutAnchor.style.display = 'block';
            moreNav.appendChild(logoutAnchor);
        }
        
        const newBurger = burger.cloneNode(true);
        burger.parentNode.replaceChild(newBurger, burger);
        burger = newBurger;
        
        burger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Burger clicked, toggling menu');
            moreNav.classList.toggle('active');
        });
        
        burger.hasClickEvent = true;
        
        document.addEventListener('click', function(e) {
            if (moreNav.classList.contains('active') && 
                !burger.contains(e.target) && 
                !moreNav.contains(e.target)) {
                console.log('Outside click, closing menu');
                moreNav.classList.remove('active');
            }
        });
        
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fontAwesomeLink = document.createElement('link');
            fontAwesomeLink.rel = 'stylesheet';
            fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
            document.head.appendChild(fontAwesomeLink);
        }
        
        burger.style.cursor = 'pointer';
        burger.style.display = 'block';
        
        if (typeof checkProfileButtonVisibility === 'function') {
            setTimeout(checkProfileButtonVisibility, 500);
        }
        
        return true;
    } else {
        console.log('Could not find or create burger menu or nav elements on this page');
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing home2.js...');
    
    try {
        initializeBurgerMenu();
    
        if (searchButton && searchInput) {
        console.log('Initializing search functionality...');
        searchButton.addEventListener('click', () => handleSearch(searchInput.value));
            searchInput.addEventListener('input', () => handleSearch(searchInput.value));
    }

    console.log('Checking admin status...');
    checkAdminStatus();
    
    console.log('Checking profile visibility...');
    checkProfileButtonVisibility();
    
    console.log('Adding search styles...');
    addSearchStyles();
    
    console.log('Updating favorites count...');
        updateFavoritesCount();
    
    console.log('Setting active nav link...');
        setActiveNavLink();
        
        console.log('Loading categories...');
        fetchCategories();
        
        if (sliderContainer) {
            showSlide(currentSlide);
            startSlider();
            
            if (prevBtn) prevBtn.addEventListener('click', () => {
                stopSlider();
                prevSlide();
                startSlider();
            });
            
            if (nextBtn) nextBtn.addEventListener('click', () => {
                stopSlider();
                nextSlide();
                startSlider();
            });
            
            sliderContainer.addEventListener('mouseenter', stopSlider);
            sliderContainer.addEventListener('mouseleave', startSlider);
        }
        
        if (scrollTopBtn) {
            scrollTopBtn.addEventListener('click', scrollToTop);
        }
        window.addEventListener('scroll', handleScroll);
        handleScroll(); 
        
        console.log('home2.js initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
    
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Global error:', error || message);
    };
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showNotification('An error occurred', 'error');
});


function checkProfileButtonVisibility() {
    console.log('Checking profile visibility...');
    fetch('../../classes/checkAdmin.php')
        .then(response => response.json())
        .then(data => {
            console.log('Profile check data:', data);
            if (data.success && data.is_admin) {
                console.log('User is admin - hiding profile button');
                
                const profileLinks = document.querySelectorAll('a[href*="profile.html"]');
                profileLinks.forEach(link => {
                    console.log('Found profile link:', link);
                    link.style.display = 'none';
                });
                
                const profileNavItem = document.querySelector('.more-nav a[href*="profile.html"]');
                if (profileNavItem) {
                    console.log('Found profile nav item:', profileNavItem);
                    profileNavItem.style.display = 'none';
                }
                
                document.querySelectorAll('a').forEach(link => {
                    if (link.textContent && link.textContent.includes('My Profile')) {
                        console.log('Found My Profile text link:', link);
                        link.style.display = 'none';
                    }
                });
                
            } else {
                console.log('User is not admin or no session - profile button visible');
            }
        })
        .catch(error => {
            console.error('Error checking profile visibility:', error);
        });
}

window.addEventListener('load', function() {
    console.log('Page fully loaded, rechecking burger menu...');
    setTimeout(initializeBurgerMenu, 500);
});

window.setInterval(function() {
    const burgerElement = document.querySelector('#burgerMenu, .burger-menu, .fa-bars');
    if (burgerElement) {
        if (!burgerElement.hasClickEvent) {
            console.log('Reapplying burger menu initialization...');
            initializeBurgerMenu();
        }
    }
}, 2000);
function extendBurgerElement(element) {
    if (element) {
        element.hasClickEvent = true;
    }
}

window.addEventListener('load', function() {
    console.log('Page fully loaded, rechecking burger menu...');
    setTimeout(initializeBurgerMenu, 500);
});

