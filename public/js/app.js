/**
 * Application Core Logic for Cooperative Education Form (Ms-Coop 01-01)
 * คณะวิทยาการจัดการ มหาวิทยาลัยราชภัฏเทพสตรี
 */

// Application State
const State = {
  applications: [],
  currentApp: null,
  isServerOnline: false,
  printMode: 'filled', // 'filled' or 'blank'
  includeSection3: true,
  currentPhotoBase64: ''
};

// Storage keys
const STORAGE_KEY = 'ms_coop_applications_v1';

// Thai Months Array
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  populateDropdowns();
  initEventListeners();
  setDefaultDates();
  await checkBackendAndLoadData();
});

// Check if running on Node.js server or standalone local file
async function checkBackendAndLoadData() {
  try {
    const res = await fetch('/api/applications', { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        State.isServerOnline = true;
        State.applications = result.data;
        updateStorageBadge(true);
        renderApplicationsTable();
        updatePrintStudentSelector();
        // Load latest application into print preview
        if (State.applications.length > 0) {
          State.currentApp = State.applications[0];
          loadIntoPrintSheet(State.applications[0]);
        }
        return;
      }
    }
  } catch (e) {
    console.log('Running in standalone/offline mode using localStorage:', e.message);
  }

  // Fallback to localStorage
  State.isServerOnline = false;
  updateStorageBadge(false);
  loadFromLocalStorage();
  renderApplicationsTable();
  updatePrintStudentSelector();
  if (State.applications.length > 0) {
    State.currentApp = State.applications[0];
    loadIntoPrintSheet(State.applications[0]);
  }
}

function updateStorageBadge(isServer) {
  const badge = document.getElementById('storageStatusBadge');
  if (badge) {
    if (isServer) {
      badge.textContent = '🟢 Server Online (JSON DB)';
      badge.className = 'doc-badge';
      badge.style.background = 'rgba(46, 125, 50, 0.3)';
    } else {
      badge.textContent = '🟡 Local Mode (Browser Storage)';
      badge.className = 'doc-badge';
      badge.style.background = 'rgba(230, 81, 0, 0.3)';
    }
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      State.applications = JSON.parse(raw);
    } else if (typeof SAMPLE_APPLICATIONS !== 'undefined') {
      State.applications = [...SAMPLE_APPLICATIONS];
      saveToLocalStorage();
    }
  } catch (err) {
    console.error('Error loading localStorage:', err);
    State.applications = typeof SAMPLE_APPLICATIONS !== 'undefined' ? [...SAMPLE_APPLICATIONS] : [];
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(State.applications));
  } catch (err) {
    console.error('Error saving localStorage:', err);
  }
}

// Populate Birth Month, Days and Years
function populateDropdowns() {
  // Months
  const monthSelects = ['birthMonth', 'signDateMonth', 'committeeSignMonth'];
  monthSelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">-- เลือกเดือน --</option>';
    THAI_MONTHS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      el.appendChild(opt);
    });
  });

  // Thai Years (Current year + 3 to -70 for birth years and academic years)
  const currentYearBuddhist = new Date().getFullYear() + 543;
  const yearSelects = ['birthYear', 'signDateYear', 'committeeSignYear', 'academicYear'];
  yearSelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">-- เลือกปี พ.ศ. --</option>';
    for (let y = currentYearBuddhist + 3; y >= currentYearBuddhist - 70; y--) {
      const opt = document.createElement('option');
      opt.value = y.toString();
      opt.textContent = y.toString();
      el.appendChild(opt);
    }
  });

  // Days 1-31
  const daySelects = ['birthDate', 'signDateDay', 'committeeSignDay'];
  daySelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">-- วัน --</option>';
    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement('option');
      opt.value = d.toString();
      opt.textContent = d.toString();
      el.appendChild(opt);
    }
  });
}

function setDefaultDates() {
  const now = new Date();
  const currentDay = now.getDate().toString();
  const currentMonth = THAI_MONTHS[now.getMonth()];
  const currentYear = (now.getFullYear() + 543).toString();

  const signDayEl = document.getElementById('signDateDay');
  const signMonthEl = document.getElementById('signDateMonth');
  const signYearEl = document.getElementById('signDateYear');
  const acadYearEl = document.getElementById('academicYear');

  if (signDayEl && !signDayEl.value) signDayEl.value = currentDay;
  if (signMonthEl && !signMonthEl.value) signMonthEl.value = currentMonth;
  if (signYearEl && !signYearEl.value) signYearEl.value = currentYear;
  if (acadYearEl && !acadYearEl.value) acadYearEl.value = currentYear;
}

