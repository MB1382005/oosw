$(document).ready(function () {
  $(".stat-box").hide().each(function (index) {
    $(this).delay(200 * index).fadeIn(600);
  });

  fetch('../../classes/UserManager.php?action=getDashboardStats')
    .then((response) => response.json())
    .then((data) => {
      console.log("Received data:", data);

      if (data.error) {
        console.error("Error fetching stats:", data.error);
        return;
      }
      const statBoxes = document.querySelectorAll('.stat-box');
      statBoxes[0].querySelector('p').textContent = data.data.totalProducts;
      statBoxes[1].querySelector('p').textContent = data.data.totalOrders;
      statBoxes[2].querySelector('p').textContent = data.data.totalUsers;

      let sales = parseFloat(data.data.totalSales);
      if (isNaN(sales)) sales = 0;
      statBoxes[3].querySelector('p').textContent = sales.toFixed(2);
    })
    .catch((error) => console.error("Fetch error:", error));
});
