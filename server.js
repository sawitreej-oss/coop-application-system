const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'applications.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize data storage
function initDataStorage() {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    // Initial sample data
    const initialData = [
      {
        id: "APP-2567-001",
        createdAt: "2026-03-10T09:30:00.000Z",
        updatedAt: "2026-03-10T09:30:00.000Z",
        status: "approved",
        // ข้อมูลการศึกษา
        targetSemester: "2",
        academicSemester: "2",
        academicYear: "2567",
        // ส่วนที่ 1: ข้อมูลนักศึกษา
        title: "นาย",
        firstName: "ธนภัทร",
        lastName: "สุขเกษม",
        gender: "ชาย",
        birthDate: "15",
        birthMonth: "พฤษภาคม",
        birthYear: "2546",
        age: "21",
        studentId: "6411234001",
        yearLevel: "4",
        major: "สาขาวิชาบริหารธุรกิจ วิชาเอกการจัดการ",
        // ที่อยู่นักศึกษา
        contactNo: "124/5",
        contactMoo: "3",
        contactVillage: "บ้านสวนร่มรื่น",
        contactSoi: "สุขเกษม 2",
        contactRoad: "นารายณ์มหาราช",
        contactSubdistrict: "ทะเลชุบศร",
        contactDistrict: "เมืองลพบุรี",
        contactProvince: "ลพบุรี",
        contactZipcode: "15000",
        contactPhone: "089-123-4567",
        contactEmail: "thanapat.suk@ms-tru.ac.th",
        contactLineId: "thanapat_suk",
        photo: "",
        // ส่วนที่ 2: สถานที่ปฏิบัติงานสหกิจ
        companyName: "บริษัท สหกิจพัฒนาการอุตสาหกรรม จำกัด",
        companyCoordinator: "คุณวิภาวรรณ น้อมเกล้า (ผู้จัดการฝ่ายทรัพยากรบุคคล)",
        companyDepartment: "ฝ่ายบริหารทรัพยากรบุคคลและพัฒนาองค์กร",
        companyNo: "88/9",
        companyMoo: "1",
        companySoi: "พัฒนาการ 1",
        companyRoad: "พหลโยธิน",
        companySubdistrict: "เขาสามยอด",
        companyDistrict: "เมืองลพบุรี",
        companyProvince: "ลพบุรี",
        companyZipcode: "15000",
        companyPhone: "036-789-012, 081-456-7890",
        companyEmail: "hr@sahakit-industry.co.th",
        companyLineId: "sahakit_hr",
        signDateDay: "12",
        signDateMonth: "มีนาคม",
        signDateYear: "2567",
        // ส่วนที่ 3: ผลการพิจารณา
        courseCompleteStatus: "complete", // complete or incomplete
        creditsEarned: "102",
        gpa: "3.45",
        incompleteReason: "",
        hasEiwCourses: false,
        eiwCourses: ["", "", ""],
        advisorComment: "นักศึกษามีผลการเรียนดี มีวินัย และมีความพร้อมในการออกปฏิบัติสหกิจศึกษาตามเกณฑ์",
        advisorName: "ผศ.ดร.สมชาย ใจดี",
        deptHeadDecision: "approve", // approve or reject
        deptHeadRejectReason: "",
        deptHeadName: "อ.ดร.ประเสริฐ วิทยาการ",
        deanDecision: "approve",
        deanRejectReason: "",
        deanName: "รศ.มานพ สถิตย์วงศ์",
        finalDecision: "approved", // approved or pending
        finalPendingReason: "",
        committeeName: "ผศ.วรัญญา แก้วมณี",
        committeeSignDay: "20",
        committeeSignMonth: "มีนาคม",
        committeeSignYear: "2567"
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

function readApplications() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading data:', err);
    return [];
  }
}

function writeApplications(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing data:', err);
    return false;
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  // Normalize and prevent directory traversal
  const resolved = path.resolve(PUBLIC_DIR, '.' + safePath);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  fs.stat(resolved, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA-like navigation if not an API
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(resolved, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('500 Server Error');
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) { // 15MB limit for photos
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Enable CORS for local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // JSON API Routes
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // GET /api/applications
    if (pathname === '/api/applications' && method === 'GET') {
      const apps = readApplications();
      const q = (parsedUrl.query.q || '').trim().toLowerCase();
      const major = (parsedUrl.query.major || '').trim();
      const status = (parsedUrl.query.status || '').trim();

      let filtered = apps;
      if (q) {
        filtered = filtered.filter(a =>
          (a.studentId && a.studentId.toLowerCase().includes(q)) ||
          (a.firstName && a.firstName.toLowerCase().includes(q)) ||
          (a.lastName && a.lastName.toLowerCase().includes(q)) ||
          (a.companyName && a.companyName.toLowerCase().includes(q))
        );
      }
      if (major) {
        filtered = filtered.filter(a => a.major === major);
      }
      if (status) {
        filtered = filtered.filter(a => a.status === status);
      }

      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, data: filtered }));
    }

    // GET /api/applications/:id
    const singleMatch = pathname.match(/^\/api\/applications\/([^\/]+)$/);
    if (singleMatch && method === 'GET') {
      const id = decodeURIComponent(singleMatch[1]);
      const apps = readApplications();
      const item = apps.find(a => a.id === id);
      if (!item) {
        res.writeHead(404);
        return res.end(JSON.stringify({ success: false, message: 'ไม่พบข้อมูลใบสมัคร' }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, data: item }));
    }

    // POST /api/applications
    if (pathname === '/api/applications' && method === 'POST') {
      try {
        const payload = await parseBody(req);
        const apps = readApplications();

        const timestamp = new Date();
        const yearTh = (timestamp.getFullYear() + 543).toString();
        const seq = String(apps.length + 1).padStart(3, '0');
        const generatedId = payload.id || `APP-${yearTh}-${seq}`;

        const newApp = {
          ...payload,
          id: generatedId,
          createdAt: timestamp.toISOString(),
          updatedAt: timestamp.toISOString(),
          status: payload.status || 'pending'
        };

        apps.unshift(newApp);
        writeApplications(apps);

        res.writeHead(201);
        return res.end(JSON.stringify({
          success: true,
          message: 'บันทึกใบสมัครเข้าสู่ระบบเรียบร้อยแล้ว',
          data: newApp
        }));
      } catch (err) {
        res.writeHead(400);
        return res.end(JSON.stringify({ success: false, message: 'ข้อมูลไม่ถูกต้อง: ' + err.message }));
      }
    }

    // PUT /api/applications/:id
    if (singleMatch && method === 'PUT') {
      try {
        const id = decodeURIComponent(singleMatch[1]);
        const payload = await parseBody(req);
        const apps = readApplications();
        const index = apps.findIndex(a => a.id === id);

        if (index === -1) {
          res.writeHead(404);
          return res.end(JSON.stringify({ success: false, message: 'ไม่พบข้อมูลใบสมัครที่ต้องการแก้ไข' }));
        }

        const updated = {
          ...apps[index],
          ...payload,
          id: id,
          updatedAt: new Date().toISOString()
        };

        apps[index] = updated;
        writeApplications(apps);

        res.writeHead(200);
        return res.end(JSON.stringify({
          success: true,
          message: 'ปรับปรุงข้อมูลใบสมัครเรียบร้อยแล้ว',
          data: updated
        }));
      } catch (err) {
        res.writeHead(400);
        return res.end(JSON.stringify({ success: false, message: 'ข้อมูลไม่ถูกต้อง: ' + err.message }));
      }
    }

    // DELETE /api/applications/:id
    if (singleMatch && method === 'DELETE') {
      const id = decodeURIComponent(singleMatch[1]);
      let apps = readApplications();
      const initLen = apps.length;
      apps = apps.filter(a => a.id !== id);

      if (apps.length === initLen) {
        res.writeHead(404);
        return res.end(JSON.stringify({ success: false, message: 'ไม่พบข้อมูลใบสมัครที่ต้องการลบ' }));
      }

      writeApplications(apps);
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, message: 'ลบข้อมูลใบสมัครเรียบร้อยแล้ว' }));
    }

    // POST /api/seed (reset sample data)
    if (pathname === '/api/seed' && method === 'POST') {
      try {
        const sampleSeed = await parseBody(req);
        let dataToSeed = Array.isArray(sampleSeed) && sampleSeed.length > 0 ? sampleSeed : null;
        if (!dataToSeed) {
          fs.unlinkSync(DATA_FILE);
          initDataStorage();
          dataToSeed = readApplications();
        } else {
          writeApplications(dataToSeed);
        }
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true, message: 'สร้างข้อมูลทดสอบเรียบร้อยแล้ว', data: dataToSeed }));
      } catch (err) {
        res.writeHead(500);
        return res.end(JSON.stringify({ success: false, message: err.message }));
      }
    }

    // Unknown API
    res.writeHead(404);
    return res.end(JSON.stringify({ success: false, message: 'Endpoint not found' }));
  }

  // Serve static files
  serveStatic(req, res, pathname);
});

// Start listening
initDataStorage();
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`ระบบบันทึกใบสมัครสหกิจศึกษา (Ms-Coop 01-01) พร้อมทำงานแล้ว!`);
  console.log(`เปิดใช้งานได้ที่: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
