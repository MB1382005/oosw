window.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') e.preventDefault();
});

let sending = false;
let selectedStrength = {};
let currentMedicineName = {};
let selectedMedicineName = {};

function showSection(id) {
    document.querySelectorAll('.section').forEach(sec => {
        sec.style.display = 'none';
        const resetButton = sec.querySelector('.reset-btn');
        if (resetButton) resetButton.style.display = 'none';
    });

    const currentSection = document.getElementById(id);
    currentSection.style.display = 'block';
    document.getElementById('response').innerHTML = '';
    selectedStrength = {};
    currentMedicineName[id] = '';
    selectedMedicineName[id] = '';

    ['altFinalBtn', 'compareFinalBtn', 'infoFinalBtn'].forEach(btnId => {
        document.getElementById(btnId).style.display = 'none';
    });

    ['altStrengthButtons', 'compare1StrengthButtons', 'compare2StrengthButtons', 'infoStrengthButtons']
        .forEach(cid => document.getElementById(cid).innerHTML = '');

    const currentResetButton = currentSection.querySelector('.reset-btn');
    if (currentResetButton) currentResetButton.style.display = 'inline-block';
}

function renderStrengthButtons(containerId, strengths, type, medicineName) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const heading = document.createElement('p');
    heading.style.fontWeight = 'bold';
    heading.style.marginBottom = '10px';
    heading.style.fontSize = '18px';
    heading.textContent =
        type === 'compare1'
            ? 'This is the first drug'
            : type === 'compare2'
            ? 'This is the second drug'
            : type === 'info'
            ? 'Information about this drug'
            : type === 'alt'
            ? 'Alternative strengths for this drug'
            : '';
    container.appendChild(heading);

    strengths.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'strength-btn';
        let text = `${medicineName} - ${item.strength} ${item.unit}`;
        if (item.retail_price_bd != null) text += ` – ${item.retail_price_bd} BD`;
        btn.textContent = text;

        btn.addEventListener('click', () => {
            container.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            selectedStrength[type] = { value: item.strength, unit: item.unit };
            selectedMedicineName[type] = medicineName;

            const inputMap = {
                alt: 'altInput',
                info: 'infoDrug',
                compare1: 'compareDrug1',
                compare2: 'compareDrug2'
            };
            document.getElementById(inputMap[type]).value = medicineName;

            if (type === 'alt') {
                document.getElementById('altFinalBtn').style.display = 'inline-block';
            } else if (type === 'info') {
                document.getElementById('infoFinalBtn').style.display = 'inline-block';
            } else if ((type === 'compare1' && selectedStrength.compare2) || (type === 'compare2' && selectedStrength.compare1)) {
                document.getElementById('compareFinalBtn').style.display = 'inline-block';
            }
        });

        container.appendChild(btn);
    });
}

async function fetchStrengths(medName, type) {
    const map = {
        alt: 'altStrengthButtons',
        info: 'infoStrengthButtons',
        compare1: 'compare1StrengthButtons',
        compare2: 'compare2StrengthButtons'
    };
    const container = document.getElementById(map[type]);
    container.innerHTML = '';
    if (!medName) return;

    try {
        const res = await fetch('/api/strengths', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medicine: medName })
        });
        const data = await res.json();
        const list = data.strengths;
        const correctedName = data.medicine_name;

        if (list && list.length) {
            renderStrengthButtons(map[type], list, type, correctedName);
        } else {
            container.innerHTML = '<small>No strengths found</small>';
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<small>Error loading strengths</small>';
    }
}

function isValidMedicineName(name) { 
    return /^[a-zA-Z0-9\s\-\.\/\\%&]+$/.test(name); 
}


async function handleSearch(type) {
    let med;
    if (type === 'alt') {
        med = document.getElementById('altInput').value.trim();
    
        if (!med || !isValidMedicineName(med)) {
            const out = document.getElementById('response');
            out.textContent = 'Enter a valid alternative medicine name';
            out.classList.add('show');
    
            setTimeout(() => {
                out.classList.remove('show');
            }, 4000);
    
            return;
        }
    
        currentMedicineName.alt = med;
    }
     else if (type === 'compare') {
        const m1 = document.getElementById('compareDrug1').value.trim();
        const m2 = document.getElementById('compareDrug2').value.trim();
        currentMedicineName.compare1 = m1;
        currentMedicineName.compare2 = m2;

        if (!m1 || !isValidMedicineName(m1) || !m2 || !isValidMedicineName(m2)) {
            const out = document.getElementById('response');
            out.textContent = 'Enter valid names for both drugs';
            out.classList.add('show');
        
            setTimeout(() => {
                out.classList.remove('show');
            }, 4000);
        
            return;
        }
        
        await fetchStrengths(m1, 'compare1');
        await fetchStrengths(m2, 'compare2');
        return;
    } else if (type === 'info') {
        med = document.getElementById('infoDrug').value.trim();
        currentMedicineName.info = med;
    }

    if (!med || !isValidMedicineName(med)) {
        const out = document.getElementById('response');
        out.textContent = 'Enter a valid medicine name';
        out.classList.add('show');
    
        setTimeout(() => {
            out.classList.remove('show');
        }, 4000);
    
        return;
    }
    

    await fetchStrengths(med, type);
}

