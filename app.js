// Register service worker
console.log('DEV v1 loaded');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}

let linksData = [];
let buildingsData = [];

const loadBtn = document.getElementById('load-btn');
const fileInput = document.getElementById('file-input');
const stageSelect = document.getElementById('stage-select');
const participantSelect = document.getElementById('participant-select');
const buildingSelect = document.getElementById('building-select');
const results = document.getElementById('results');

loadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFile, false);

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    parseSheets(workbook);
    populateDropdowns();
  };
  reader.readAsArrayBuffer(file);
}

function parseSheets(workbook) {
  // Sheet1: Links
  const linksSheet = workbook.Sheets['Links'];
  linksData = XLSX.utils.sheet_to_json(linksSheet, { header: ['Link', 'Stage', 'Participant'], range: 1 });
  // Sheet2: Buildings
  const buildingsSheet = workbook.Sheets['Buildings'];
  buildingsData = XLSX.utils.sheet_to_json(buildingsSheet, { header: ['Building'], range: 1 }).map(row => row.Building);
}

function populateDropdowns() {
  // Stages
  const stages = [...new Set(linksData.map(row => row.Stage))].filter(Boolean).sort();
  stageSelect.innerHTML = '<option value="">Select Stage</option>' + stages.map(s => `<option value="${s}">${s}</option>`).join('');
  stageSelect.disabled = false;
  // Participants
  const participants = [...new Set(linksData.map(row => row.Participant))].filter(Boolean).sort();
  participantSelect.innerHTML = '<option value="">Select Participant</option>' + participants.map(p => `<option value="${p}">${p}</option>`).join('');
  participantSelect.disabled = false;
  // Buildings
  buildingSelect.innerHTML = '<option value="">Select Building</option>' + buildingsData.map(b => `<option value="${b}">${b}</option>`).join('');
  buildingSelect.disabled = false;
}

stageSelect.addEventListener('change', updateResults);
participantSelect.addEventListener('change', updateResults);
buildingSelect.addEventListener('change', updateResults);

function updateResults() {
  let filtered = linksData;
  const stage = stageSelect.value;
  const participant = participantSelect.value;
  const building = buildingSelect.value;
  if (stage) filtered = filtered.filter(row => row.Stage === stage);
  if (participant) filtered = filtered.filter(row => row.Participant === participant);
  if (building) {
    // Only show links if the building is in the Buildings list
    if (!buildingsData.includes(building)) {
      filtered = [];
    }
  }
  results.innerHTML = '';
  if (filtered.length === 0) {
    results.innerHTML = '<li>No results found.</li>';
    return;
  }
  filtered.forEach(row => {
    const li = document.createElement('li');
    li.textContent = `${row.Stage || ''} - ${row.Participant || ''} `;
    const btn = document.createElement('button');
    btn.textContent = 'Open Link';
    btn.disabled = !building;
    btn.onclick = () => {
      if (building) {
        // Ensure no double slashes
        let base = row.Link;
        if (base.endsWith('/')) base = base.slice(0, -1);
        const url = `${base}/${building}`;
        window.open(url, '_blank');
      }
    };
    li.appendChild(btn);
    results.appendChild(li);
  });
}