// Navigation Tabs Handling
function switchTab(tabId) {
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'tab-records') {
    renderApplicationsTable();
  } else if (tabId === 'tab-print') {
    updatePrintStudentSelector();
    // Prioritize active form data if user typed something
    const currentFormData = getFormData();
    if (currentFormData.firstName || currentFormData.studentId) {
      loadIntoPrintSheet(currentFormData);
      const sel = document.getElementById('printStudentSelector');
      if (sel) sel.value = 'current';
    } else if (State.currentApp) {
      loadIntoPrintSheet(State.currentApp);
      const sel = document.getElementById('printStudentSelector');
      if (sel) sel.value = State.currentApp.id;
    } else if (State.applications.length > 0) {
      loadIntoPrintSheet(State.applications[0]);
      const sel = document.getElementById('printStudentSelector');
      if (sel) sel.value = State.applications[0].id;
    } else {
      loadBlankPrintSheet();
    }
  }
}

// Update the student selector dropdown in print toolbar
function updatePrintStudentSelector() {
  const sel = document.getElementById('printStudentSelector');
  if (!sel) return;

  const currentVal = sel.value;
  sel.innerHTML = '<option value="current">✏️ ข้อมูลจากฟอร์มปัจจุบัน</option>';

  State.applications.forEach(app => {
    const opt = document.createElement('option');
    opt.value = app.id;
    opt.textContent = `👤 ${app.studentId || ''} ${app.title || ''}${app.firstName || ''} ${app.lastName || ''}`;
    sel.appendChild(opt);
  });

  if (currentVal && Array.from(sel.options).some(o => o.value === currentVal)) {
    sel.value = currentVal;
  }
}

// Event Listeners Initialization
function initEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Calculate Age on Birth Year Change
  const birthYearInput = document.getElementById('birthYear');
  if (birthYearInput) {
    birthYearInput.addEventListener('change', () => {
      calculateAge();
      updateBirthDatePreview();
      syncFormToPrintSheet();
    });
  }

  const birthDateInput = document.getElementById('birthDate');
  if (birthDateInput) {
    birthDateInput.addEventListener('change', () => {
      updateBirthDatePreview();
      syncFormToPrintSheet();
    });
  }

  const birthMonthInput = document.getElementById('birthMonth');
  if (birthMonthInput) {
    birthMonthInput.addEventListener('change', () => {
      updateBirthDatePreview();
      syncFormToPrintSheet();
    });
  }

  // Update signature name on first/last name change
  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');
  const titleInputs = document.querySelectorAll('input[name="title"]');

  const updatePreviewSign = () => {
    let t = '';
    titleInputs.forEach(r => { if (r.checked) t = r.value; });
    const fn = firstNameInput ? firstNameInput.value.trim() : '';
    const ln = lastNameInput ? lastNameInput.value.trim() : '';
    const signPreview = document.getElementById('formSignNamePreview');
    if (signPreview) {
      signPreview.textContent = (fn || ln) ? `( ${t} ${fn} ${ln} )` : '(...........................................................)';
    }
  };

  if (firstNameInput) firstNameInput.addEventListener('input', () => { updatePreviewSign(); syncFormToPrintSheet(); });
  if (lastNameInput) lastNameInput.addEventListener('input', () => { updatePreviewSign(); syncFormToPrintSheet(); });
  titleInputs.forEach(r => r.addEventListener('change', () => { updatePreviewSign(); syncFormToPrintSheet(); }));

  // Live Sync on Form change/input
  const appForm = document.getElementById('coopAppForm');
  if (appForm) {
    appForm.addEventListener('input', syncFormToPrintSheet);
    appForm.addEventListener('change', syncFormToPrintSheet);
    appForm.addEventListener('submit', handleFormSubmit);
  }

  // Print Student Selector Change
  const printSelector = document.getElementById('printStudentSelector');
  if (printSelector) {
    printSelector.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      if (selectedId === 'current') {
        loadIntoPrintSheet(getFormData());
      } else {
        const found = State.applications.find(a => a.id === selectedId);
        if (found) {
          State.currentApp = found;
          loadIntoPrintSheet(found);
        }
      }
    });
  }

  // Photo Upload Handler
  const photoFileInput = document.getElementById('photoFileInput');
  if (photoFileInput) {
    photoFileInput.addEventListener('change', handlePhotoUpload);
  }

  const removePhotoBtn = document.getElementById('removePhotoBtn');
  if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', removePhoto);
  }

  // Clear Form
  const clearFormBtn = document.getElementById('clearFormBtn');
  if (clearFormBtn) {
    clearFormBtn.addEventListener('click', clearForm);
  }

  // Sample Data Buttons
  const sample1Btn = document.getElementById('sample1Btn');
  if (sample1Btn) {
    sample1Btn.addEventListener('click', () => fillSampleData(0));
  }
  const sample2Btn = document.getElementById('sample2Btn');
  if (sample2Btn) {
    sample2Btn.addEventListener('click', () => fillSampleData(1));
  }

  // Search & Filter in Records Tab
  const searchInput = document.getElementById('searchRecordsInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => filterRecords());
  }
  const majorFilter = document.getElementById('filterMajor');
  if (majorFilter) {
    majorFilter.addEventListener('change', () => filterRecords());
  }

  // Print Action Buttons
  const triggerPrintBtn = document.getElementById('triggerPrintBtn');
  if (triggerPrintBtn) {
    triggerPrintBtn.addEventListener('click', () => window.print());
  }

  const printBlankBtn = document.getElementById('printBlankBtn');
  if (printBlankBtn) {
    printBlankBtn.addEventListener('click', () => {
      State.printMode = 'blank';
      loadBlankPrintSheet();
      window.print();
      State.printMode = 'filled';
      if (State.currentApp) loadIntoPrintSheet(State.currentApp);
      else loadIntoPrintSheet(getFormData());
    });
  }

  const toggleSection3Checkbox = document.getElementById('togglePrintSection3');
  if (toggleSection3Checkbox) {
    toggleSection3Checkbox.addEventListener('change', (e) => {
      State.includeSection3 = e.target.checked;
      const sec3Page = document.getElementById('printPage2');
      if (sec3Page) {
        sec3Page.style.display = e.target.checked ? 'flex' : 'none';
      }
    });
  }

  // Section 3 Toggle in Form
  const toggleSec3Btn = document.getElementById('toggleSection3FormBtn');
  if (toggleSec3Btn) {
    toggleSec3Btn.addEventListener('click', () => {
      const box = document.getElementById('section3CollapsibleBox');
      if (box) {
        box.classList.toggle('open');
        toggleSec3Btn.querySelector('.arrow-icon').textContent = box.classList.contains('open') ? '▲' : '▼';
      }
    });
  }

  // Export / Import
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportToCSV);
  }
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportToJSON);
  }
  const importJsonInput = document.getElementById('importJsonInput');
  if (importJsonInput) {
    importJsonInput.addEventListener('change', importFromJSON);
  }
}

