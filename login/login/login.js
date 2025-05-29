const signInButton=document.getElementById('signInButton');
const signUpButton=document.getElementById('signUpButton');
const signInForm= document.getElementById('signIn');
const signUpForm= document.getElementById('signUp');
const passwords = document.querySelectorAll('.password'); 
const eyes = document.querySelectorAll(".Eyes"); 
const googleIcons = document.querySelectorAll('.fa-google');
const recoverPasswordButton = document.getElementById('recoverPasswordButton');
const resultBoxSignUp = document.getElementById('resultBoxSignUp');
const resultBoxSignIn = document.getElementById('resultBoxSignIn');

signUpButton.addEventListener('click',function(){
  signInForm.style.display="none";
  signUpForm.style.display="block";
});
signInButton.addEventListener('click',function(){
  signInForm.style.display="block";
  signUpForm.style.display="none";
});
googleIcons.forEach((icon) => {
  icon.addEventListener('click', function() {
    window.location.href = "/oop/classes/user.php?google_login=1";
  });
});

eyes.forEach(function (img, index) {
  img.addEventListener("click", function () {
    if (passwords[index].type === "password") {
      img.src = "view.png"; 
      passwords[index].type = "text";
    } 
    else {
      img.src = "hidden.png";
      passwords[index].type = "password";
    }
  });
});

recoverPasswordButton.addEventListener('click', function(event) {
  event.preventDefault();
  window.location.href = "/oop/manage_login/reset_password.php";
});

document.addEventListener("DOMContentLoaded", function () {
  const signUpForm = document.getElementById("signUpForm");
  const signInForm = document.getElementById("signInForm");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameRegex = /^[a-zA-Z]{2,}$/;

  function showError(id, message) {
    const errorSpan = document.getElementById(id + "-error");
    if (errorSpan) errorSpan.textContent = message;
  }

  function clearErrors(ids) {
    ids.forEach(id => {
      const errorSpan = document.getElementById(id + "-error");
      if (errorSpan) errorSpan.textContent = "";
    });
  }

  function showResultBox(box, message, isSuccess) {
    if (!box) return;
    box.style.display = 'block';
    box.textContent = message;
    box.className = 'result-box ' + (isSuccess ? 'success' : 'error');
  }

  function hideResultBox(box) {
    if (!box) return;
    box.style.display = 'none';
    box.textContent = '';
    box.className = 'result-box';
  }

  signUpForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const fname = document.getElementById("fname").value.trim();
    const lname = document.getElementById("lname").value.trim();
    const email = document.getElementById("EmailOne").value.trim();
    const password = document.getElementById("PasswordOne").value;
    const confirmPassword = document.getElementById("ConfirmPasswordOne").value;

    clearErrors(["fname", "lname", "emailOne", "passwordOne", "confirmPasswordOne"]);
    hideResultBox(resultBoxSignUp);
    let valid = true;

    if (!nameRegex.test(fname)) {
      showError("fname", "First name must be at least 2 letters.");
      valid = false;
    }
    if (!nameRegex.test(lname)) {
      showError("lname", "Last name must be at least 2 letters.");
      valid = false;
    }
    if (!emailRegex.test(email)) {
      showError("emailOne", "Please enter a valid email.");
      valid = false;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      showError("passwordOne", "Password must be at least 8 characters, include upper, lower, number, and special character.");
      valid = false;
    }
    if (password !== confirmPassword) {
      showError("confirmPasswordOne", "Passwords do not match.");
      valid = false;
    }
    if (!valid) {
      showResultBox(resultBoxSignUp, "Please fix the errors above.", false);
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/oop/classes/user.php", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const response = xhr.responseText.trim();
          if (response.toLowerCase().includes("success")) {
            showResultBox(resultBoxSignUp, "Account created successfully! Redirecting to sign in...", true);
            setTimeout(() => { signInButton.click(); }, 2000);
          } else {
            showResultBox(resultBoxSignUp, response, false);
          }
        } else {
            showResultBox(resultBoxSignUp, "A server connection error occurred.", false);
        }
      }
    };
    xhr.send(`fname=${encodeURIComponent(fname)}&lname=${encodeURIComponent(lname)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&signUp=`);
  });

  signInForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = document.getElementById("EmailTwo").value.trim();
    const password = document.getElementById("PasswordTwo").value;

    clearErrors(["emailTwo", "passwordTwo"]);
    hideResultBox(resultBoxSignIn);
    let valid = true;

    if (!email) {
      showError("emailTwo", "Email is required.");
      valid = false;
    }
    if (!password) {
      showError("passwordTwo", "Password is required.");
      valid = false;
    }
    if (!valid) {
      showResultBox(resultBoxSignIn, "Please fill in all fields.", false);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/oop/classes/user.php", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const response = xhr.responseText.trim();
          if (response.toLowerCase().includes("login failed")) {
            showResultBox(resultBoxSignIn, "Incorrect email or password.", false);
          } else if (response.toLowerCase().includes("<html") || response.toLowerCase().includes("<!doctype html")) {
            showResultBox(resultBoxSignIn, "Login successful!", true);
            setTimeout(() => { window.location.href = "../../home/html/home2.html"; }, 1000);
          } else {
            showResultBox(resultBoxSignIn, response, false);
          }
        } else {
            showResultBox(resultBoxSignIn, "A server connection error occurred.", false);
        }
      }
    };
    xhr.send(`email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&signIn=`);
  });
});


