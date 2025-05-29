document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    let productData = null;

    if (!productId) {
        console.error("No product ID in URL");
        document.querySelector(".product-name").textContent = "Product Not Found";
        document.querySelector(".description").textContent = "Please go back and select a product.";
        return;
    }

    document.getElementById('medicine_id').value = productId;

    const toast = {
        element: document.getElementById('toast'),
        show: function(message, type = 'info') {
            this.element.querySelector('.toast-message').textContent = message;
            this.element.classList.remove('success', 'error', 'info');
            this.element.classList.add(type);
            this.element.classList.add('show');
            setTimeout(() => {
                this.element.classList.remove('show');
            }, 5000);
        }
    };

    fetch(`/oop/manger_panel/GetProducts.php?id=${productId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === "success" && data.product) {
                productData = data.product;
                document.querySelector(".product-name").textContent = productData.name || "N/A";
                document.querySelector(".brand").textContent = `Brand: ${productData.brand || productData.company_name || "N/A"}`;
                document.querySelector(".category").textContent = `Category: ${productData.category_name || "N/A"}`;
                document.querySelector(".price").textContent = `${parseFloat(productData.price).toFixed(2)} EGP`;
                document.querySelector(".stock").textContent = `In Stock: ${productData.stock !== undefined ? productData.stock : "N/A"}`;
                document.querySelector(".expiration").textContent = `Expires: ${productData.expiration_date || "N/A"}`;
                document.querySelector(".description").textContent = productData.info || "No description available.";
                const productImage = document.querySelector(".image-section img");
                if (productImage) {
                    let imgUrl = productData.img || productData.image_url;
                    if (imgUrl && !imgUrl.startsWith('http')) {
                        imgUrl = `/oop/images/${imgUrl}`;
                    }
                    productImage.src = imgUrl || "/oop/images/default.png";
                    productImage.alt = productData.name || "Product Image";
                }
                fetchReviews();
            } else {
                document.querySelector(".product-name").textContent = "Product Not Found";
                document.querySelector(".description").textContent = data.message || "No product details available.";
            }
        })
        .catch(error => {
            console.error("Fetch error:", error);
            document.querySelector(".product-name").textContent = "Error";
            document.querySelector(".description").textContent = "Unable to load product details.";
        });

    function fetchReviews() {
        fetch(`/oop/get_reviews.php?product_id=${productId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const reviews = data.reviews;
                    const averageRating = data.average_rating;
                    updateAverageRating(averageRating, reviews.length);
                    updateRatingBreakdown(reviews);
                    displayReviews(reviews);
                } else {
                    document.querySelector('.reviews-loading').textContent = "Failed to load reviews.";
                }
            })
            .catch(error => {
                console.error("Error fetching reviews:", error);
                document.querySelector('.reviews-loading').textContent = "Error loading reviews.";
            });
    }

    function updateAverageRating(rating, count) {
        const roundedRating = parseFloat(rating).toFixed(1);
        document.querySelector('.rating-large').textContent = roundedRating;
        document.getElementById('reviewsCount').textContent = count;
        updateStars(document.querySelector('.stars-large'), roundedRating);
        document.querySelector('.rating-value').textContent = `(${roundedRating})`;
        document.querySelector('.reviews-count').textContent = `(${count} reviews)`;
        updateStars(document.querySelector('.stars'), roundedRating);
    }

    function updateStars(starsElement, rating) {
        if (!starsElement) return;
        starsElement.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            if (i <= Math.floor(rating)) {
                star.className = 'fas fa-star';
            } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
                star.className = 'fas fa-star-half-alt';
            } else {
                star.className = 'far fa-star';
            }
            starsElement.appendChild(star);
        }
    }

    function updateRatingBreakdown(reviews) {
        const ratingCounts = [0, 0, 0, 0, 0];
        reviews.forEach(review => {
            const rating = parseInt(review.rating);
            if (rating >= 1 && rating <= 5) {
                ratingCounts[rating - 1]++;
            }
        });
        const ratingBars = document.querySelectorAll('.rating-bar');
        for (let i = 0; i < 5; i++) {
            const count = ratingCounts[4 - i];
            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            ratingBars[i].querySelector('.bar').style.width = `${percentage}%`;
            ratingBars[i].querySelector('.count').textContent = count;
        }
    }

    function displayReviews(reviews) {
        const reviewsList = document.querySelector('.reviews-list');
        reviewsList.innerHTML = '';
        if (reviews.length === 0) {
            reviewsList.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to review this product!</div>';
            return;
        }
        reviews.forEach(review => {
            const reviewDate = new Date(review.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            reviewItem.innerHTML = `
                <div class="review-header">
                    <span class="reviewer-name">${review.user_name}</span>
                    <span class="review-date">${reviewDate}</span>
                </div>
                <div class="review-rating"></div>
                <div class="review-content">${review.comment}</div>
            `;
            updateStars(reviewItem.querySelector('.review-rating'), review.rating);
            reviewsList.appendChild(reviewItem);
        });
    }

    const ratingSelector = document.querySelector('.rating-selector');
    if (ratingSelector) {
        const stars = ratingSelector.querySelectorAll('i');
        const ratingInput = document.getElementById('rating');
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.dataset.rating);
                ratingInput.value = rating;
                stars.forEach((s, index) => {
                    if (index < rating) {
                        s.className = 'fas fa-star';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });
            star.addEventListener('mouseenter', function() {
                const rating = parseInt(this.dataset.rating);
                stars.forEach((s, index) => {
                    if (index < rating) {
                        s.className = 'fas fa-star';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });
        });
        ratingSelector.addEventListener('mouseleave', function() {
            const rating = parseInt(ratingInput.value);
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.className = 'fas fa-star';
                } else {
                    s.className = 'far fa-star';
                }
            });
        });
    }

    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const rating = formData.get('rating');
            const comment = formData.get('comment');
            if (rating === '0') {
                showReviewMessage('Please select a rating.', 'error');
                return;
            }
            if (!comment.trim()) {
                showReviewMessage('Please enter your review.', 'error');
                return;
            }
            fetch('/oop/submit_review.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showReviewMessage('Your review has been submitted successfully!', 'success');
                    reviewForm.reset();
                    const stars = document.querySelectorAll('.rating-selector i');
                    stars.forEach(star => {
                        star.className = 'far fa-star';
                    });
                    document.getElementById('rating').value = '0';
                    fetchReviews();
                    toast.show('Review submitted successfully!', 'success');
                } else {
                    showReviewMessage(data.message || 'Failed to submit review.', 'error');
                }
            })
            .catch(error => {
                console.error('Error submitting review:', error);
                showReviewMessage('An error occurred while submitting your review.', 'error');
            });
        });
    }

    function showReviewMessage(message, type = 'error') {
        const messageElement = document.querySelector('.review-message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `review-message ${type}`;
            setTimeout(() => {
                messageElement.className = 'review-message';
            }, 5000);
        }
    }
    
    window.addToFavorites = function() {
        if (!productData) {
            toast.show('Product data not available.', 'error');
            return;
        }
        fetch('/oop/add_to_wishlist.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ product_id: productId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            try {
                const data = JSON.parse(text);
                if (data.success) {
                    toast.show('Added to favorites!', 'success');
                    setTimeout(() => {
                        window.location.href = '/oop/home/html/favorites.html';
                    }, 1000);
                } else {
                    toast.show(data.message || 'Failed to add to favorites.', 'error');
                }
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                console.log('Raw server response:', text);
                toast.show('Server returned invalid data.', 'error');
            }
        })
        .catch(error => {
            console.error('Error adding to favorites:', error);
            toast.show('Error adding to favorites.', 'error');
        });
    };
    
    window.addToCart = function(productName) {
        if (!productData) {
            toast.show('Product data not available.', 'error');
            return;
        }
        fetch('/oop/cart/add_to_cart.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ product_id: productId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            try {
                const data = JSON.parse(text);
                if (data.success) {
                    toast.show(`${productName} added to cart!`, 'success');
                } else {
                    toast.show(data.message || 'Failed to add to cart.', 'error');
                }
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                console.log('Raw server response:', text);
                toast.show('Server returned invalid data.', 'error');
            }
        })
        .catch(error => {
            console.error('Error adding to cart:', error);
            toast.show('Error adding to cart.', 'error');
        });
    };
});