async function sendRequest(type) {
    if (sending) return;
    sending = true;
    const out = document.getElementById('response');
    out.innerHTML = '<div class="loading">Loading...</div>';

    let url = '';
    const payload = {};

    if (type === 'alt') {
        url = '/api/alternatives';
        payload.medicine = selectedMedicineName.alt;
        payload.strength_value = selectedStrength.alt?.value;
        payload.strength_unit  = selectedStrength.alt?.unit;
        payload.type = document.getElementById('altType').value;
    } else if (type === 'compare') {
        url = '/api/compare';
        payload.medicine1 = selectedMedicineName.compare1;
        payload.medicine2 = selectedMedicineName.compare2;
        payload.strength1_value = selectedStrength.compare1?.value;
        payload.strength1_unit  = selectedStrength.compare1?.unit;
        payload.strength2_value = selectedStrength.compare2?.value;
        payload.strength2_unit  = selectedStrength.compare2?.unit;
    } else if (type === 'info') {
        url = '/api/info';
        payload.medicine = selectedMedicineName.info;
        payload.strength_value = selectedStrength.info?.value;
        payload.strength_unit  = selectedStrength.info?.unit;
        payload.fields = Array.from(
            document.querySelectorAll('.info-btn.active')
        ).map(b => b.dataset.value);
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        out.innerHTML = '';
        out.style.display = 'block';

        if (type === 'alt' && result.alternatives?.length) {
            const ul = document.createElement('ul');
            result.alternatives.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.medicine_name} - ${item.strength} ${item.unit} : ${item.retail_price_bd} BD`;
                ul.appendChild(li);
            });
            out.appendChild(ul);

        } else if (type === 'compare' && result.comparison?.length) {
            let html = `<table border="1" style="width:100%;border-collapse:collapse"><thead><tr><th>Field</th><th>Med 1</th><th>Med 2</th></tr></thead><tbody>`;
            result.comparison.forEach(r => {
                html += `<tr><td>${r.field}</td><td>${r.med1}</td><td>${r.med2}</td></tr>`;
            });
            html += `</tbody></table>`;
            out.innerHTML = html;

        } else if (type === 'info' && result.info && Object.keys(result.info).length) {
            const dl = document.createElement('dl');
            Object.entries(result.info).forEach(([k, v]) => {
                const dt = document.createElement('dt');
                const dd = document.createElement('dd');
                dt.textContent = k;
                dd.textContent = v;
                dl.appendChild(dt);
                dl.appendChild(dd);
            });
            out.appendChild(dl);

        } else {
            out.textContent = 'No results found.';
        }

    } catch (err) {
        console.error(err);
        out.textContent = 'Error: ' + err.message;

    } finally {
        sending = false;
    }
}

function resetForm(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.querySelectorAll('input[type="text"], select').forEach(input => {
        input.value = '';
    });
    const strengthButtonsContainer = section.querySelector('[id$="StrengthButtons"]');
    if (strengthButtonsContainer) strengthButtonsContainer.innerHTML = '';

    const responseContainer = document.getElementById('response');
    responseContainer.innerHTML = '';

    const finalButton = section.querySelector('[id$="FinalBtn"]');
    if (finalButton) finalButton.style.display = 'none';

    section.querySelectorAll('.info-btn').forEach(btn => btn.classList.remove('active'));

    selectedStrength = {};
    currentMedicineName[sectionId] = '';
    selectedMedicineName[sectionId] = '';
}

window.onload = () => {
    showSection('alt');

    document.querySelectorAll('.section').forEach(section => {
        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = 'btn reset-btn';
        resetButton.textContent = 'Reset';
        resetButton.style.marginTop = '10px';
        resetButton.style.display = section.id === 'alt' ? 'inline-block' : 'none';
        resetButton.addEventListener('click', () => resetForm(section.id));
        section.appendChild(resetButton);
    });

    document.querySelectorAll('.info-btn').forEach(btn =>
        btn.addEventListener('click', () => btn.classList.toggle('active'))
    );

    document.getElementById('altFinalBtn').addEventListener('click', () => sendRequest('alt'));
    document.getElementById('compareFinalBtn').addEventListener('click', () => sendRequest('compare'));
    document.getElementById('infoFinalBtn').addEventListener('click', () => sendRequest('info'));
};
