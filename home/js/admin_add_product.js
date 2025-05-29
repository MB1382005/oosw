const apiUrl = "/oop/classes/UserManager.php"; 

document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();

    // Initialize Bootstrap modal for adding/editing products
    const productModalElement = document.getElementById("productModal");
    if (productModalElement) {
        productModalElement.addEventListener("hidden.bs.modal", () => {
            document.getElementById("productForm").reset(); 
            document.getElementById("productId").value = ""; 
            document.getElementById("prescription_required").checked = false; 
        });
    } else {
        console.error("Product Modal element not found! Please check your HTML.");
    }
});


function fetchProducts() {
    fetch(`/oop/classes/UserManager.php?action=getProducts`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success === true) {
                if (Array.isArray(data.data)) {
                    renderProducts(data.data);
                } else {
                    showToast("API returned success but no products array.");
                    console.error("API response missing products array:", data);
                }
            } else {
                showToast(data.message || "Failed to load products.");
                console.error("API Error:", data.message);
            }
        })
        .catch(error => {
            console.error("Fetch error:", error);
            showToast("Error loading products. Please check the console for details.");
        });
}


function renderProducts(products) {
    const tableBody = document.getElementById("productsTable");
    if (!tableBody) {
        console.error("Products Table element not found! Please check your HTML.");
        return;
    }
    tableBody.innerHTML = ""; 

    if (products.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="13" class="text-center py-3">No products found. Add a new one!</td></tr>`;
        return;
    }

    products.forEach((product, index) => {
        tableBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.brand}</td>
                <td>${product.category_name || product.category_id}</td>
                <td>${product.info}</td>
                <td>${parseFloat(product.price).toFixed(2)}</td>
                <td>${product.stock}</td>
                <td>
                    ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" width="50" height="50" class="img-thumbnail">` : 'No Image'}
                </td>
                <td>${product.expiration_date || 'N/A'}</td>
                <td>${product.prescription_required == 1 ? "Yes" : "No"}</td>
                <td>${product.created_at || 'N/A'}</td>
                <td>${product.updated_at || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick='editProduct(${JSON.stringify(product)})'><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick='deleteProduct(${product.id})'><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    });
}


function openAddModal() {
    const modalTitle = document.getElementById("modalTitle");
    const productForm = document.getElementById("productForm");
    const productId = document.getElementById("productId");
    const prescriptionInput = document.getElementById("prescription_required");
    const modalElement = document.getElementById("productModal");
    
    if (!modalTitle || !productForm || !productId || !prescriptionInput || !modalElement) {
        console.error("Form elements not found! Check your HTML structure.");
        alert("Could not open add form. Form elements are missing.");
        return;
    }

    modalTitle.textContent = "Add a new product";
    productForm.reset(); 
    productId.value = ""; 
    prescriptionInput.checked = false; 

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function editProduct(product) {
    const modalTitle = document.getElementById("modalTitle");
    const productId = document.getElementById("productId");
    const nameInput = document.getElementById("name");
    const brandInput = document.getElementById("brand");
    const categoryInput = document.getElementById("category_id");
    const infoInput = document.getElementById("info");
    const priceInput = document.getElementById("price");
    const stockInput = document.getElementById("stock");
    const imageUrlInput = document.getElementById("image_url");
    const expirationInput = document.getElementById("expiration_date");
    const prescriptionInput = document.getElementById("prescription_required");
    
    if (!modalTitle || !productId || !nameInput || !brandInput || !categoryInput || 
        !infoInput || !priceInput || !stockInput || !imageUrlInput || 
        !expirationInput || !prescriptionInput) {
        console.error("Form elements not found! Check your HTML structure.");
        alert("Could not open edit form. Form elements are missing.");
        return;
    }

    modalTitle.textContent = "Edit product";
    productId.value = product.id;
    nameInput.value = product.name;
    brandInput.value = product.brand;
    categoryInput.value = product.category_id;
    infoInput.value = product.info;
    priceInput.value = parseFloat(product.price).toFixed(2); 
    stockInput.value = product.stock;
    imageUrlInput.value = product.image_url;
    expirationInput.value = product.expiration_date;
    prescriptionInput.checked = (product.prescription_required == 1 || product.prescription_required === true);

    const modalElement = document.getElementById("productModal");
    if (!modalElement) {
        console.error("Modal element not found!");
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}


function saveProduct() {
    const productIdInput = document.getElementById("productId");
    const nameInput = document.getElementById("name");
    const brandInput = document.getElementById("brand");
    const categoryInput = document.getElementById("category_id");
    const infoInput = document.getElementById("info");
    const priceInput = document.getElementById("price");
    const stockInput = document.getElementById("stock");
    const imageUrlInput = document.getElementById("image_url");
    const expirationInput = document.getElementById("expiration_date");
    const prescriptionInput = document.getElementById("prescription_required");
    
    if (!productIdInput || !nameInput || !brandInput || !categoryInput || 
        !infoInput || !priceInput || !stockInput || !imageUrlInput || 
        !expirationInput || !prescriptionInput) {
        console.error("Form elements not found! Check your HTML structure.");
        alert("Could not save product. Form elements are missing.");
        return;
    }

    const id = productIdInput.value;
    const isEditing = !!id; 
    const productData = {
        name: nameInput.value,
        brand: brandInput.value,
        category_id: parseInt(categoryInput.value) || 0,
        info: infoInput.value,
        price: parseFloat(priceInput.value) || 0,
        stock: parseInt(stockInput.value) || 0,
        image_url: imageUrlInput.value,
        expiration_date: expirationInput.value,
        // Convert checkbox state to 1 or 0
        prescription_required: prescriptionInput.checked ? 1 : 0
    };

    let url = "/oop/classes/UserManager.php";
    let method = "GET"; 
    if (isEditing) {
        url += `?action=updateProduct&id=${id}&data=${encodeURIComponent(JSON.stringify(productData))}`;
    } else {
        url += `?action=addProduct&data=${encodeURIComponent(JSON.stringify(productData))}`;
    }

    fetch(url, {
        method: method, 
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            showToast(result.message || "Operation successful!");
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById("productModal"));
            if (modalInstance) {
                modalInstance.hide();
            }
            fetchProducts(); 
        } else {
            showToast(result.message || "Operation failed.");
            console.error("Server Error:", result.message);
        }
    })
    .catch(error => {
        console.error("Save error:", error);
        showToast("Error saving product. Please check the console for details.");
    });
}

function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
        return; 
    }

    fetch(`/oop/classes/UserManager.php?action=deleteProduct&id=${id}`, {
        method: "GET", 
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            showToast(result.message || "Product deleted successfully.");
            fetchProducts(); 
        } else {
            showToast(result.message || "Failed to delete product.");
            console.error("Server Error:", result.message);
        }
    })
    .catch(error => {
        console.error("Delete error:", error);
        showToast("Error deleting product. Please check the console for details.");
    });
}


function showToast(message) {
    const toastEl = document.getElementById("toast");
    if (!toastEl) {
        console.warn("Toast element with ID 'toast' not found. Cannot display message:", message);
        return;
    }
    const toastBody = toastEl.querySelector(".toast-body");
    if (toastBody) {
        toastBody.textContent = message;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    } else {
        console.warn("Toast body element not found. Cannot display message:", message);
    }
}