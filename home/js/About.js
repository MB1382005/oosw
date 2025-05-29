
function showMessage(msg) {
  let msgBox = document.getElementById("customMsgBox");
  if (!msgBox) {
    msgBox = document.createElement("div");
    msgBox.id = "customMsgBox";
    msgBox.style.position = "fixed";
    msgBox.style.top = "30px";
    msgBox.style.left = "50%";
    msgBox.style.transform = "translateX(-50%)";
    msgBox.style.background = "#fff";
    msgBox.style.color = "#333";
    msgBox.style.padding = "16px 32px";
    msgBox.style.borderRadius = "8px";
    msgBox.style.boxShadow = "0 2px 12px rgba(0,0,0,0.15)";
    msgBox.style.zIndex = "9999";
    msgBox.style.fontSize = "18px";
    msgBox.style.display = "none";
    document.body.appendChild(msgBox);
  }
  msgBox.textContent = msg;
  msgBox.style.display = "block";
  setTimeout(() => {
    msgBox.style.display = "none";
  }, 2500);
}

document.addEventListener("DOMContentLoaded", function () {
  const favCountElement = document.getElementById("favCount");
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  favCountElement.textContent = favorites.length;

  window.scrollTo({ top: 0, behavior: "smooth" });

  const searchBtn = document.querySelector(".search-btn");
  const searchInput = document.querySelector(".search-input");

  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", function () {
      const query = searchInput.value.trim();
      if (query) {
        alert("You searched for: " + query);
      } else {
        alert("Please enter a search term.");
      }
    });
  }
});
  $(document).ready(function() {
    $(".about-hero, .about-content, .footer").hide().fadeIn(1000);

    $(".about-text").css({ opacity: 0, marginLeft: "-50px" }).animate({
      opacity: 1,
      marginLeft: "0"
    }, 1000);

    $(".about-image").css({ opacity: 0, marginRight: "-50px" }).delay(300).animate({
      opacity: 1,
      marginRight: "0"
    }, 1000);

    $(".cta-btn").hover(
      function () {
        $(this).animate({ paddingLeft: "25px" }, 200);
      },
      function () {
        $(this).animate({ paddingLeft: "20px" }, 200);
      }
    );

    $('a[href^="#"]').on('click', function(e) {
      e.preventDefault();
      const target = $($(this).attr('href'));
      if (target.length) {
        $('html, body').animate({
          scrollTop: target.offset().top
        }, 800);
      }
    });
  });