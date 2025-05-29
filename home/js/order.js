async function saveAsPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let yPos = 20;
    doc.setFontSize(20);
    doc.text("Medisphere - Order Invoice", 15, yPos);
    yPos += 10;
    doc.setFontSize(12);
    const orderId = document.getElementById('orderId').textContent;
    let orderDate = document.getElementById('orderDate').textContent;
    let formattedDate = orderDate;
    try {
        const d = new Date(orderDate);
        if (d instanceof Date && !isNaN(d.getTime())) {
            formattedDate = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
        } else {
            formattedDate = orderDate;
        }
    } catch(e) {}
    doc.text(`Order Number: ${orderId}`, 15, yPos += 8);
    doc.text(`Order Date: ${formattedDate}`, 15, yPos += 7);
    doc.setFontSize(14);
    doc.text("Customer Information", 15, yPos += 12);
    doc.setFontSize(11);
    const customerName = document.getElementById('customerName').textContent;
    const customerEmail = document.getElementById('customerEmail').textContent;
    const customerPhone = document.getElementById('customerPhone').textContent;
    const deliveryAddress = document.getElementById('deliveryAddress').textContent;
    doc.text(`Name: ${customerName}`, 15, yPos += 8);
    doc.text(`Email: ${customerEmail}`, 15, yPos += 6);
    doc.text(`Phone: ${customerPhone}`, 15, yPos += 6);
    doc.text(`Address: ${deliveryAddress}`, 15, yPos += 6);
    doc.setFontSize(14);
    doc.text("Order Items", 15, yPos += 12);
    doc.setFontSize(11);
    const col1 = 15, col2 = 90, col3 = 120, col4 = 150;
    yPos += 7;
    doc.text("Product", col1, yPos);
    doc.text("Quantity", col2, yPos, {align:'center'});
    doc.text("Price", col3, yPos, {align:'center'});
    doc.text("Total", col4, yPos, {align:'center'});
    doc.setLineWidth(0.1);
    doc.line(col1, yPos+1, 190, yPos+1);
    const items = document.querySelectorAll('#orderItems tr');
    yPos += 7;
    items.forEach(item => {
        const cells = item.querySelectorAll('td');
        doc.text((cells[0].textContent||'').replace('💊','').trim(), col1, yPos);
        doc.text((cells[1].textContent||'').trim(), col2, yPos, {align:'center'});
        doc.text((cells[2].textContent||'').trim(), col3, yPos, {align:'center'});
        doc.text((cells[3].textContent||'').trim(), col4, yPos, {align:'center'});
        yPos += 7;
    });
    yPos += 5;
    doc.setFontSize(13);
    const total = document.getElementById('totalPrice').textContent;
    doc.text(`Total Amount: ${total} EG`, 15, yPos);

    doc.save("order_invoice.pdf");
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Fetching order details...');
    fetch('../get_order_details.php')
        .then(response => {
            console.log('Response received:', response);
            return response.json();
        })
        .then(data => {
            console.log('Data received:', data);
            if (data.success) {
                const order = data.order_details;
                console.log('Order details:', order);
                console.log('Order items:', order.items);

                document.getElementById('orderId').textContent = order.order_id;
                document.getElementById('orderDate').textContent = new Date(order.date).toLocaleString('en-GB');
                document.getElementById('customerName').textContent = order.customer_name;
                document.getElementById('customerEmail').textContent = order.email;
                document.getElementById('customerPhone').textContent = order.phone;
                document.getElementById('deliveryAddress').textContent = order.address;
                
                document.getElementById('deliveryAddressInfo').textContent = order.address;
                document.getElementById('deliveryPhoneInfo').textContent = order.phone;
                
                document.getElementById('totalPrice').textContent = order.total;

                const itemsContainer = document.getElementById('orderItems');
                itemsContainer.innerHTML = ''; 
                order.items.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><i class="fas fa-capsules"></i> ${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${item.price} EG</td>
                        <td>${item.price * item.quantity} EG</td>
                    `;
                    itemsContainer.appendChild(row);
                });

                const statusSteps = document.querySelectorAll('.status-step');
                let activeFound = false;
                
                statusSteps.forEach((step, index) => {
                    if (order.status === 'pending' && index === 0) {
                        step.classList.add('active');
                        activeFound = true;
                    } else if (order.status === 'processing' && index === 1) {
                        step.classList.add('active');
                        activeFound = true;
                    } else if (order.status === 'prepared' && index === 2) {
                        step.classList.add('active');
                        activeFound = true;
                    } else if (order.status === 'shipping' && index === 3) {
                        step.classList.add('active');
                        activeFound = true;
                    }
                });

                if (!activeFound) {
                    statusSteps[0].classList.add('active');
                }
            } else {
                console.error('Error loading order details:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
});