// Register service worker
console.log('Stage Viewer v2.3 loaded');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}


let linksData = [];
let buildingsData = [];
let filenamesData = [];


const loadBtn = document.getElementById('load-btn');
const fileInput = document.getElementById('file-input');
const stageSelect = document.getElementById('stage-select');
const participantSelect = document.getElementById('participant-select');
const buildingSelect = document.getElementById('building-select');
const results = document.getElementById('results');
const egnyteRootInput = document.getElementById('egnyte-root');
const setRootBtn = document.getElementById('set-root-btn');

// Load Egnyte root from localStorage if available
let egnyteRoot = localStorage.getItem('egnyteRoot') || '';
if (egnyteRoot) egnyteRootInput.value = egnyteRoot;

setRootBtn.addEventListener('click', () => {
  egnyteRoot = egnyteRootInput.value.trim();
  localStorage.setItem('egnyteRoot', egnyteRoot);
  updateResults();
});

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
  // Sheet3: Filename
  const filenameSheet = workbook.Sheets['Filename'];
  if (filenameSheet) {
    filenamesData = XLSX.utils.sheet_to_json(filenameSheet, { header: ['Stage', 'Participant', 'Filename'], range: 1 });
  } else {
    filenamesData = [];
  }
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
  if (stage) filtered = filtered.filter(row => row.Stage === stage);
  if (participant) filtered = filtered.filter(row => row.Participant === participant);
  results.innerHTML = '';
  if (filtered.length === 0) {
    results.innerHTML = '<li>No results found.</li>';
    return;
  }
  // For each matching folder, find all matching files from Filename sheet
  filtered.forEach(row => {
    const files = filenamesData.filter(f =>
      f.Stage === row.Stage && f.Participant === row.Participant
    );
    if (files.length === 0) {
      const li = document.createElement('li');
      li.textContent = `${row.Stage || ''} - ${row.Participant || ''}: No files found.`;
      results.appendChild(li);
      return;
    }
    files.forEach(file => {
      const li = document.createElement('li');
      li.textContent = `${row.Stage || ''} - ${row.Participant || ''}: ${file.Filename}`;

      // Egnyte Desktop local path
      let localPath = '';
      if (egnyteRoot) {
        // Remove leading/trailing slashes from root
        let root = egnyteRoot.replace(/[\\/]+$/, '');
        localPath = `${root}\\${file.Filename}`;
      }

      // Show local path and Copy button
      if (localPath) {
        const pathSpan = document.createElement('span');
        pathSpan.textContent = ` [${localPath}] `;
        pathSpan.style.fontSize = '0.95em';
        pathSpan.style.color = '#1976d2';
        li.appendChild(pathSpan);

        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy Path';
        copyBtn.style.marginLeft = '0.5em';
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(localPath);
        };
        li.appendChild(copyBtn);
      }

      results.appendChild(li);
    });
  });
}
