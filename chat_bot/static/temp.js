let sending = false;

function showSection(id) {
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.getElementById('response').innerHTML = ''; 
}

document.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
    });
});

async function sendRequest(type) {
    if (sending) return;
    sending = true;

    let payload = { action: type === 'alt' ? 'alternative' : type };

    if (type === 'alt') {
        const med = document.getElementById('altInput').value.trim();
        const altType = document.getElementById('altType').value;
        if (!med) {
            alert("Please enter a medicine name.");
            sending = false;
            return;
        }
        payload.medicine = med;
        payload.alt_type = altType;
    } else if (type === 'compare') {
        const med1 = document.getElementById('compareDrug1').value.trim();
        const med2 = document.getElementById('compareDrug2').value.trim();
        if (!med1 || !med2) {
            alert("Please enter both medicine names.");
            sending = false;
            return;
        }
        payload.med1 = med1;
        payload.med2 = med2;
    } else if (type === 'info') {
        const drugName = document.getElementById('infoDrug').value.trim();
        const selectedBtns = document.querySelectorAll('.info-btn.active');
        const selectedFields = Array.from(selectedBtns).map(btn => btn.dataset.value);
        if (!drugName || selectedFields.length === 0) {
            alert("Please enter drug name and select at least one field.");
            sending = false;
            return;
        }
        payload.medicine = drugName;
        payload.fields = selectedFields;
    }

    try {
        const res = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        const responseDiv = document.getElementById('response');

        if (result.table) {
            // بناء جدول المقارنة
            let html = "<table border='1' style='border-collapse: collapse; width: 100%; text-align: left;'>";
            html += "<thead><tr><th>Field</th><th>Medicine 1</th><th>Medicine 2</th></tr></thead><tbody>";
            result.table.forEach(row => {
                html += `<tr>
                            <td>${row.field}</td>
                            <td>${row.med1}</td>
                            <td>${row.med2}</td>
                         </tr>`;
            });
            html += "</tbody></table>";
            responseDiv.innerHTML = html;
        } else {
            responseDiv.textContent = result.answer;
        }

    } catch (err) {
        document.getElementById('response').textContent = "Error: " + err.message;
    }

    sending = false;
}

function cancelRequest() {
    sending = false;
    document.getElementById('response').textContent = "Request cancelled.";
}

window.onload = function () {
    const responseDiv = document.getElementById('response');
    responseDiv.textContent = "👋 Welcome to the Medical Chatbot! How can I help you today?";
};