// Calculate Student Age
function calculateAge() {
  const birthYearVal = parseInt(document.getElementById('birthYear').value, 10);
  if (!birthYearVal) return;
  const currentBuddhistYear = new Date().getFullYear() + 543;
  const age = currentBuddhistYear - birthYearVal;
  const ageInput = document.getElementById('age');
  if (ageInput && age > 0 && age < 100) {
    ageInput.value = age.toString();
  }
}

// Update birth date formatted preview text
function updateBirthDatePreview() {
  const d = document.getElementById('birthDate')?.value || '';
  const m = document.getElementById('birthMonth')?.value || '';
  const y = document.getElementById('birthYear')?.value || '';
  const age = document.getElementById('age')?.value || '';
  const preview = document.getElementById('birthDateFormattedPreview');

  if (!preview) return;

  if (d || m || y) {
    let parts = [];
    if (d) parts.push(`วันที่ ${d}`);
    if (m) parts.push(`เดือน ${m}`);
    if (y) parts.push(`พ.ศ. ${y}`);
    if (age) parts.push(`(อายุ ${age} ปี)`);
    preview.textContent = parts.join(' ');
  } else {
    preview.textContent = '-';
  }
}

// Live Sync from Form to Print Sheet
function syncFormToPrintSheet() {
  const currentFormData = getFormData();
  loadIntoPrintSheet(currentFormData);
}

// Photo Upload Handler (Converts to Base64)
function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG)', 'error');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    State.currentPhotoBase64 = event.target.result;
    renderPhotoPreview(State.currentPhotoBase64);
    syncFormToPrintSheet();
    showToast('อัปโหลดรูปถ่ายเรียบร้อยแล้ว', 'success');
  };
  reader.readAsDataURL(file);
}

