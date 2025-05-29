document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const msgDiv = document.getElementById('changePasswordMsg');

  if (newPassword !== confirmPassword) {
    msgDiv.textContent = 'Passwords do not match!';
    msgDiv.style.color = 'red';
    return;
  }

  try {
    const response = await fetch('../../classes/change_password.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });
    const result = await response.json();
    msgDiv.textContent = result.message;
    msgDiv.style.color = result.success ? 'green' : 'red';
    if (result.success) {
      document.getElementById('changePasswordForm').reset();
    }
  } catch (err) {
    msgDiv.textContent = 'Error changing password. Please try again.';
    msgDiv.style.color = 'red';
  }
}); 