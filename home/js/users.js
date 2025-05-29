document.addEventListener("DOMContentLoaded", function() {
    fetchUsers();
    initializeToast();
});

let userModal;
let toast;

function initializeToast() {
    toast = new bootstrap.Toast(document.getElementById('toast'));
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('toast');
    toastEl.querySelector('.toast-body').textContent = message;
    toastEl.classList.remove('bg-success', 'bg-danger');
    toastEl.classList.add(type === 'success' ? 'bg-success' : 'bg-danger');
    toast.show();
}

function showLoading() {
    document.querySelector('.loading').classList.remove('d-none');
}

function hideLoading() {
    document.querySelector('.loading').classList.add('d-none');
}

function fetchUsers() {
    showLoading();
    fetch('/oop/classes/UserManager.php?action=getUsers')
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message);
            }
            const tbody = document.getElementById('usersTable');
            tbody.innerHTML = '';
            result.data.forEach((user, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${idx + 1}</td>
                    <td>${user.fname} ${user.lname}</td>
                    <td>${user.email}</td>
                    <td>${user.phone || '-'}</td>
                    <td>${user.address || '-'}</td>
                    <td>${user.is_admin ? 'yes' : 'no'}</td>
                    <td>
                        <button class="btn btn-edit" onclick="openEditModal(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-delete" onclick="confirmDelete(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            showToast(error.message || 'An error occurred while loading data.', 'error');
        })
        .finally(() => {
            hideLoading();
        });
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add new user';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    userModal = new bootstrap.Modal(document.getElementById('userModal'));
    userModal.show();
}

function openEditModal(id) {
    document.getElementById('modalTitle').textContent = 'Modify user data';
    showLoading();
    
    fetch('/oop/classes/UserManager.php?action=getUser&id=' + id)
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message);
            }
            const user = result.data;
            document.getElementById('userId').value = user.id;
            document.getElementById('fname').value = user.fname;
            document.getElementById('lname').value = user.lname;
            document.getElementById('email').value = user.email;
            document.getElementById('phone').value = user.phone || '';
            document.getElementById('address').value = user.address || '';
            document.getElementById('is_admin').checked = user.is_admin == 1;
            
            userModal = new bootstrap.Modal(document.getElementById('userModal'));
            userModal.show();
        })
        .catch(error => {
            showToast(error.message || 'An error occurred while loading user data.', 'error');
        })
        .finally(() => {
            hideLoading();
        });
}

function saveUser() {
    const userId = document.getElementById('userId').value;
    const userData = {
        fname: document.getElementById('fname').value,
        lname: document.getElementById('lname').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        is_admin: document.getElementById('is_admin').checked ? 1 : 0
    };

    if (!userData.fname || !userData.lname || !userData.email) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }

    showLoading();
    const action = userId ? 'updateUser' : 'addUser';
    const url = '/oop/classes/UserManager.php?action=' + action + (userId ? '&id=' + userId : '') + '&data=' + encodeURIComponent(JSON.stringify(userData));

    fetch(url)
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.message);
            }
            showToast(result.message);
            userModal.hide();
            fetchUsers();
        })
        .catch(error => {
            showToast(error.message || 'An error occurred while saving data.', 'error');
        })
        .finally(() => {
            hideLoading();
        });
}

function confirmDelete(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        showLoading();
        fetch('/oop/classes/UserManager.php?action=deleteUser&id=' + id)
            .then(response => response.json())
            .then(result => {
                if (!result.success) {
                    throw new Error(result.message);
                }
                showToast(result.message);
                fetchUsers();
            })
            .catch(error => {
                showToast(error.message || 'An error occurred while deleting the user.', 'error');
            })
            .finally(() => {
                hideLoading();
            });
    }
}
