import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig, FIREBASE_COLLECTION, USE_FIREBASE } from './firebase-config.js';

const STORAGE_KEY = 'hr018_leave_records_v1';
const $ = (id) => document.getElementById(id);
const leaveTypes = ['กิจ', 'ป่วย', 'คลอดบุตร', 'พักผ่อน'];
let records = [];
let currentPrintId = null;
let db = null;
let leaveCollectionRef = null;
let unsubscribeLeaves = null;
let firebaseReady = false;
let appStarted = false;

const today = () => new Date().toISOString().slice(0, 10);
const thaiDate = (iso) => {
  if (!iso) return '........../..................../............';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' });
};
const shortThaiDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('th-TH') : '......./.............../.......';
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const dotted = (value, width = 110) => `<span class="dotted" style="min-width:${width}px">${esc(value || '')}</span>`;
const check = (active) => `<span class="box">${active ? '✓' : ''}</span>`;

function loadLocalRecords(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveLocalSnapshot(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function isFirebaseConfigured(){
  return USE_FIREBASE && firebaseConfig?.apiKey && !String(firebaseConfig.apiKey).startsWith('YOUR_') && firebaseConfig?.projectId && !String(firebaseConfig.projectId).startsWith('YOUR_');
}
function setDbStatus(text, mode='pending'){
  const el = $('dbStatus');
  if(!el) return;
  el.textContent = text;
  el.className = 'db-pill ' + mode;
}
function stripFirestoreMeta(data){
  const clean = {...data};
  delete clean.createdAtServer;
  delete clean.updatedAtServer;
  return clean;
}
async function initDatabase(){
  if(!isFirebaseConfigured()){
    records = loadLocalRecords();
    currentPrintId = records[0]?.id || null;
    firebaseReady = false;
    setDbStatus('Database: LocalStorage / ยังไม่ได้ตั้งค่า Firebase', 'local');
    return;
  }
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    try { await enableIndexedDbPersistence(db); } catch (_) {}
    leaveCollectionRef = collection(db, FIREBASE_COLLECTION || 'hr018_leave_requests');
    firebaseReady = true;
    setDbStatus('Database: Firebase Firestore', 'online');
    unsubscribeLeaves = onSnapshot(
      query(leaveCollectionRef, orderBy('createdAt', 'desc')),
      (snapshot) => {
        records = snapshot.docs.map(d => stripFirestoreMeta({id:d.id, ...d.data()}));
        if(!currentPrintId && records[0]) currentPrintId = records[0].id;
        if(currentPrintId && !records.some(r => r.id === currentPrintId)) currentPrintId = records[0]?.id || null;
        saveLocalSnapshot();
        if(appStarted) renderAll();
      },
      (error) => {
        console.error(error);
        setDbStatus('Database: Firebase error - ใช้ LocalStorage ชั่วคราว', 'error');
        firebaseReady = false;
        records = loadLocalRecords();
        currentPrintId = records[0]?.id || null;
        renderAll();
      }
    );
  } catch (error) {
    console.error(error);
    firebaseReady = false;
    records = loadLocalRecords();
    currentPrintId = records[0]?.id || null;
    setDbStatus('Database: Firebase config error', 'error');
  }
}
async function persistRecord(record){
  if(firebaseReady && leaveCollectionRef){
    const payload = {...record, updatedAt:new Date().toISOString(), updatedAtServer:serverTimestamp()};
    if(!payload.createdAt) payload.createdAt = new Date().toISOString();
    if(!byId(record.id)) payload.createdAtServer = serverTimestamp();
    await setDoc(doc(db, FIREBASE_COLLECTION, record.id), payload, {merge:true});
  } else {
    const idx = records.findIndex(r => r.id === record.id);
    if(idx >= 0) records[idx] = {...records[idx], ...record, updatedAt:new Date().toISOString()}; else records.unshift(record);
    saveLocalSnapshot();
  }
}
async function removeRecord(id){
  if(firebaseReady && db){
    await deleteDoc(doc(db, FIREBASE_COLLECTION, id));
  } else {
    records = records.filter(r => r.id !== id);
    saveLocalSnapshot();
  }
}
async function importLocalToFirebase(){
  const local = loadLocalRecords();
  if(!local.length){ alert('ไม่พบข้อมูล LocalStorage สำหรับนำเข้า'); return; }
  if(!firebaseReady){ alert('ยังไม่ได้เชื่อมต่อ Firebase กรุณาตั้งค่า firebase-config.js ก่อน'); return; }
  if(!confirm(`ต้องการนำเข้าข้อมูล LocalStorage จำนวน ${local.length} รายการเข้า Firebase ใช่ไหม?`)) return;
  for(const item of local){ await persistRecord({...item, id:item.id || uid(), updatedAt:new Date().toISOString()}); }
  alert('นำเข้าข้อมูลเข้า Firebase เรียบร้อย');
}
function uid(){ return 'LR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,6).toUpperCase(); }
function dateDiffDays(start, end){
  if(!start || !end) return 0;
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  const diff = Math.round((b - a) / 86400000) + 1;
  return diff > 0 ? diff : 0;
}
function getFiscalYear(dateIso){
  const d = dateIso ? new Date(dateIso + 'T00:00:00') : new Date();
  const year = d.getFullYear();
  return d.getMonth() >= 9 ? year + 1 : year;
}
function byId(id){ return records.find(r => r.id === id); }

function switchView(name){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(name + 'View').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === name));
  const title = {dashboard:'ภาพรวมใบลา',form:'สร้าง/แก้ไขใบลา',records:'รายการใบลา',print:'แบบฟอร์มพิมพ์'}[name];
  $('pageTitle').textContent = title;
  if(name === 'print') renderPrint();
}
function initSubstituteInputs(){
  $('substituteInputs').innerHTML = [1,2,3,4].map(i => `
    <div class="sub-card">
      <strong>งานที่ ${i}</strong>
      <label>งาน<input id="subTask${i}" placeholder="รายละเอียดงานที่มอบหมาย" /></label>
      <label>ผู้ปฏิบัติงานแทน<input id="subPerson${i}" placeholder="ชื่อผู้แทน" /></label>
      <label>ลงชื่อ<input id="subSign${i}" placeholder="ชื่อ/ลายเซ็น" /></label>
    </div>`).join('');
}
function getFormData(){
  const substitutes = [1,2,3,4].map(i => ({ task: $('subTask'+i).value, person: $('subPerson'+i).value, sign: $('subSign'+i).value }));
  return {
    id: $('recordId').value || uid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    place:$('place').value, docDate:$('docDate').value, toPerson:$('toPerson').value,
    employeeName:$('employeeName').value, position:$('position').value, department:$('department').value, workStartDate:$('workStartDate').value, tenure:$('tenure').value, vacationQuota:$('vacationQuota').value,
    leaveType:$('leaveType').value, reason:$('reason').value, startDate:$('startDate').value, endDate:$('endDate').value,
    leaveDays:Number($('leaveDays').value || 0), leaveHours:Number($('leaveHours').value || 0), partialDetail:$('partialDetail').value, contactAddress:$('contactAddress').value, phone:$('phone').value,
    lastLeaveType:$('lastLeaveType').value, lastStartDate:$('lastStartDate').value, lastEndDate:$('lastEndDate').value, lastDays:Number($('lastDays').value || 0), lastHours:Number($('lastHours').value || 0),
    substitutes,
    checkerName:$('checkerName').value, checkerPosition:$('checkerPosition').value, checkerDate:$('checkerDate').value,
    supervisorDecision:$('supervisorDecision').value, supervisorRemark:$('supervisorRemark').value, supervisorName:$('supervisorName').value, supervisorPosition:$('supervisorPosition').value, supervisorDate:$('supervisorDate').value,
    approvalStatus:$('approvalStatus').value, approverName:$('approverName').value, approverPosition:$('approverPosition').value, approverDate:$('approverDate').value,
  };
}
function setFormData(r = {}){
  $('recordId').value = r.id || '';
  ['place','docDate','toPerson','employeeName','position','department','workStartDate','tenure','vacationQuota','leaveType','reason','startDate','endDate','leaveDays','leaveHours','partialDetail','contactAddress','phone','lastLeaveType','lastStartDate','lastEndDate','lastDays','lastHours','checkerName','checkerPosition','checkerDate','supervisorDecision','supervisorRemark','supervisorName','supervisorPosition','supervisorDate','approvalStatus','approverName','approverPosition','approverDate'].forEach(id => { if($(id)) $(id).value = r[id] ?? ''; });
  if(!r.id){ $('docDate').value = today(); $('approvalStatus').value = 'รอตรวจสอบ'; $('tenure').value = 'น้อยกว่า 5 ปี'; $('leaveType').value = 'กิจ'; $('supervisorDecision').value = 'เห็นสมควรอนุญาต'; }
  [1,2,3,4].forEach(i => { const s = r.substitutes?.[i-1] || {}; $('subTask'+i).value = s.task || ''; $('subPerson'+i).value = s.person || ''; $('subSign'+i).value = s.sign || ''; });
}
function calculateCurrentDays(){ $('leaveDays').value = dateDiffDays($('startDate').value, $('endDate').value) || $('leaveDays').value || ''; }
async function saveForm(e){
  e.preventDefault();
  const data = getFormData();
  const existing = byId(data.id);
  const payload = {...existing, ...data, createdAt: existing?.createdAt || data.createdAt || new Date().toISOString(), updatedAt:new Date().toISOString()};
  await persistRecord(payload);
  if(!firebaseReady){ const idx = records.findIndex(r => r.id === payload.id); if(idx >= 0) records[idx] = payload; else records.unshift(payload); }
  currentPrintId = payload.id; renderAll(); switchView('print');
}
function resetForm(){ $('leaveForm').reset(); setFormData({}); }
function editRecord(id){ setFormData(byId(id)); switchView('form'); }
async function deleteRecord(id){
  if(!confirm('ต้องการลบใบลานี้ใช่ไหม?')) return;
  await removeRecord(id);
  if(!firebaseReady){ records = records.filter(r => r.id !== id); }
  currentPrintId = records[0]?.id || null; renderAll();
}
async function duplicateRecord(id){
  const src = byId(id); if(!src) return;
  const copy = {...src, id:uid(), docDate:today(), approvalStatus:'รอตรวจสอบ', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()};
  await persistRecord(copy);
  if(!firebaseReady){ records.unshift(copy); }
  currentPrintId = copy.id; renderAll();
}
function statusBadge(status){ const cls = status === 'อนุญาต' ? 'approved' : status === 'ไม่อนุญาต' ? 'rejected' : 'pending'; return `<span class="badge ${cls}">${esc(status || 'รอตรวจสอบ')}</span>`; }
function renderDashboard(){
  $('statTotal').textContent = records.length;
  $('statPending').textContent = records.filter(r => (r.approvalStatus || 'รอตรวจสอบ') === 'รอตรวจสอบ').length;
  $('statApproved').textContent = records.filter(r => r.approvalStatus === 'อนุญาต').length;
  $('statRejected').textContent = records.filter(r => r.approvalStatus === 'ไม่อนุญาต').length;
  $('recentList').innerHTML = records.slice(0,5).map(r => `<div class="mini-item"><strong>${esc(r.employeeName || '-')} · ${esc(r.leaveType)}</strong><span>${thaiDate(r.startDate)} - ${thaiDate(r.endDate)} · ${statusBadge(r.approvalStatus)}</span></div>`).join('') || '<div class="empty-state">ยังไม่มีใบลา</div>';
}
function renderRecords(){
  const q = $('searchBox')?.value?.trim().toLowerCase() || '';
  const list = records.filter(r => [r.employeeName,r.department,r.leaveType,r.approvalStatus].join(' ').toLowerCase().includes(q));
  $('recordsTable').querySelector('tbody').innerHTML = list.map(r => `<tr><td>${shortThaiDate(r.docDate)}</td><td><strong>${esc(r.employeeName || '-')}</strong><br><small>${esc(r.position || '')} ${esc(r.department || '')}</small></td><td>${esc(r.leaveType)}</td><td>${shortThaiDate(r.startDate)} - ${shortThaiDate(r.endDate)}<br><small>${r.leaveDays || 0} วัน ${r.leaveHours || 0} ชม.</small></td><td>${statusBadge(r.approvalStatus)}</td><td><div class="row-actions"><button class="btn ghost" onclick="editRecord('${r.id}')">แก้ไข</button><button class="btn ghost" onclick="currentPrintId='${r.id}';renderAll();switchView('print')">พิมพ์</button><button class="btn ghost" onclick="duplicateRecord('${r.id}')">คัดลอก</button><button class="btn danger" onclick="deleteRecord('${r.id}')">ลบ</button></div></td></tr>`).join('') || `<tr><td colspan="6" class="empty-state">ไม่พบข้อมูล</td></tr>`;
}
function renderPrintSelect(){
  const select = $('printRecordSelect');
  select.innerHTML = records.map(r => `<option value="${r.id}" ${r.id===currentPrintId?'selected':''}>${esc(r.employeeName || '-')} | ${esc(r.leaveType)} | ${shortThaiDate(r.startDate)}</option>`).join('');
  if(!currentPrintId && records[0]) currentPrintId = records[0].id;
}
function calcStats(record){
  const fy = getFiscalYear(record?.startDate);
  const stats = {};
  leaveTypes.forEach(t => {
    const prev = records.filter(r => r.id !== record.id && r.employeeName === record.employeeName && r.leaveType === t && getFiscalYear(r.startDate) === fy && r.approvalStatus !== 'ไม่อนุญาต');
    const prevDays = prev.reduce((sum,r)=>sum + Number(r.leaveDays||0),0);
    const prevHours = prev.reduce((sum,r)=>sum + Number(r.leaveHours||0),0);
    const thisDays = record.leaveType === t ? Number(record.leaveDays||0) : 0;
    const thisHours = record.leaveType === t ? Number(record.leaveHours||0) : 0;
    stats[t] = {prev:`${prevDays} / ${prevHours}`, current:`${thisDays} / ${thisHours}`, total:`${prevDays+thisDays} / ${prevHours+thisHours}`, count:prev.length + (record.leaveType === t ? 1 : 0)};
  });
  return stats;
}
function thaiParts(iso){
  if(!iso) return {day:'', month:'', year:'', full:''};
  const d = new Date(iso + 'T00:00:00');
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  return { day:String(d.getDate()).padStart(2,'0'), month:months[d.getMonth()], year:String(d.getFullYear()+543), full:`${String(d.getDate()).padStart(2,'0')} / ${months[d.getMonth()]} / ${d.getFullYear()+543}` };
}
function pdfStyle(x,y,w=120,h=22){
  const W=1323,H=1874;
  return `left:${(x/W*100).toFixed(4)}%;top:${(y/H*100).toFixed(4)}%;width:${(w/W*100).toFixed(4)}%;min-height:${(h/H*100).toFixed(4)}%;`;
}
function pdfVal(x,y,w,text,cls=''){
  return `<span class="pdf-value ${cls}" style="${pdfStyle(x,y,w)}">${esc(text || '')}</span>`;
}
function pdfTiny(x,y,w,text){ return pdfVal(x,y,w,text,'tiny'); }
function pdfCheck(x,y,active){ return `<span class="pdf-check" style="${pdfStyle(x,y,28,28)}">${active ? '✓' : ''}</span>`; }
function renderPrint(){
  renderPrintSelect();
  const r = byId(currentPrintId) || records[0];
  if(!r){ $('printDocument').innerHTML = '<div class="empty-state">ยังไม่มีข้อมูลใบลา กรุณาสร้างใบลาก่อน</div>'; return; }
  const stats = calcStats(r);
  const dDoc = thaiParts(r.docDate), dStart = thaiParts(r.startDate), dEnd = thaiParts(r.endDate);
  const dWork = thaiParts(r.workStartDate), dLastStart = thaiParts(r.lastStartDate), dLastEnd = thaiParts(r.lastEndDate);
  const dCheck = thaiParts(r.checkerDate), dSup = thaiParts(r.supervisorDate), dApp = thaiParts(r.approverDate);
  const sub = (i) => r.substitutes?.[i] || {};
  const statCell = (type, y) => [
    pdfTiny(255,y,130,stats[type].prev),
    pdfTiny(430,y,130,stats[type].current),
    pdfTiny(610,y,130,stats[type].total),
    pdfTiny(785,y,45,stats[type].count)
  ].join('');
  $('printDocument').innerHTML = `
    <div class="pdf-replica" aria-label="HR-018 ใบลา แบบพิมพ์เหมือนไฟล์แนบ">
      <img class="template-img" src="./assets/hr018-template.png" alt="HR-018 template" />
      ${pdfVal(934,133,330,r.place)}
      ${pdfVal(955,174,48,dDoc.day)}${pdfVal(1030,174,135,dDoc.month)}${pdfVal(1195,174,78,dDoc.year)}
      ${pdfVal(155,214,535,r.toPerson)}
      ${pdfVal(155,253,390,r.employeeName)}${pdfVal(765,253,170,r.position)}${pdfVal(1045,253,185,r.department)}

      ${pdfCheck(242,282,r.leaveType==='กิจ')}${pdfCheck(332,282,r.leaveType==='ป่วย')}${pdfCheck(242,323,r.leaveType==='คลอดบุตร')}${pdfCheck(242,363,r.leaveType==='พักผ่อน')}
      ${pdfVal(455,288,810,r.reason)}
      ${pdfVal(558,361,170,dWork.full)}
      ${pdfCheck(922,352,r.tenure==='น้อยกว่า 5 ปี')}${pdfCheck(1090,352,r.tenure==='5 ปีขึ้นไป')}
      ${pdfVal(333,396,45,r.vacationQuota)}

      ${pdfVal(268,428,48,dStart.day)}${pdfVal(352,428,145,dStart.month)}${pdfVal(526,428,80,dStart.year)}
      ${pdfVal(646,428,48,dEnd.day)}${pdfVal(725,428,145,dEnd.month)}${pdfVal(884,428,80,dEnd.year)}
      ${pdfVal(1050,428,55,r.leaveDays)}${pdfVal(1224,428,50,r.leaveHours)}
      ${pdfVal(478,471,780,r.partialDetail)}
      ${pdfVal(452,510,325,r.contactAddress)}${pdfVal(920,510,235,r.phone)}

      ${pdfCheck(334,565,r.lastLeaveType==='กิจ')}${pdfCheck(438,565,r.lastLeaveType==='ป่วย')}${pdfCheck(560,565,r.lastLeaveType==='คลอดบุตร')}${pdfCheck(736,565,r.lastLeaveType==='พักผ่อน')}
      ${pdfVal(205,622,45,dLastStart.day)}${pdfVal(270,622,145,dLastStart.month)}${pdfVal(470,622,80,dLastStart.year)}
      ${pdfVal(612,622,45,dLastEnd.day)}${pdfVal(675,622,145,dLastEnd.month)}${pdfVal(875,622,80,dLastEnd.year)}
      ${pdfVal(1050,622,55,r.lastDays)}${pdfVal(1224,622,50,r.lastHours)}

      ${pdfVal(172,740,405,sub(0).task)}${pdfVal(252,781,245,sub(0).person)}${pdfVal(482,781,135,sub(0).sign)}
      ${pdfVal(715,740,405,sub(1).task)}${pdfVal(730,781,280,sub(1).person)}${pdfVal(1043,781,135,sub(1).sign)}
      ${pdfVal(172,840,405,sub(2).task)}${pdfVal(252,880,245,sub(2).person)}${pdfVal(482,880,135,sub(2).sign)}
      ${pdfVal(715,840,405,sub(3).task)}${pdfVal(730,880,280,sub(3).person)}${pdfVal(1043,880,135,sub(3).sign)}

      ${statCell('กิจ',1024)}${statCell('ป่วย',1069)}${statCell('คลอดบุตร',1114)}${statCell('พักผ่อน',1157)}
      ${pdfVal(318,1318,260,r.checkerName)}${pdfVal(322,1364,260,r.checkerPosition)}${pdfVal(260,1406,260,dCheck.full)}

      ${pdfVal(960,1010,270,r.employeeName)}${pdfVal(1000,1049,210,r.position)}${pdfVal(963,1090,235,dDoc.full)}
      ${pdfCheck(935,1142,r.supervisorDecision==='เห็นสมควรอนุญาต')}${pdfCheck(935,1185,r.supervisorDecision==='อื่นๆ')}${pdfVal(990,1188,250,r.supervisorRemark)}
      ${pdfVal(995,1280,250,r.supervisorName)}${pdfVal(995,1323,250,r.supervisorPosition)}${pdfVal(963,1364,250,dSup.full)}
      ${pdfCheck(935,1485,r.approvalStatus==='อนุญาต')}${pdfCheck(1090,1485,r.approvalStatus==='ไม่อนุญาต')}
      ${pdfVal(995,1582,250,r.approverName)}${pdfVal(995,1625,250,r.approverPosition)}${pdfVal(963,1666,250,dApp.full)}
    </div>`;
}
function renderAll(){ renderDashboard(); renderRecords(); renderPrintSelect(); renderPrint(); }
function exportJson(){
  const blob = new Blob([JSON.stringify(records,null,2)], {type:'application/json'}); downloadBlob(blob, 'hr018-leave-records.json');
}
function exportCsv(){
  const cols = ['docDate','employeeName','position','department','leaveType','reason','startDate','endDate','leaveDays','leaveHours','approvalStatus'];
  const csv = [cols.join(',')].concat(records.map(r => cols.map(c => '"' + String(r[c] ?? '').replace(/"/g,'""') + '"').join(','))).join('\n');
  downloadBlob(new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'}), 'hr018-leave-records.csv');
}
function downloadBlob(blob, name){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); }

document.addEventListener('DOMContentLoaded', async () => {
  initSubstituteInputs(); setFormData({}); await initDatabase(); appStarted = true; renderAll();
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  document.querySelectorAll('[data-jump="form"], #btnNew').forEach(btn => btn.addEventListener('click', () => { resetForm(); switchView('form'); }));
  $('leaveForm').addEventListener('submit', saveForm);
  $('btnReset').addEventListener('click', resetForm);
  $('startDate').addEventListener('change', calculateCurrentDays); $('endDate').addEventListener('change', calculateCurrentDays);
  $('searchBox').addEventListener('input', renderRecords);
  $('printRecordSelect').addEventListener('change', e => { currentPrintId = e.target.value; renderPrint(); });
  $('btnEditSelected').addEventListener('click', () => currentPrintId && editRecord(currentPrintId));
  $('btnPrintFromForm').addEventListener('click', async () => { const temp = getFormData(); const existing = byId(temp.id); const payload = {...existing, ...temp, createdAt: existing?.createdAt || temp.createdAt || new Date().toISOString(), updatedAt:new Date().toISOString()}; await persistRecord(payload); if(!firebaseReady){ const idx = records.findIndex(r => r.id === payload.id); if(idx >= 0) records[idx] = payload; else records.unshift(payload); } currentPrintId = payload.id; renderAll(); switchView('print'); });
  $('btnImportLocal').addEventListener('click', importLocalToFirebase);
  $('btnExportJson').addEventListener('click', exportJson); $('btnExportCsv').addEventListener('click', exportCsv);
});
window.editRecord = editRecord; window.deleteRecord = deleteRecord; window.duplicateRecord = duplicateRecord; window.switchView = switchView;