function renderPhotoPreview(dataUrl) {
  const slot = document.getElementById('formPhotoPreviewSlot');
  const removeBtn = document.getElementById('removePhotoBtn');
  if (!slot) return;

  if (dataUrl) {
    slot.innerHTML = `<img src="${dataUrl}" alt="รูปถ่าย 1 นิ้ว">`;
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  } else {
    slot.innerHTML = '<span>รูปถ่าย<br>ขนาด 1 นิ้ว</span>';
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

function removePhoto() {
  State.currentPhotoBase64 = '';
  const fileInput = document.getElementById('photoFileInput');
  if (fileInput) fileInput.value = '';
  renderPhotoPreview('');
  syncFormToPrintSheet();
}

// Get Data from HTML Form
function getFormData() {
  const form = document.getElementById('coopAppForm');
  if (!form) return {};
  const fd = new FormData(form);
  const data = {};

  for (let [k, v] of fd.entries()) {
    data[k] = v.trim();
  }

  // Handle Radio groups explicitly
  const titleRadio = document.querySelector('input[name="title"]:checked');
  data.title = titleRadio ? titleRadio.value : 'นาย';

  const genderRadio = document.querySelector('input[name="gender"]:checked');
  data.gender = genderRadio ? genderRadio.value : 'ชาย';

  const courseStatusRadio = document.querySelector('input[name="courseCompleteStatus"]:checked');
  data.courseCompleteStatus = courseStatusRadio ? courseStatusRadio.value : 'complete';

  const deptHeadRadio = document.querySelector('input[name="deptHeadDecision"]:checked');
  data.deptHeadDecision = deptHeadRadio ? deptHeadRadio.value : '';

  const deanRadio = document.querySelector('input[name="deanDecision"]:checked');
  data.deanDecision = deanRadio ? deanRadio.value : '';

  const finalRadio = document.querySelector('input[name="finalDecision"]:checked');
  data.finalDecision = finalRadio ? finalRadio.value : '';

  // EIW courses
  data.hasEiwCourses = document.getElementById('hasEiwCourses')?.checked || false;
  data.eiwCourses = [
    document.getElementById('eiwCourse1')?.value.trim() || '',
    document.getElementById('eiwCourse2')?.value.trim() || '',
    document.getElementById('eiwCourse3')?.value.trim() || ''
  ];

  // Photo
  data.photo = State.currentPhotoBase64;

  return data;
}

// Populate HTML Form from Object
function setFormData(data) {
  if (!data) return;

  // Basic Inputs
  const fields = [
    'appId', 'targetSemester', 'academicSemester', 'academicYear',
    'firstName', 'lastName', 'birthDate', 'birthMonth', 'birthYear', 'age',
    'studentId', 'yearLevel', 'major',
    'contactNo', 'contactMoo', 'contactVillage', 'contactSoi', 'contactRoad',
    'contactSubdistrict', 'contactDistrict', 'contactProvince', 'contactZipcode',
    'contactPhone', 'contactEmail', 'contactLineId',
    'companyName', 'companyCoordinator', 'companyDepartment',
    'companyNo', 'companyMoo', 'companySoi', 'companyRoad',
    'companySubdistrict', 'companyDistrict', 'companyProvince', 'companyZipcode',
    'companyPhone', 'companyEmail', 'companyLineId',
    'signDateDay', 'signDateMonth', 'signDateYear',
    'creditsEarned', 'gpa', 'incompleteReason',
    'advisorComment', 'advisorName',
    'deptHeadRejectReason', 'deptHeadName',
    'deanRejectReason', 'deanName',
    'finalPendingReason', 'committeeName',
    'committeeSignDay', 'committeeSignMonth', 'committeeSignYear'
  ];

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = data[id] !== undefined ? data[id] : '';
    }
  });

  // Target semester normalization
  const targetSemEl = document.getElementById('targetSemester');
  if (targetSemEl && data.targetSemester) {
    if (data.targetSemester === '1') targetSemEl.value = 'ภาคการศึกษาที่ 1';
    else if (data.targetSemester === '2') targetSemEl.value = 'ภาคการศึกษาที่ 2';
    else if (data.targetSemester === '3' || data.targetSemester === 'ฤดูร้อน') targetSemEl.value = 'ภาคฤดูร้อน';
    else targetSemEl.value = data.targetSemester;
  }

  // Radios
  if (data.title) {
    const r = document.querySelector(`input[name="title"][value="${data.title}"]`);
    if (r) r.checked = true;
  }
  if (data.gender) {
    const r = document.querySelector(`input[name="gender"][value="${data.gender}"]`);
    if (r) r.checked = true;
  }
  if (data.courseCompleteStatus) {
    const r = document.querySelector(`input[name="courseCompleteStatus"][value="${data.courseCompleteStatus}"]`);
    if (r) r.checked = true;
  }
  if (data.deptHeadDecision) {
    const r = document.querySelector(`input[name="deptHeadDecision"][value="${data.deptHeadDecision}"]`);
    if (r) r.checked = true;
  }
  if (data.deanDecision) {
    const r = document.querySelector(`input[name="deanDecision"][value="${data.deanDecision}"]`);
    if (r) r.checked = true;
  }
  if (data.finalDecision) {
    const r = document.querySelector(`input[name="finalDecision"][value="${data.finalDecision}"]`);
    if (r) r.checked = true;
  }

  // EIW courses
  const eiwChk = document.getElementById('hasEiwCourses');
  if (eiwChk) eiwChk.checked = !!data.hasEiwCourses;
  if (Array.isArray(data.eiwCourses)) {
    if (document.getElementById('eiwCourse1')) document.getElementById('eiwCourse1').value = data.eiwCourses[0] || '';
    if (document.getElementById('eiwCourse2')) document.getElementById('eiwCourse2').value = data.eiwCourses[1] || '';
    if (document.getElementById('eiwCourse3')) document.getElementById('eiwCourse3').value = data.eiwCourses[2] || '';
  }

  // Photo
  State.currentPhotoBase64 = data.photo || '';
  renderPhotoPreview(State.currentPhotoBase64);

  // Update Signature Preview and Birth preview
  const signPreview = document.getElementById('formSignNamePreview');
  if (signPreview) {
    signPreview.textContent = `( ${data.title || ''} ${data.firstName || ''} ${data.lastName || ''} )`;
  }
  updateBirthDatePreview();
}

