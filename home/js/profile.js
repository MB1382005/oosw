async function fetchUserProfile() {
    try {
        const timestamp = new Date().getTime();
        const profileUrl = `../../classes/get_profile.php?t=${timestamp}`;
        console.log('Fetching from:', profileUrl);
        
        const response = await fetch(profileUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
        
        const rawResponse = await response.text();
        console.log('Raw response:', rawResponse);
        
        if (!rawResponse || rawResponse.trim() === '') {
            console.error('Empty response received');
            throw new Error('Empty response from server');
        }

        try {
            const result = JSON.parse(rawResponse);
            console.log('JSON parsed directly:', result);
            
            if (result && typeof result === 'object') {
                if (result.success === false) {
                    console.warn('Server returned error:', result.message);
                    alert('Server error: ' + result.message);
                    return;
                }
                
                if (result.success && result.data && result.data.user) {
                    updateProfileUI(result);
                    return;
                } else {
                    console.warn('Incomplete user data in response:', result);
                }
            }
        } catch (jsonError) {
            console.warn('Direct JSON parsing failed:', jsonError);
        }

        const jsonPattern = /\{[\s\S]*?\}/g;
        const allMatches = rawResponse.match(jsonPattern);
        
        if (allMatches && allMatches.length > 0) {
            for (const potentialJson of allMatches) {
                try {
                    const result = JSON.parse(potentialJson);
                    console.log('Found potential JSON match:', result);
                    
                    if (result.success && result.data && result.data.user) {
                        console.log('Valid profile data found in JSON pattern');
                        updateProfileUI(result);
                        return;
                    }
                } catch (e) {
                }
            }
        }

        console.error('Could not find valid user profile data in response');
        throw new Error('Could not find user profile data in response');
    } catch (error) {
        console.error('Error fetching profile:', error);
        document.getElementById('profileErrorMessage').style.display = 'block';
        document.getElementById('profileErrorMessage').textContent = 'خطأ في تحميل الملف الشخصي. حاول تسجيل الدخول مرة أخرى.';
        
        const infoTab = document.getElementById('infoTab');
        if (infoTab) infoTab.innerHTML = '<p class="error-message">فشل تحميل بيانات الملف الشخصي</p>';
    }
}

function updateProfileUI(result) {
    if (result.success) {
        const userData = result.data.user;
        const orders = result.data.orders;
        
        document.getElementById('userName').textContent = `${userData.fname} ${userData.lname}`;
        document.getElementById('userEmail').textContent = userData.email;
        document.getElementById('userPhone').textContent = userData.phone || 'Not set';
        document.getElementById('userAddress').textContent = userData.address || 'Not set';
        document.getElementById('preferredAddress').textContent = userData.address || 'Not set';
        
        loadOrders(orders);
    } else {
        console.error('Failed to fetch user data:', result);
        
        if (result.message === 'User not logged in' || result.message === 'Access denied. Only customers can view profiles') {
            window.location.href = '../../login/login/login.html';
            return;
        }
        
        alert('Failed to load profile data: ' + result.message);
    }
}

function loadOrders(orders) {
    const list = document.getElementById('ordersList');
    if (!list) return;

    if (!orders || orders.length === 0) {
        list.innerHTML = '<li>No orders found.</li>';
        return;
    }

    list.innerHTML = orders.map(order => {
        let itemsHtml = 'N/A';
        if (Array.isArray(order.items) && order.items.length > 0) {
            itemsHtml = order.items.map(i => 
                `&nbsp;&nbsp;- ${i.medicine_name} (x${i.quantity}) - ${i.price}EG`
            ).join('<br>');
        }
        
        return `
        <li class="order-item">
            <strong>Order #${order.id}</strong><br>
            📅 Date: ${new Date(order.order_date).toLocaleDateString()}<br>
            🛍️ Items:<br>
            ${itemsHtml}<br>
            💰 Total: ${order.total || order.total_price || 'N/A'}EG<br>
            🔄 Status: <span class="status">${order.status || 'Processing'}</span>
        </li>`;
    }).join('');
}

function editProfile() {
    const editProfilePath = 'edit_profile.html';
    
    fetch(editProfilePath, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                window.location.href = editProfilePath;
            } else {
                window.location.href = '../html/edit_profile.html';
            }
        })
        .catch(() => {
            console.log('Could not find edit_profile.html, trying alternate path');
            window.location.href = '../html/edit_profile.html';
        });
}

function changePassword() {
    window.location.href = 'change_password.html';
}

function logout() {
    fetch('../../classes/logout.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                localStorage.clear();
                window.location.href = '../../login/login/login.html';
            } else {
                alert('Logout failed. Please try again.');
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
            alert('Error during logout. Please try again.');
        });
}

function showTab(tab) {
    const tabs = ['info', 'favorites', 'orders', 'address'];
    tabs.forEach(t => {
        document.getElementById(t + 'Tab').style.display = t === tab ? 'block' : 'none';
        document.querySelector(`.tab-btn[onclick="showTab('${t}')"]`).classList.toggle('active', t === tab);
    });
}

function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const list = document.getElementById('favoritesList');
    if (favorites.length === 0) {
        list.innerHTML = '<li>No favorite items.</li>';
        return;
    }

    list.innerHTML = favorites.map(item => `<li>${item.name}</li>`).join('');
}

function updateFavCount() {
    const favCount = document.getElementById('favCount');
    if (favCount) {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        favCount.textContent = favorites.length;
    }
}

function checkProfileButtonVisibility() {
    fetch('../../classes/get_profile.php', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(result => {
        if (!result.success || (result.data && result.data.user && result.data.user.is_admin == 1)) {
            const profileLinks = document.querySelectorAll('a[href*="profile.html"]');
            profileLinks.forEach(link => link.style.display = 'none');
        }
    })
    .catch(() => {
        const profileLinks = document.querySelectorAll('a[href*="profile.html"]');
        profileLinks.forEach(link => link.style.display = 'none');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    checkProfileButtonVisibility();
    fetchUserProfile();
    loadFavorites();
    updateFavCount();
    
    $(".profile-card").hide().slideDown(800).fadeIn(800);
    
    showTab('info');
    
    $(".tab-btn").hover(
        function() {
            $(this).css("cursor", "pointer").animate({ backgroundColor: "#4CAF50", color: "#fff" }, 200);
        },
        function() {
            if(!$(this).hasClass("active")) {
                $(this).animate({ backgroundColor: "#f0f0f0", color: "#000" }, 200);
            }
        }
    );
    
    $(".profile-actions button").hover(
        function() {
            $(this).css("cursor", "pointer").animate({ backgroundColor: "#2196F3", color: "#fff" }, 200);
        },
        function() {
            $(this).animate({ backgroundColor: "#fff", color: "#000" }, 200);
        }
    );
});
