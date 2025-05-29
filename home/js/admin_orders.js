let orders = [];
let currentOrderId = null;
let modal = null;
let toast = null;

document.addEventListener('DOMContentLoaded', function() {
    modal = new bootstrap.Modal(document.getElementById('orderModal'));
    toast = new bootstrap.Toast(document.getElementById('toast'));
    
    fetchOrders();
});

async function fetchOrders() {
    try {
        showLoading();
        const response = await fetch('../../classes/UserManager.php?action=getAllOrders');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            orders = data.data;
            renderOrders();
        } else {
            showToast('Error fetching orders: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderOrders() {
    const tbody = document.getElementById('ordersTable');
    tbody.innerHTML = '';
    
    if (orders.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="8" class="text-center">No orders found</td>';
        tbody.appendChild(tr);
        return;
    }
    
    orders.forEach((order, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${order.id}</td>
            <td>${order.fname} ${order.lname}</td>
            <td>${order.email}</td>
            <td>${order.order_date}</td>
            <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
            <td>$${order.total_price}</td>
            <td>
                <button class="btn btn-edit" onclick="openEditModal(${order.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-delete" onclick="confirmDelete(${order.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddModal() {
    currentOrderId = null;
    document.getElementById('modalTitle').textContent = 'Add new order';
    document.getElementById('orderForm').reset();
    document.getElementById('orderId').value = '';
    document.getElementById('userId').removeAttribute('readonly');
    document.getElementById('orderDate').removeAttribute('readonly');
    document.getElementById('totalPrice').removeAttribute('readonly');
    document.getElementById('userId').removeAttribute('disabled');
    document.getElementById('orderDate').removeAttribute('disabled');
    document.getElementById('totalPrice').removeAttribute('disabled');
    modal.show();
}

async function openEditModal(orderId) {
    try {
        showLoading();
        const response = await fetch(`../../classes/UserManager.php?action=getOrder&id=${orderId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
            currentOrderId = orderId;
            document.getElementById('modalTitle').textContent = 'Edit order';
            document.getElementById('orderId').value = orderId;
            document.getElementById('userId').value = data.data.user_id;
            document.getElementById('orderDate').value = data.data.order_date;
            document.getElementById('status').value = data.data.status;
            document.getElementById('totalPrice').value = data.data.total_price;
            document.getElementById('userId').setAttribute('readonly', true);
            document.getElementById('orderDate').setAttribute('readonly', true);
            document.getElementById('totalPrice').setAttribute('readonly', true);
            document.getElementById('userId').setAttribute('disabled', true);
            document.getElementById('orderDate').setAttribute('disabled', true);
            document.getElementById('totalPrice').setAttribute('disabled', true);
            modal.show();
        } else {
            showToast('Error: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function saveOrder() {
    const form = document.getElementById('orderForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    let orderData;
    if (currentOrderId) {
        orderData = {
            id: currentOrderId,
            status: document.getElementById('status').value
        };
    } else {
        orderData = {
            id: currentOrderId,
            user_id: document.getElementById('userId').value,
            order_date: document.getElementById('orderDate').value,
            status: document.getElementById('status').value,
            total_price: document.getElementById('totalPrice').value
        };
    }
    try {
        showLoading();
        const response = await fetch('../../classes/UserManager.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: currentOrderId ? 'updateOrder' : 'addOrder',
                order: orderData
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
            showToast(currentOrderId ? 'Order updated successfully' : 'Order added successfully');
            modal.hide();
            fetchOrders();
        } else {
            showToast('Error: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function confirmDelete(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        deleteOrder(orderId);
    }
}

async function deleteOrder(orderId) {
    try {
        showLoading();
        const response = await fetch('../../classes/UserManager.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'deleteOrder',
                id: orderId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Order deleted successfully');
            fetchOrders();
        } else {
            showToast('Error: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('toast');
    const toastBody = toastEl.querySelector('.toast-body');
    
    toastEl.className = 'toast';
    toastEl.classList.add(type === 'error' ? 'bg-danger' : 'bg-success');
    toastEl.classList.add('text-white');
    
    toastBody.textContent = message;
    toast.show();
}

function showLoading() {
    document.querySelector('.loading').classList.remove('d-none');
}

function hideLoading() {
    document.querySelector('.loading').classList.add('d-none');
}