// Clear Form
function clearForm() {
  const form = document.getElementById('coopAppForm');
  if (form) form.reset();
  document.getElementById('appId').value = '';
  removePhoto();
  setDefaultDates();
  updateBirthDatePreview();
  const signPreview = document.getElementById('formSignNamePreview');
  if (signPreview) signPreview.textContent = '(...........................................................)';
  syncFormToPrintSheet();
  showToast('ล้างข้อมูลในฟอร์มเรียบร้อยแล้ว', 'info');
}

// Fill Sample Data
function fillSampleData(index = 0) {
  if (typeof SAMPLE_APPLICATIONS === 'undefined' || !SAMPLE_APPLICATIONS[index]) return;
  const sample = JSON.parse(JSON.stringify(SAMPLE_APPLICATIONS[index]));
  sample.appId = ''; // Treat as new application unless user explicitly edits
  setFormData(sample);
  syncFormToPrintSheet();
  showToast(`โหลดข้อมูลตัวอย่างนักศึกษาคนที่ ${index + 1} เรียบร้อยแล้ว`, 'success');
}

// Form Submit Handler
async function handleFormSubmit(e) {
  e.preventDefault();
  const formData = getFormData();

  // Basic Validation
  if (!formData.firstName || !formData.lastName) {
    showToast('กรุณากรอกชื่อและนามสกุลของนักศึกษา', 'error');
    document.getElementById('firstName')?.focus();
    return;
  }

  if (!formData.studentId) {
    showToast('กรุณากรอกรหัสประจำตัวนักศึกษา', 'error');
    document.getElementById('studentId')?.focus();
    return;
  }

  if (!formData.companyName) {
    showToast('กรุณากรอกชื่อหน่วยงานสถานที่สหกิจ', 'error');
    document.getElementById('companyName')?.focus();
    return;
  }

  const editingId = formData.appId;
  const isUpdating = !!editingId;

  const currentYearBuddhist = new Date().getFullYear() + 543;
  const targetId = isUpdating ? editingId : `APP-${currentYearBuddhist}-${String(State.applications.length + 1).padStart(3, '0')}`;

  const payload = {
    ...formData,
    id: targetId,
    status: formData.finalDecision === 'approved' ? 'approved' : (formData.finalDecision === 'pending' ? 'rejected' : 'pending'),
    updatedAt: new Date().toISOString()
  };

  if (!isUpdating) {
    payload.createdAt = new Date().toISOString();
  }

  // Save via Server or LocalStorage
  if (State.isServerOnline) {
    try {
      const url = isUpdating ? `/api/applications/${encodeURIComponent(editingId)}` : '/api/applications';
      const method = isUpdating ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        showToast(result.message || 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
        await checkBackendAndLoadData();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.warn('Server save failed, saving to localStorage:', err);
      saveLocal(payload, isUpdating);
    }
  } else {
    saveLocal(payload, isUpdating);
  }

  State.currentApp = payload;
  loadIntoPrintSheet(payload);
  updatePrintStudentSelector();

  // Show Success Modal with options
  showSuccessModal(payload);
}

function saveLocal(payload, isUpdating) {
  if (isUpdating) {
    const idx = State.applications.findIndex(a => a.id === payload.id);
    if (idx !== -1) State.applications[idx] = payload;
    else State.applications.unshift(payload);
  } else {
    State.applications.unshift(payload);
  }
  saveToLocalStorage();
  renderApplicationsTable();
  updatePrintStudentSelector();
  showToast(isUpdating ? 'แก้ไขข้อมูลใบสมัครเรียบร้อยแล้ว' : 'บันทึกใบสมัครใหม่เรียบร้อยแล้ว', 'success');
}

function showSuccessModal(app) {
  const modal = document.getElementById('saveSuccessModal');
  if (!modal) return;
  document.getElementById('modalStudentName').textContent = `${app.title} ${app.firstName} ${app.lastName}`;
  document.getElementById('modalStudentId').textContent = app.studentId;
  document.getElementById('modalCompany').textContent = app.companyName;
  modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Render Applications Table in Records Tab
function renderApplicationsTable(filteredList = null) {
  const list = filteredList !== null ? filteredList : State.applications;
  const tbody = document.getElementById('applicationsTableBody');
  const countBadge = document.getElementById('recordsCountBadge');
  const emptyState = document.getElementById('recordsEmptyState');

  if (countBadge) countBadge.textContent = list.length;
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  let html = '';
  list.forEach((app, idx) => {
    let statusClass = 'pending';
    let statusLabel = 'รอดำเนินการ';
    if (app.status === 'approved' || app.finalDecision === 'approved') {
      statusClass = 'approved';
      statusLabel = 'อนุมัติแล้ว';
    } else if (app.status === 'rejected' || app.finalDecision === 'pending') {
      statusClass = 'rejected';
      statusLabel = 'รอพิจารณา/แก้ไข';
    }

    html += `
      <tr>
        <td style="font-weight:600;">${idx + 1}</td>
        <td><strong>${app.studentId || '-'}</strong></td>
        <td>
          <div style="font-weight:600; color:#1565C0;">${app.title || ''} ${app.firstName || ''} ${app.lastName || ''}</div>
          <div style="font-size:12px; color:#607D8B;">ชั้นปีที่ ${app.yearLevel || '-'} | ${app.major || '-'}</div>
        </td>
        <td>
          <div>${app.companyName || '-'}</div>
          <div style="font-size:12px; color:#607D8B;">${app.companyProvince || ''} | โทร. ${app.companyPhone || '-'}</div>
        </td>
        <td>ภาค ${app.academicSemester || '2'}/${app.academicYear || '2567'}</td>
        <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="viewAndPrintApp('${app.id}')" title="พิมพ์ใบสมัคร Ms-Coop 01-01">
              🖨️ พิมพ์
            </button>
            <button class="btn btn-secondary btn-sm" onclick="editApp('${app.id}')" title="แก้ไขข้อมูล">
              ✏️ แก้ไข
            </button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteApp('${app.id}')" title="ลบข้อมูล">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Filter Records
function filterRecords() {
  const q = (document.getElementById('searchRecordsInput')?.value || '').trim().toLowerCase();
  const major = document.getElementById('filterMajor')?.value || '';

  const filtered = State.applications.filter(app => {
    const matchQ = !q ||
      (app.studentId && app.studentId.toLowerCase().includes(q)) ||
      (app.firstName && app.firstName.toLowerCase().includes(q)) ||
      (app.lastName && app.lastName.toLowerCase().includes(q)) ||
      (app.companyName && app.companyName.toLowerCase().includes(q));

    const matchMajor = !major || app.major === major;
    return matchQ && matchMajor;
  });

  renderApplicationsTable(filtered);
}

// Edit Application
function editApp(id) {
  const app = State.applications.find(a => a.id === id);
  if (!app) return;
  State.currentApp = app;
  setFormData(app);
  document.getElementById('appId').value = app.id;
  switchTab('tab-form');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`กำลังเปิดฟอร์มแก้ไขข้อมูลของ: ${app.firstName} ${app.lastName}`, 'info');
}

// View & Load into Print Preview
function viewAndPrintApp(id) {
  const app = State.applications.find(a => a.id === id);
  if (!app) return;
  State.currentApp = app;
  loadIntoPrintSheet(app);
  const sel = document.getElementById('printStudentSelector');
  if (sel) sel.value = app.id;
  switchTab('tab-print');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Format semester text helper
function formatTargetSemesterText(val) {
  if (!val) return '';
  if (val === '1' || val === 'ภาคการศึกษาที่ 1') return 'ภาคการศึกษาที่ 1';
  if (val === '2' || val === 'ภาคการศึกษาที่ 2') return 'ภาคการศึกษาที่ 2';
  if (val === '3' || val === 'ฤดูร้อน' || val === 'ภาคฤดูร้อน') return 'ภาคฤดูร้อน';
  return val;
}

// ==========================================================================
// RENDER PRINT SHEET (Ms-Coop 01-01)
// บรรจุข้อมูลนักศึกษาลงในเทมเพลตใบพิมพ์ A4 สองหน้า พอดีเป๊ะ
// ==========================================================================

function loadIntoPrintSheet(app) {
  if (!app) return;

  // Set field text helper
  const setTxt = (id, val, defaultVal = '') => {
    const el = document.getElementById(id);
    if (el) el.textContent = (val !== undefined && val !== null && val !== '') ? val : defaultVal;
  };

  // Set checkbox helper
  const setChk = (id, isChecked) => {
    const el = document.getElementById(id);
    if (el) {
      if (isChecked) el.classList.add('checked');
      else el.classList.remove('checked');
    }
  };

  // 1. Photo
  const printPhotoBox = document.getElementById('printPhotoBox');
  if (printPhotoBox) {
    if (app.photo) {
      printPhotoBox.innerHTML = `<img src="${app.photo}" alt="รูปถ่าย">`;
    } else {
      printPhotoBox.innerHTML = `<span>รูปถ่าย<br>ขนาด 1 นิ้ว</span>`;
    }
  }

  // 2. Semester & Year (แก้ปัญหาภาคการศึกษาไม่แสดงอย่างแม่นยำ)
  const targetSem = formatTargetSemesterText(app.targetSemester);
  setTxt('pvTargetSemester', targetSem);
  setTxt('pvAcademicSemester', app.academicSemester || '');
  setTxt('pvAcademicYear', app.academicYear || '');

  // 3. Title Checkboxes & Names
  setChk('pvTitleMr', app.title === 'นาย');
  setChk('pvTitleMrs', app.title === 'นาง');
  setChk('pvTitleMiss', app.title === 'นางสาว');
  setTxt('pvFirstName', app.firstName || '');
  setTxt('pvLastName', app.lastName || '');

  // 4. Gender & Birthdate (แก้ปัญหาวันเดือนปีเกิดไม่แสดงอย่างแม่นยำ)
  setChk('pvGenderMale', app.gender === 'ชาย');
  setChk('pvGenderFemale', app.gender === 'หญิง');
  
  let bDateStr = '';
  if (app.birthDate && app.birthMonth) {
    bDateStr = `${app.birthDate} เดือน ${app.birthMonth}`;
  } else if (app.birthDate) {
    bDateStr = app.birthDate;
  } else if (app.birthMonth) {
    bDateStr = `เดือน ${app.birthMonth}`;
  }
  setTxt('pvBirthDate', bDateStr);
  setTxt('pvBirthYear', app.birthYear || '');
  setTxt('pvAge', app.age || '');

  // 5. Student details
  setTxt('pvStudentId', app.studentId || '');
  setTxt('pvYearLevel', app.yearLevel || '');
  setTxt('pvMajor', app.major || '');

  // 6. Contact address
  setTxt('pvContactNo', app.contactNo || '');
  setTxt('pvContactMoo', app.contactMoo || '');
  setTxt('pvContactVillage', app.contactVillage || '');
  setTxt('pvContactSoi', app.contactSoi || '');
  setTxt('pvContactRoad', app.contactRoad || '');
  setTxt('pvContactSubdistrict', app.contactSubdistrict || '');
  setTxt('pvContactDistrict', app.contactDistrict || '');
  setTxt('pvContactProvince', app.contactProvince || '');
  setTxt('pvContactZipcode', app.contactZipcode || '');
  setTxt('pvContactPhone', app.contactPhone || '');
  setTxt('pvContactEmail', app.contactEmail || '');
  setTxt('pvContactLineId', app.contactLineId || '');

  // 7. Company Details (ส่วนที่ 2)
  setTxt('pvCompanyName', app.companyName || '');
  setTxt('pvCompanyCoordinator', app.companyCoordinator || '');
  setTxt('pvCompanyDepartment', app.companyDepartment || '');
  setTxt('pvCompanyNo', app.companyNo || '');
  setTxt('pvCompanyMoo', app.companyMoo || '');
  setTxt('pvCompanySoi', app.companySoi || '');
  setTxt('pvCompanyRoad', app.companyRoad || '');
  setTxt('pvCompanySubdistrict', app.companySubdistrict || '');
  setTxt('pvCompanyDistrict', app.companyDistrict || '');
  setTxt('pvCompanyProvince', app.companyProvince || '');
  setTxt('pvCompanyZipcode', app.companyZipcode || '');
  setTxt('pvCompanyPhone', app.companyPhone || '');
  setTxt('pvCompanyEmail', app.companyEmail || '');
  setTxt('pvCompanyLineId', app.companyLineId || '');

  // 8. Sign Date and Student Sign
  const fullNameWithTitle = `${app.title || ''} ${app.firstName || ''} ${app.lastName || ''}`.trim();
  setTxt('pvStudentSignName', fullNameWithTitle ? `( ${fullNameWithTitle} )` : '(...........................................................)');
  setTxt('pvSignDay', app.signDateDay || '......');
  setTxt('pvSignMonth', app.signDateMonth || '..................');
  setTxt('pvSignYear', app.signDateYear || '..........');

  // ==================== PAGE 2 (ส่วนที่ 3) ====================
  const isComplete = app.courseCompleteStatus === 'complete';
  setChk('pvCourseComplete', isComplete);
  setChk('pvCourseIncomplete', !isComplete && !!app.incompleteReason);
  setTxt('pvCreditsEarned', isComplete ? (app.creditsEarned || '') : '');
  setTxt('pvGpa', isComplete ? (app.gpa || '') : '');
  setTxt('pvIncompleteReason', !isComplete ? (app.incompleteReason || '') : '');

  // EIW courses
  setChk('pvHasEiw', !!app.hasEiwCourses);
  const eiwArr = Array.isArray(app.eiwCourses) ? app.eiwCourses : ['', '', ''];
  setTxt('pvEiw1', eiwArr[0] || '');
  setTxt('pvEiw2', eiwArr[1] || '');
  setTxt('pvEiw3', eiwArr[2] || '');

  // Advisor
  setTxt('pvAdvisorComment', app.advisorComment || '');
  setTxt('pvAdvisorName', app.advisorName ? `( ${app.advisorName} )` : '(...............................................................)');

  // Dept Head
  setChk('pvDeptApprove', app.deptHeadDecision === 'approve');
  setChk('pvDeptReject', app.deptHeadDecision === 'reject');
  setTxt('pvDeptRejectReason', app.deptHeadDecision === 'reject' ? (app.deptHeadRejectReason || '') : '');
  setTxt('pvDeptHeadName', app.deptHeadName ? `( ${app.deptHeadName} )` : '(................................................................)');

  // Dean
  setChk('pvDeanApprove', app.deanDecision === 'approve');
  setChk('pvDeanReject', app.deanDecision === 'reject');
  setTxt('pvDeanRejectReason', app.deanDecision === 'reject' ? (app.deanRejectReason || '') : '');
  setTxt('pvDeanName', app.deanName ? `( ${app.deanName} )` : '(................................................................)');

  // Final Decision Committee
  setChk('pvFinalApproved', app.finalDecision === 'approved');
  setChk('pvFinalPending', app.finalDecision === 'pending');
  setTxt('pvFinalPendingReason', app.finalDecision === 'pending' ? (app.finalPendingReason || '') : '');
  setTxt('pvCommitteeName', app.committeeName ? `( ${app.committeeName} )` : '(...........................................................)');
  setTxt('pvCommitteeSignDay', app.committeeSignDay || '......');
  setTxt('pvCommitteeSignMonth', app.committeeSignMonth || '..................');
  setTxt('pvCommitteeSignYear', app.committeeSignYear || '..........');

  // Reset Blank class
  document.getElementById('printSheetsContainer')?.classList.remove('blank-print');
}

// Load Blank Print Sheet for Manual Handwriting
function loadBlankPrintSheet() {
  document.getElementById('printSheetsContainer')?.classList.add('blank-print');
  const printPhotoBox = document.getElementById('printPhotoBox');
  if (printPhotoBox) {
    printPhotoBox.innerHTML = `<span>รูปถ่าย<br>ขนาด 1 นิ้ว</span>`;
  }
}

// Export Applications to CSV (Excel-compatible with UTF-8 BOM)
function exportToCSV() {
  if (State.applications.length === 0) {
    showToast('ไม่มีข้อมูลใบสมัครสำหรับส่งออก', 'error');
    return;
  }

  const headers = [
    "รหัสใบสมัคร", "รหัสนักศึกษา", "คำนำหน้า", "ชื่อ", "นามสกุล", "เพศ",
    "วันเกิด", "เดือนเกิด", "พ.ศ. เกิด", "อายุ", "ชั้นปี", "สาขาวิชา",
    "ภาคการศึกษาที่จะไป", "ภาคเรียนที่", "ปีการศึกษา",
    "เบอร์โทรศัพท์", "อีเมล", "Line ID",
    "สถานที่ฝึกงาน", "ผู้ประสานงาน", "แผนก", "จังหวัดสถานที่ฝึกงาน",
    "โทรศัพท์สถานที่ฝึกงาน", "สถานะใบสมัคร"
  ];

  const rows = State.applications.map(a => [
    `"${a.id || ''}"`,
    `"${a.studentId || ''}"`,
    `"${a.title || ''}"`,
    `"${a.firstName || ''}"`,
    `"${a.lastName || ''}"`,
    `"${a.gender || ''}"`,
    `"${a.birthDate || ''}"`,
    `"${a.birthMonth || ''}"`,
    `"${a.birthYear || ''}"`,
    `"${a.age || ''}"`,
    `"${a.yearLevel || ''}"`,
    `"${a.major || ''}"`,
    `"${a.targetSemester || ''}"`,
    `"${a.academicSemester || ''}"`,
    `"${a.academicYear || ''}"`,
    `"${a.contactPhone || ''}"`,
    `"${a.contactEmail || ''}"`,
    `"${a.contactLineId || ''}"`,
    `"${a.companyName || ''}"`,
    `"${a.companyCoordinator || ''}"`,
    `"${a.companyDepartment || ''}"`,
    `"${a.companyProvince || ''}"`,
    `"${a.companyPhone || ''}"`,
    `"${a.status || ''}"`
  ]);

  let csvContent = "\uFEFF"; // UTF-8 BOM for MS Excel
  csvContent += headers.join(",") + "\r\n";
  rows.forEach(r => {
    csvContent += r.join(",") + "\r\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `coop_applications_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('ส่งออกไฟล์ CSV สำหรับ Excel เรียบร้อยแล้ว', 'success');
}

// Export to JSON Backup
function exportToJSON() {
  const jsonStr = JSON.stringify(State.applications, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ms_coop_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('ส่งออกไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว', 'success');
}

// Import from JSON Backup
function importFromJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (Array.isArray(imported)) {
        State.applications = imported;
        if (State.isServerOnline) {
          await fetch('/api/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imported)
          });
        } else {
          saveToLocalStorage();
        }
        renderApplicationsTable();
        updatePrintStudentSelector();
        showToast(`นำเข้าข้อมูลสำเร็จจำนวน ${imported.length} รายการ`, 'success');
      } else {
        showToast('รูปแบบไฟล์ JSON ไม่ถูกต้อง', 'error');
      }
    } catch (err) {
      showToast('ไม่สามารถอ่านไฟล์ JSON ได้: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// Toast Notification Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Expose globals for onclick handlers
window.switchTab = switchTab;
window.fillSampleData = fillSampleData;
window.clearForm = clearForm;
window.editApp = editApp;
window.viewAndPrintApp = viewAndPrintApp;
window.confirmDeleteApp = confirmDeleteApp;
window.executeDeleteApp = executeDeleteApp;
window.closeModal = closeModal;
