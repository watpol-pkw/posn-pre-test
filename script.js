const DB_URL = 'https://posn-registration-default-rtdb.asia-southeast1.firebasedatabase.app/';
    const SECRET = 'qIqIxmRQXI9WnMsoMeGCOGoxeOpTcWryvMbCpHD9'; 
    
    const db = {
      url: path => `${DB_URL}${path}.json?auth=${SECRET}`,
      get: async path => { const r = await fetch(db.url(path)); return r.ok ? await r.json() : null; },
      put: async (path, data) => await fetch(db.url(path), { method:'PUT', body:JSON.stringify(data) }),
      patch: async (path, data) => await fetch(db.url(path), { method:'PATCH', body:JSON.stringify(data) }),
      del: async path => await fetch(db.url(path), { method:'DELETE' })
    };

    let u=null, r=null, allExams=[], currentExamId=null, regsCache=[], roomsCache=[], allStudents=[];

    const showLoad = s => {
      const l = document.getElementById('loading');
      if(s) { l.classList.remove('app-hidden'); setTimeout(()=>l.style.opacity='1',10); }
      else { l.style.opacity='0'; setTimeout(()=>l.classList.add('app-hidden'),300); }
    };
    
    // Export Modals Logic
    function closeModalExportList() {
      const card = document.getElementById('mel-card');
      if (card) {
        card.classList.add('translate-x-full');
        card.classList.remove('translate-x-0');
      }
      setTimeout(() => {
        document.getElementById('modal-export-list').classList.add('app-hidden');
        // If modal-exam was opened, it might have been hidden, so ensure it is visible if needed
        // But since we just slide over it, we don't necessarily hide it. Let's just remove the export list.
      }, 300);
    }

    function closeModal(id) {
      if (id === 'modal-export-list') {
        closeModalExportList();
        return;
      }
      document.getElementById(id).classList.add('app-hidden');
    }
    
    function togglePasswordVisibility() {
      const p = document.getElementById('login-pass');
      const i = document.getElementById('eye-icon');
      if (p.type === 'password') {
        p.type = 'text';
        i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>';
      } else {
        p.type = 'password';
        i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
      }
    }
    
    function toggleSidebar() {
      const sb = document.getElementById('sidebar');
      if(window.innerWidth >= 1024) {
        sb.classList.toggle('desktop-closed');
      } else {
        sb.classList.toggle('-translate-x-full');
        document.getElementById('sidebar-overlay').classList.toggle('app-hidden');
      }
    }

    const sAlert = (title, text, icon='info') => Swal.fire({ title, text, icon, confirmButtonText: 'ตกลง', confirmButtonColor: '#4f46e5' });
    const sConfirm = async (title, text) => {
      const res = await Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#ef4444', confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก' });
      return res.isConfirmed;
    };

    function formatThaiDate(isoString) {
      if(!isoString) return '-';
      const d = new Date(isoString);
      if(isNaN(d)) return isoString;
      const thMonth = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
      return `${d.getDate()} ${thMonth[d.getMonth()]} ${d.getFullYear() + 543}`;
    }

    function updateClock() {
      const now = new Date();
      document.getElementById('real-date').textContent = formatThaiDate(now);
      document.getElementById('real-time').textContent = now.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) + ' น.';
    }
    setInterval(updateClock, 1000); updateClock();

    function switchView(v) {
      document.getElementById('app').innerHTML = '';
      const tpl = document.getElementById('view-'+v);
      if(tpl) document.getElementById('app').appendChild(tpl.cloneNode(true));
      
      const sb = document.getElementById('sidebar');
      const tn = document.getElementById('topnav');
      
      if(v==='login' || v==='register') { 
        sb.classList.add('app-hidden'); tn.classList.add('app-hidden');
      } else { 
        sb.classList.remove('app-hidden'); tn.classList.remove('app-hidden');
        document.getElementById('nav-avatar').src = u.avatar || 'https://img2.pic.in.th/PKW-Mascotace29467b055eb87.png';
        document.getElementById('nav-name').textContent = u.firstName ? `${u.firstName} ${u.lastName}` : u.name;
        document.getElementById('nav-role').textContent = r==='student' ? `ชั้น ${u.grade}/${u.room}` : u.name; 
      }
    }

    function renderMenu(activeId) {
      const menu = document.getElementById('sb-menu'); menu.innerHTML = '';
      const iconClass = "w-5 h-5";
      const addItem = (id, iconSvg, text, view) => {
        const act = activeId === id ? 'active' : '';
        menu.innerHTML += `<div onclick="renderMenu('${id}'); switchView('${view}'); if(window.innerWidth<1024) toggleSidebar(); initView('${id}');" class="menu-item ${act}">${iconSvg} <span>${text}</span></div>`;
      };
      
      if(r==='student') {
        addItem('home', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`, 'หน้าหลัก', 'sd-home');
        addItem('enroll', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>`, 'สมัครสอบ', 'sd-enroll');
        addItem('tickets', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>`, 'บัตรเข้าสอบ', 'sd-tickets');
        addItem('results', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`, 'ผลการสอบ', 'sd-results');
        addItem('profile', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`, 'แก้ไขข้อมูล', 'sd-profile');
      } else {
        const isExec = u.role === 'executive';
        const isMgr = u.role === 'manager';
        
        if (isExec) {
          addItem('ad-home', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"></path></svg>`, 'แผงควบคุม', 'ad-home');
          addItem('ad-subj-scores', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z"></path><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"></path></svg>`, 'คะแนนรายวิชา', 'ad-subj-scores');
          addItem('ad-indiv-scores', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path></svg>`, 'คะแนนรายบุคคล', 'ad-indiv-scores');
          addItem('ad-reports', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>`, 'รายงานผล', 'ad-reports');
        } else {
          addItem('ad-home', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"></path></svg>`, 'แผงควบคุม', 'ad-home');
          if(!isMgr) addItem('ad-students', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`, 'จัดการนักเรียน', 'ad-students');
          addItem('ad-exams', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>`, 'จัดการวิชาสอบ', 'ad-exams');
          addItem('ad-rooms', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`, 'จัดห้องสอบ', 'ad-rooms');
          if(!isMgr) addItem('ad-scores', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`, 'บันทึกคะแนน', 'ad-scores');
          addItem('ad-subj-scores', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z"></path><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"></path></svg>`, 'คะแนนรายวิชา', 'ad-subj-scores');
          addItem('ad-indiv-scores', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path></svg>`, 'คะแนนรายบุคคล', 'ad-indiv-scores');
          addItem('ad-reports', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>`, 'รายงานผล', 'ad-reports');
          if(!isMgr) addItem('ad-announce', `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>`, 'แจ้งประกาศ', 'ad-announce');
        }
      }
    }

    function initView(id) {
      if(id==='home') loadSdHome();
      else if(id==='enroll') loadSdEnroll();
      else if(id==='tickets') loadSdTickets();
      else if(id==='results') loadSdResults();
      else if(id==='profile') loadSdProfile();
      else if(id==='ad-home') loadAdHome();
      else if(id==='ad-students') loadAdStudents();
      else if(id==='ad-exams') loadAdExams();
      else if(id==='ad-rooms') loadAdRooms();
      else if(id==='ad-scores') loadAdScoresMenu();
      else if(id==='ad-subj-scores') loadAdSubjScoresMenu();
      else if(id==='ad-indiv-scores') loadAdIndivScoresMenu();
      else if(id==='ad-announce') loadAdAnnounce();
      else if(id==='ad-reports') loadAdReports();
    }

    // Force init roles in DB if not exist (fixes Manager/Executive login issue)
    async function initRolesDB() {
      const a = await db.get('admins');
      if(!a || !a.posnpkw || !a.vicha || !a.admin) {
        const ups = {};
        if(!a || !a.admin) ups['admin'] = { password:'admin', name:'Super Admin', role:'admin' };
        if(!a || !a.posnpkw) ups['posnpkw'] = { password:'posn1234pkw', name:'ผู้จัดการ', role:'manager' };
        if(!a || !a.vicha) ups['vicha'] = { password:'vi1234', name:'ผู้บริหาร', role:'executive' };
        if(Object.keys(ups).length) await db.patch('admins', ups);
      }
    }

    document.addEventListener('DOMContentLoaded', async () => {
      try { await initRolesDB(); } catch(e){}
      checkSess();
    });

    function checkSess() {
      const s = sessionStorage.getItem('posnSess');
      if(s) { 
        const p=JSON.parse(s); u=p.u; r=p.r;
        let defTab = 'ad-home';
        if(r === 'student') defTab = 'home';
        
        renderMenu(defTab); 
        switchView(r==='student'?'sd-home':'ad-home');
        initView(defTab); 
      }
      else { switchView('login'); }
    }
    
    async function logout() {
      if(await sConfirm('ออกจากระบบ', 'คุณต้องการออกจากระบบใช่หรือไม่?')) { sessionStorage.removeItem('posnSess'); u=null; r=null; checkSess(); }
    }

    async function handleLogin(e) {
      e.preventDefault(); showLoad(true);
      const id = document.getElementById('login-id').value.trim();
      const pass = document.getElementById('login-pass').value;
      
      let role = 'student';
      let data = await db.get(`users/${id}`);
      
      if (!data) {
        data = await db.get(`admins/${id}`);
        if (data) role = 'admin';
      }
      
      showLoad(false);
      if(data && data.password===pass) {
        if(role!=='admin') data.studentId = id;
        sessionStorage.setItem('posnSess', JSON.stringify({u:data, r:role})); checkSess();
      } else { sAlert('ผิดพลาด', 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง', 'error'); }
    }

    async function handleRegister(e) {
      e.preventDefault(); showLoad(true);
      const id = document.getElementById('reg-id').value;
      const d = { password:document.getElementById('reg-pass').value, prefix:document.getElementById('reg-prefix').value, firstName:document.getElementById('reg-first').value, lastName:document.getElementById('reg-last').value, grade:document.getElementById('reg-grade').value, room:document.getElementById('reg-room').value, rollNumber:document.getElementById('reg-roll').value, phone:document.getElementById('reg-phone').value, role:'student' };
      if(await db.get(`users/${id}`)) { showLoad(false); sAlert('ไม่สำเร็จ','รหัสนักเรียนนี้ถูกใช้ลงทะเบียนไปแล้ว!','error'); return; }
      await db.put(`users/${id}`, d); showLoad(false);
      sAlert('สำเร็จ','ลงทะเบียนเรียบร้อย กรุณาเข้าสู่ระบบ','success').then(()=>switchView('login'));
    }

    /* ---- STUDENT LOGIC ---- */
    async function fetchSdData() {
      const [ex, rg, an, rm] = await Promise.all([db.get('exams'), db.get('registrations'), db.get('announcement'), db.get('rooms')]);
      const exams = ex ? Object.keys(ex).map(k=>({id:k,...ex[k]})) : [];
      const regs = rg ? Object.keys(rg).map(k=>({id:k,...rg[k]})).filter(x=>x.studentId===u.studentId) : [];
      const rooms = rm || {};
      const allRegsList = rg ? Object.keys(rg).map(k=>({id:k,...rg[k]})) : [];
      return { exams, regs, an, rooms, allRegsList };
    }

    async function loadSdHome() {
      showLoad(true); const d = await fetchSdData(); showLoad(false);
      document.getElementById('home-name').textContent = `${u.prefix||''} ${u.firstName} ${u.lastName}`;
      document.getElementById('home-info').textContent = `ชั้น ${u.grade}/${u.room} เลขที่ ${u.rollNumber} | รหัส: ${u.studentId}`;
      document.getElementById('home-announcement').textContent = d.an ? d.an.text : 'ไม่มีประกาศ';
      
      const today = new Date().toISOString().split('T')[0];
      const up = d.regs.map(r=>{
        const ex = d.exams.find(x=>x.id===r.examId);
        return ex && ex.date >= today ? {...ex} : null;
      }).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date));

      let h = ''; up.forEach(e => {
        h += `<div class="border border-slate-200 p-4 rounded-xl bg-white shadow-sm flex flex-col justify-center hover:-translate-y-1 transition-transform cursor-pointer" onclick="renderMenu('tickets'); switchView('sd-tickets'); initView('tickets');">
          <strong class="text-indigo-900 text-lg">[${e.code||'-'}] ${e.name}</strong>
          <span class="text-slate-500 text-sm mt-1 flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> ${formatThaiDate(e.date)} | ${e.startTime}-${e.endTime} น.</span>
        </div>`;
      });
      document.getElementById('home-upcoming').innerHTML = h || '<div class="col-span-2 text-center text-slate-500 p-6 bg-slate-50 rounded-xl border border-slate-200">ไม่มีวิชาสอบที่กำลังจะมาถึง</div>';
    }

    async function loadSdEnroll() {
      showLoad(true); const d = await fetchSdData(); showLoad(false);
      const avail = d.exams.filter(ex=>ex.allowedGrades && ex.allowedGrades.includes(u.grade));
      const myIds = d.regs.map(r=>r.examId);
      const today = new Date().toISOString().split('T')[0];

      let h = ''; avail.forEach(e => {
        const isReg = myIds.includes(e.id);
        const isOpen = today >= e.regOpenDate && today <= e.regCloseDate;
        const isFull = e.capacity !== 999 && (e.enrolledCount||0) >= e.capacity;
        
        let btn = `<button onclick="regExam('${e.id}')" class="w-full mt-4 py-2.5 rounded-xl font-bold shadow-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700">สมัครสอบวิชานี้</button>`;
        if(isReg) {
          if (isOpen) {
            btn = `<button onclick="cancelReg('${e.id}')" class="w-full mt-4 py-2.5 rounded-xl font-bold shadow-sm transition-all bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200">❌ ยกเลิกการสมัคร</button>`;
          } else {
            btn = `<button disabled class="w-full mt-4 py-2.5 rounded-xl font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✅ สมัครแล้ว</button>`;
          }
        }
        else if(!isOpen) btn = `<button disabled class="w-full mt-4 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-400">ไม่อยู่ในช่วงรับสมัคร</button>`;
        else if(isFull) btn = `<button disabled class="w-full mt-4 py-2.5 rounded-xl font-bold bg-rose-50 text-rose-500 border border-rose-200">ที่นั่งเต็ม</button>`;

        h += `<div class="glass-card p-6 border border-slate-200 flex flex-col justify-between hover:shadow-lg transition-all">
          <div><div class="flex justify-between items-start mb-2"><strong class="text-xl text-indigo-900">[${e.code||'-'}] ${e.name}</strong><span class="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded">รับ ${e.capacity===999?'ไม่จำกัด':`${e.enrolledCount||0}/${e.capacity}`}</span></div>
          <div class="text-slate-600 text-sm mb-1">📅 ${formatThaiDate(e.date)} | ⏱ ${e.startTime}-${e.endTime} น.</div>
          <div class="text-xs font-bold text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded mt-2">รับสมัคร: ${formatThaiDate(e.regOpenDate)} - ${formatThaiDate(e.regCloseDate)}</div></div>${btn}
        </div>`;
      });
      document.getElementById('enroll-list').innerHTML = h || '<div class="col-span-2 text-center text-slate-500">ไม่มีวิชาที่เปิดรับสมัคร</div>';
    }

    async function regExam(id) {
      if(!await sConfirm('ยืนยันสมัครสอบ','คุณต้องการสมัครสอบวิชานี้ใช่หรือไม่?')) return;
      showLoad(true); 
      const ex = await db.get(`exams/${id}`);
      if(ex.capacity !== 999 && (ex.enrolledCount||0)>=ex.capacity) { showLoad(false); return sAlert('ไม่สำเร็จ','ที่นั่งเต็มแล้ว','error'); }
      
      const rO = await db.get('registrations');
      const myRegs = Object.keys(rO||{}).map(k=>rO[k]).filter(r=>r.studentId===u.studentId);
      const eO = await db.get('exams');
      const allEx = eO ? Object.keys(eO).map(k=>({id:k,...eO[k]})) : [];
      
      for(const r of myRegs) {
        const oEx = allEx.find(x=>x.id===r.examId);
        if(oEx && oEx.date === ex.date) {
          if(oEx.startTime < ex.endTime && oEx.endTime > ex.startTime) {
            showLoad(false); 
            return sAlert('ไม่สามารถสมัครได้', `เวลาสอบชนกับวิชา [${oEx.code||'-'}] ${oEx.name}`, 'error');
          }
        }
      }

      await db.put(`registrations/${u.studentId}_${id}`, { studentId:u.studentId, examId:id, timestamp:new Date().toISOString(), roomId:'', seatNumber:'', score:'', isAbsent:false });
      await db.patch(`exams/${id}`, { enrolledCount:(ex.enrolledCount||0)+1 });
      showLoad(false); sAlert('สำเร็จ','สมัครสอบเรียบร้อยแล้ว','success'); initView('enroll');
    }

    async function cancelReg(id) {
      if(!await sConfirm('ยืนยันยกเลิก','คุณต้องการยกเลิกการสมัครสอบวิชานี้ใช่หรือไม่?')) return;
      showLoad(true); const ex = await db.get(`exams/${id}`);
      await db.del(`registrations/${u.studentId}_${id}`);
      if(ex && ex.enrolledCount > 0) {
        await db.patch(`exams/${id}`, { enrolledCount: (ex.enrolledCount||1) - 1 });
      }
      showLoad(false); sAlert('สำเร็จ','ยกเลิกการสมัครเรียบร้อยแล้ว','success'); initView('enroll');
    }

    async function loadSdTickets() {
      showLoad(true); const d = await fetchSdData(); showLoad(false);
      const validRegs = d.regs.filter(r=>d.exams.some(x=>x.id===r.examId));
      let h = ''; validRegs.forEach(r => {
        const ex = d.exams.find(x=>x.id===r.examId);
        const rm = r.roomId && d.rooms[ex.id] ? d.rooms[ex.id][r.roomId] : null;
        const rmName = rm ? rm.name : 'รอประกาศ';
        const seat = r.seatNumber ? String(r.seatNumber).padStart(2,'0') : '-';
        h += `<div class="bg-white border-2 border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div class="absolute top-0 right-0 bg-indigo-600 text-white font-black px-4 py-2 rounded-bl-2xl shadow-sm text-sm z-10">${ex.code||'-'}</div>
          <div class="flex items-start gap-4 mb-4 pt-2 border-b border-slate-100 pb-4">
            <img src="${u.avatar || 'https://img2.pic.in.th/PKW-Mascotace29467b055eb87.png'}" class="w-20 h-28 md:w-24 md:h-32 object-cover rounded-xl shadow-sm border border-slate-200 shrink-0 bg-slate-50">
            <div class="flex-1 pt-2">
              <div class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">ข้อมูลผู้สอบ</div>
              <div class="font-black text-xl text-indigo-700 leading-tight">${u.studentId}</div>
              <div class="font-bold text-slate-800 text-lg">${u.prefix||''}${u.firstName} ${u.lastName}</div>
            </div>
          </div>
          <div class="mb-4">
            <div class="text-slate-500 text-xs font-bold uppercase tracking-wider">รายวิชาสอบ</div>
            <div class="font-bold text-lg text-indigo-700">${ex.name}</div>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div><span class="block text-slate-500 text-xs font-bold">วันที่สอบ</span><span class="font-bold text-slate-700">${formatThaiDate(ex.date)}</span></div>
            <div><span class="block text-slate-500 text-xs font-bold">เวลาสอบ</span><span class="font-bold text-slate-700">${ex.startTime}-${ex.endTime} น.</span></div>
          </div>
          <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex justify-between items-center">
            <div><span class="block text-indigo-400 text-xs font-bold uppercase tracking-widest">ห้องสอบ</span><span class="font-black text-indigo-900 text-xl">${rmName}</span></div>
            <div class="text-right"><span class="block text-rose-400 text-xs font-bold uppercase tracking-widest">ลำดับที่นั่ง</span><span class="font-black text-rose-600 text-4xl leading-none">${seat}</span></div>
          </div>
        </div>`;
      });
      document.getElementById('tickets-list').innerHTML = h || '<div class="col-span-2 text-center text-slate-500">ไม่มีข้อมูลบัตรเข้าสอบ</div>';
    }

    // STATS FUNCTIONS
    function getExamStats(examId, allRegs) {
      const scores = allRegs.filter(r=>r.examId===examId && r.score && r.score.trim() !== '' && !r.isAbsent).map(r=>parseFloat(r.score)).sort((a,b)=>a-b);
      if(!scores.length) return null;
      const sum = scores.reduce((a,b)=>a+b, 0);
      const mean = sum / scores.length;
      const variance = scores.reduce((a,b)=>a + Math.pow(b-mean, 2), 0) / scores.length;
      const sd = Math.sqrt(variance) || 1; // avoid /0
      return { mean, sd, scores };
    }
    function getPercentileRank(score, sortedScores) {
      const count = sortedScores.filter(s => s <= score).length;
      return ((count / sortedScores.length) * 100).toFixed(2);
    }
    function getTScore(score, mean, sd) {
      return (50 + 10 * ((score - mean) / sd)).toFixed(2);
    }
    function getMedal(pr) {
      const p = parseFloat(pr);
      if(p >= 95) return { name: 'เหรียญทอง', color: 'text-amber-500', bg: 'bg-amber-50' };
      if(p >= 85) return { name: 'เหรียญเงิน', color: 'text-slate-500', bg: 'bg-slate-100' };
      if(p >= 70) return { name: 'เหรียญทองแดง', color: 'text-orange-700', bg: 'bg-orange-50' };
      return null;
    }

    async function loadSdResults() {
      showLoad(true); const d = await fetchSdData(); showLoad(false);
      const validRegs = d.regs.filter(r=>d.exams.some(x=>x.id===r.examId));
      let h = ''; validRegs.forEach(r => {
        const ex = d.exams.find(x=>x.id===r.examId);
        const st = getExamStats(ex.id, d.allRegsList);
        
        if(r.isAbsent) {
          h += `<tr><td class="p-4 border-b border-slate-100"><strong class="text-slate-800">[${ex.code||'-'}] ${ex.name}</strong></td><td colspan="5" class="p-4 border-b border-slate-100 text-center"><span class="text-rose-500 font-bold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">ขาดสอบ</span></td></tr>`;
        } else if (!r.score) {
          h += `<tr><td class="p-4 border-b border-slate-100"><strong class="text-slate-800">[${ex.code||'-'}] ${ex.name}</strong></td><td colspan="5" class="p-4 border-b border-slate-100 text-center"><span class="text-amber-500 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">รอประกาศผล</span></td></tr>`;
        } else if (st) {
          const sc = parseFloat(r.score);
          const ts = getTScore(sc, st.mean, st.sd);
          const pr = getPercentileRank(sc, st.scores);
          const md = getMedal(pr);
          const mdBadge = md ? `<span class="${md.color} ${md.bg} px-2 py-1 rounded text-xs font-bold border border-current whitespace-nowrap">🥇 ${md.name}</span>` : '<span class="text-slate-400 text-xs">-</span>';
          
          h += `<tr class="hover:bg-slate-50">
            <td class="p-4 border-b border-slate-100"><strong class="text-slate-800">[${ex.code||'-'}] ${ex.name}</strong></td>
            <td class="p-4 border-b border-slate-100 text-center font-black text-lg text-emerald-600">${sc}</td>
            <td class="p-4 border-b border-slate-100 text-center font-bold text-slate-600">${ts}</td>
            <td class="p-4 border-b border-slate-100 text-center font-bold text-slate-600">PR ${pr}</td>
            <td class="p-4 border-b border-slate-100 text-center">${mdBadge}</td>
            <td class="p-4 border-b border-slate-100 text-center">
              <div class="flex items-center justify-center gap-2">
                <button onclick="showScorePopup('${ex.name}', ${sc}, ${ts}, ${pr}, '${md?md.name:''}')" class="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200 transition-colors" title="ดูรายละเอียดคะแนน"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg></button>
                ${md ? `<button onclick="downloadCert('${ex.name}', '${md.name}')" class="bg-amber-100 text-amber-700 p-2 rounded-lg hover:bg-amber-200 transition-colors font-bold text-sm flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg> เกียรติบัตร</button>` : ''}
              </div>
            </td>
          </tr>`;
        }
      });
      document.getElementById('results-list').innerHTML = h || '<tr><td colspan="6" class="p-8 text-center text-slate-500">ไม่มีข้อมูลผลการสอบ</td></tr>';
    }

    function showScorePopup(name, sc, ts, pr, md) {
      let html = `
        <div class="text-left mt-4">
          <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4 text-center">
            <div class="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">คะแนนดิบ</div>
            <div class="text-5xl font-black text-indigo-700">${sc}</div>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center"><div class="text-slate-500 text-xs font-bold uppercase mb-1">T-Score</div><div class="text-xl font-bold text-slate-700">${ts}</div></div>
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center"><div class="text-slate-500 text-xs font-bold uppercase mb-1">Percentile</div><div class="text-xl font-bold text-slate-700">PR ${pr}</div></div>
          </div>
          ${md ? `<div class="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center"><div class="text-amber-600 text-xs font-bold uppercase mb-1">ระดับรางวัลเกียรติบัตร</div><div class="text-2xl font-black text-amber-500">🥇 ${md}</div></div>` : ''}
        </div>
      `;
      Swal.fire({ title: name, html: html, confirmButtonText: 'ปิด', confirmButtonColor: '#4f46e5', width: 400 });
    }

    function downloadCert(exName, mdName) {
      // Future feature structure
      sAlert('ฟีเจอร์ดาวน์โหลดเกียรติบัตร', `ดาวน์โหลดเกียรติบัตร ${mdName} สำหรับวิชา ${exName} (จะพร้อมใช้งานเร็วๆ นี้)`, 'info');
    }

    // Profile Edit
    function loadSdProfile() {
      document.getElementById('ep-avatar-preview').src = u.avatar || 'https://img2.pic.in.th/PKW-Mascotace29467b055eb87.png';
      document.getElementById('ep-avatar-base64').value = u.avatar || '';
      document.getElementById('ep-id').value = u.studentId;
      document.getElementById('ep-pass').value = '';
      document.getElementById('ep-prefix').value = u.prefix || 'เด็กชาย';
      document.getElementById('ep-first').value = u.firstName;
      document.getElementById('ep-last').value = u.lastName;
      document.getElementById('ep-grade').value = u.grade;
      document.getElementById('ep-room').value = u.room;
      document.getElementById('ep-roll').value = u.rollNumber;
      document.getElementById('ep-phone').value = u.phone;
    }
    
    function handleAvatarUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.match('image.*')) return sAlert('ผิดพลาด', 'กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น', 'error');
      
      const reader = new FileReader();
      reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
          const targetWidth = 240;
          const targetHeight = 320;
          
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          
          const srcRatio = img.width / img.height;
          const targetRatio = targetWidth / targetHeight;
          
          let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
          if (srcRatio > targetRatio) {
            sWidth = img.height * targetRatio;
            sx = (img.width - sWidth) / 2;
          } else {
            sHeight = img.width / targetRatio;
            sy = (img.height - sHeight) / 2;
          }
          
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
          
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          document.getElementById('ep-avatar-preview').src = base64;
          document.getElementById('ep-avatar-base64').value = base64;
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
    
    async function handleEditProfile(e) {
      e.preventDefault();
      const pass = document.getElementById('ep-pass').value;
      const d = {
        prefix: document.getElementById('ep-prefix').value,
        firstName: document.getElementById('ep-first').value,
        lastName: document.getElementById('ep-last').value,
        grade: document.getElementById('ep-grade').value,
        room: document.getElementById('ep-room').value,
        rollNumber: document.getElementById('ep-roll').value,
        phone: document.getElementById('ep-phone').value,
      };
      if(pass) d.password = pass;
      
      const b64 = document.getElementById('ep-avatar-base64').value;
      if (b64) d.avatar = b64;
      
      showLoad(true); await db.patch(`users/${u.studentId}`, d); 
      u = {...u, ...d}; sessionStorage.setItem('posnSess', JSON.stringify({u,r}));
      document.getElementById('nav-avatar').src = u.avatar || 'https://img2.pic.in.th/PKW-Mascotace29467b055eb87.png';
      showLoad(false); sAlert('สำเร็จ','อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว','success');
    }

    /* ---- ADMIN LOGIC ---- */
    async function loadAdHome() {
      if(u.role==='executive') return switchView('ad-reports');
      document.getElementById('ad-welcome-title').textContent = u.role==='manager' ? 'ยินดีต้อนรับ ผู้จัดการ' : 'ยินดีต้อนรับ ผู้ดูแลระบบ';
      showLoad(true); const [uO, eO, rO] = await Promise.all([db.get('users'), db.get('exams'), db.get('registrations')]); showLoad(false);
      const st = Object.keys(uO||{}).filter(k=>uO[k].role==='student').length; const ex = Object.keys(eO||{}).length; const rg = Object.keys(rO||{}).length;
      document.getElementById('ad-stats').innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div class="text-slate-500 font-bold text-sm">นักเรียนในระบบ</div><div class="text-4xl font-black text-indigo-600 mt-2">${st}</div></div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div class="text-slate-500 font-bold text-sm">วิชาสอบที่เปิด</div><div class="text-4xl font-black text-blue-600 mt-2">${ex}</div></div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><div class="text-slate-500 font-bold text-sm">ยอดการสมัครทั้งหมด</div><div class="text-4xl font-black text-emerald-600 mt-2">${rg}</div></div>
      `;
    }
    
    // Reports
    async function loadAdReports() {
      showLoad(true); const [uO, eO, rO] = await Promise.all([db.get('users'), db.get('exams'), db.get('registrations')]); showLoad(false);
      
      const st = Object.keys(uO||{}).filter(k=>uO[k].role==='student').length;
      const ex = Object.keys(eO||{}).length;
      const regsList = Object.keys(rO||{}).map(k=>rO[k]);
      
      document.getElementById('rp-total-students').textContent = st;
      document.getElementById('rp-total-exams').textContent = ex;
      document.getElementById('rp-total-regs').textContent = regsList.length;
      
      const exams = Object.keys(eO||{}).map(k=>({id:k,...eO[k]}));
      const labels = []; const data = [];
      let scoreHtml = '';
      
      exams.sort((a,b)=>a.date.localeCompare(b.date)).forEach(e => {
        labels.push(`[${e.code||'-'}]`);
        const eRegs = regsList.filter(x=>x.examId===e.id);
        data.push(eRegs.length);
        
        const scores = eRegs.map(x=>parseFloat(x.score)).filter(x=>!isNaN(x));
        if(scores.length > 0) {
          const max = Math.max(...scores);
          const min = Math.min(...scores);
          const avg = (scores.reduce((a,b)=>a+b, 0) / scores.length).toFixed(2);
          scoreHtml += `<tr><td class="p-3 border-b border-slate-100 text-slate-700">[${e.code||'-'}] ${e.name}</td><td class="p-3 text-center text-emerald-600 font-bold border-b border-slate-100">${max}</td><td class="p-3 text-center text-rose-600 font-bold border-b border-slate-100">${min}</td><td class="p-3 text-center text-indigo-600 font-bold border-b border-slate-100">${avg}</td></tr>`;
        }
      });
      
      document.getElementById('rp-scores-body').innerHTML = scoreHtml || '<tr><td colspan="4" class="p-4 text-center text-slate-500">ยังไม่มีข้อมูลการบันทึกคะแนน</td></tr>';

      const ctx = document.getElementById('reportChart').getContext('2d');
      if(window.rpChart) window.rpChart.destroy();
      window.rpChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{ label: 'ยอดผู้สมัคร (คน)', data: data, backgroundColor: '#4f46e5', borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });
    }

    let currentExportData = { exam: null, students: [], isRoomMode: false, rooms: [] };

    async function viewExportList(examId, isRoomMode) {
      showLoad(true);
      const [ex, rgO, uO, rmO] = await Promise.all([db.get(`exams/${examId}`), db.get('registrations'), db.get('users'), db.get(`rooms/${examId}`)]);
      showLoad(false);
      
      const regs = Object.keys(rgO||{}).filter(k=>rgO[k].examId===examId).map(k=>rgO[k]);
      if(!regs.length) return sAlert('ไม่มีข้อมูล', 'ยังไม่มีผู้สมัครในวิชานี้', 'warning');
      
      let students = regs.map(r => {
        const st = uO[r.studentId] || {};
        return { ...r, ...st };
      });

      // Sort by Grade -> Room -> RollNumber
      students.sort((a,b) => {
        if(a.grade !== b.grade) return (a.grade||'').localeCompare(b.grade||'');
        if(a.room !== b.room) return (a.room||'').localeCompare(b.room||'');
        return parseInt(a.rollNumber||0) - parseInt(b.rollNumber||0);
      });
      
      const rooms = rmO ? Object.keys(rmO).map(k=>({id:k,...rmO[k]})) : [];
      currentExportData = { exam: ex, students, isRoomMode, rooms };
      
      document.getElementById('mel-title').textContent = isRoomMode ? 'รายชื่อผู้เข้าสอบและเซ็นชื่อ' : 'รายชื่อนักเรียนที่สมัครสอบ';
      document.getElementById('mel-subtitle').textContent = `วิชา: [${ex.code||'-'}] ${ex.name}`;
      
      let th = isRoomMode 
        ? '<th class="p-4 font-semibold text-slate-700">ลำดับ</th><th class="p-4 font-semibold text-slate-700">รหัส</th><th class="p-4 font-semibold text-slate-700">ชื่อ-สกุล</th><th class="p-4 font-semibold text-slate-700">ห้องสอบ</th><th class="p-4 font-semibold text-center text-slate-700">ชั้น</th><th class="p-4 font-semibold text-center text-slate-700">ห้อง</th><th class="p-4 font-semibold text-center text-slate-700">เลขที่</th>'
        : '<th class="p-4 font-semibold text-slate-700">ลำดับ</th><th class="p-4 font-semibold text-slate-700">รหัส</th><th class="p-4 font-semibold text-slate-700">ชื่อ-สกุล</th><th class="p-4 font-semibold text-center text-slate-700">ชั้น</th><th class="p-4 font-semibold text-center text-slate-700">ห้อง</th><th class="p-4 font-semibold text-center text-slate-700">เลขที่</th><th class="p-4 font-semibold text-slate-700">หมายเหตุ</th>';
      document.getElementById('mel-thead').innerHTML = `<tr class="bg-slate-100 border-b border-slate-200">${th}</tr>`;
      
      let tb = '';
      students.forEach((s, idx) => {
        const rmName = s.roomId && rmO && rmO[s.roomId] ? rmO[s.roomId].name : '-';
        let row = isRoomMode
          ? `<td class="p-4 font-medium text-slate-800">${idx+1}</td><td class="p-4">${s.studentId}</td><td class="p-4 font-bold text-indigo-700">${s.prefix||''}${s.firstName||''} ${s.lastName||''}</td><td class="p-4">${rmName}</td><td class="p-4 text-center">${s.grade||''}</td><td class="p-4 text-center">${s.room||''}</td><td class="p-4 text-center font-bold">${s.rollNumber||''}</td>`
          : `<td class="p-4 font-medium text-slate-800">${idx+1}</td><td class="p-4">${s.studentId}</td><td class="p-4 font-bold text-indigo-700">${s.prefix||''}${s.firstName||''} ${s.lastName||''}</td><td class="p-4 text-center">${s.grade||''}</td><td class="p-4 text-center">${s.room||''}</td><td class="p-4 text-center font-bold">${s.rollNumber||''}</td><td class="p-4"></td>`;
        tb += `<tr class="hover:bg-slate-50 transition-colors">${row}</tr>`;
      });
      
      document.getElementById('mel-tbody').innerHTML = tb;
      document.getElementById('modal-export-list').classList.remove('app-hidden');
      setTimeout(() => {
        document.getElementById('mel-card').classList.remove('translate-x-full');
        document.getElementById('mel-card').classList.add('translate-x-0');
      }, 10);
    }
    
    function downloadExportExcel() {
      const { exam: ex, students: sts, isRoomMode, rooms } = currentExportData;
      const data = sts.map((s, idx) => {
        let d = { 'ลำดับที่': idx+1, 'รหัสนักเรียน': s.studentId, 'ชื่อ-นามสกุล': `${s.prefix||''}${s.firstName||''} ${s.lastName||''}`, 'ชั้น': s.grade||'', 'ห้อง': s.room||'', 'เลขที่': s.rollNumber||'' };
        if (isRoomMode) {
          const rm = rooms.find(x=>x.id===s.roomId);
          d['ห้องสอบ'] = rm ? rm.name : '-';
          d['ลงลายมือชื่อ'] = '';
          d['หมายเหตุ'] = '';
        } else {
          d['หมายเหตุ'] = '';
        }
        return d;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "รายชื่อ");
      XLSX.writeFile(wb, `รายชื่อ_${ex.name}.xlsx`);
    }

    async function getBase64ImageFromUrl(url) {
      try {
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        return new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result); reader.readAsDataURL(blob); });
      } catch(e) { return null; }
    }

    async function getBase64Font() {
      try {
        const res = await fetch('https://fonts.gstatic.com/s/sarabun/v14/DtVjJx26TKEr37c9aAFjnA.ttf');
        const blob = await res.blob();
        return new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result.split(',')[1]); reader.readAsDataURL(blob); });
      } catch(e) { return null; }
    }

    async function downloadExportPDF() {
      const { exam: ex, students: sts, isRoomMode, rooms } = currentExportData;
      showLoad(true);
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      if(!window.thaiFontBase64) window.thaiFontBase64 = await getBase64Font();
      
      if(window.thaiFontBase64) {
        doc.addFileToVFS('Sarabun.ttf', window.thaiFontBase64);
        doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
        doc.setFont('Sarabun');
      }

      // We won't block if logos fail to load due to CORS.
      const logo1 = await getBase64ImageFromUrl('https://pkw.ac.th/pkw/toon/logo_pkw.jpg').catch(()=>null);
      const logo2 = await getBase64ImageFromUrl('https://img1.pic.in.th/images/PKW-POSN.png').catch(()=>null);
      
      const drawHeader = (data, rmName = '') => {
        if(logo1 && logo1.startsWith('data:image/jpeg')) doc.addImage(logo1, 'JPEG', 15, 12, 16, 16);
        if(logo2 && logo2.startsWith('data:image/png')) doc.addImage(logo2, 'PNG', 180, 12, 16, 16);
        
        doc.setFontSize(18);
        doc.text('รายชื่อนักเรียนโครงการ PKW POSN PRE-TEST', 105, 18, {align: 'center'});
        doc.setFontSize(14);
        doc.text(`รหัสวิชา: ${ex.code||'-'} วิชา: ${ex.name}`, 105, 25, {align: 'center'});
        let line3 = `วันที่: ${formatThaiDate(ex.date)} เวลา: ${ex.startTime}-${ex.endTime} น.`;
        if (rmName) line3 += ` ห้องสอบ: ${rmName}`;
        doc.text(line3, 105, 32, {align: 'center'});
      };

      if (isRoomMode && rooms.length > 0) {
        let pagesDrawn = 0;
        rooms.forEach((rm, i) => {
          const rmSts = sts.filter(x=>x.roomId===rm.id).sort((a,b)=>parseInt(a.seatNumber||0)-parseInt(b.seatNumber||0));
          if(!rmSts.length) return;
          if (pagesDrawn > 0) doc.addPage();
          pagesDrawn++;
          
          const head = [['ลำดับที่', 'รหัสนักเรียน', 'ชื่อ-นามสกุล', 'ชั้น', 'ห้อง', 'เลขที่', 'ลงลายมือชื่อ', 'หมายเหตุ']];
          const body = rmSts.map((s, idx) => [idx+1, s.studentId, `${s.prefix||''}${s.firstName||''} ${s.lastName||''}`, s.grade||'', s.room||'', s.rollNumber||'', '', '']);
          
          doc.autoTable({
            head: head, body: body, startY: 38,
            styles: { font: 'Sarabun', fontSize: 12, cellPadding: 3 },
            headStyles: { fillColor: [240,244,248], textColor: [15,23,42], fontStyle: 'bold' },
            didDrawPage: (data) => drawHeader(data, rm.name),
            margin: { top: 38 }
          });
        });
      } else {
        const head = [['ลำดับที่', 'รหัสนักเรียน', 'ชื่อ-สกุล', 'ชั้น', 'ห้อง', 'เลขที่', 'หมายเหตุ']];
        const body = sts.map((s, idx) => [idx+1, s.studentId, `${s.prefix||''}${s.firstName||''} ${s.lastName||''}`, s.grade||'', s.room||'', s.rollNumber||'', '']);
        
        doc.autoTable({
          head: head, body: body, startY: 38,
          styles: { font: 'Sarabun', fontSize: 12, cellPadding: 3 },
          headStyles: { fillColor: [240,244,248], textColor: [15,23,42], fontStyle: 'bold' },
          didDrawPage: (data) => drawHeader(data, ''),
          margin: { top: 38 }
        });
      }
      
      doc.save(`รายชื่อ_${ex.name}.pdf`);
      showLoad(false);
    }

    // Students
    async function loadAdStudents() {
      showLoad(true); const uO = await db.get('users'); showLoad(false);
      allStudents = uO ? Object.keys(uO).map(k=>({id:k,...uO[k]})).filter(x=>x.role==='student') : [];
      filterStudents();
    }
    function filterStudents() {
      const q = document.getElementById('ad-search-student').value.toLowerCase();
      const s = allStudents.filter(x => x.id.includes(q) || (x.firstName+' '+x.lastName).toLowerCase().includes(q));
      document.getElementById('ad-students-list').innerHTML = s.map(x=>`<tr><td class="p-3 font-bold text-indigo-700 border-b border-slate-100">${x.id}</td><td class="p-3 border-b border-slate-100">${x.prefix||''}${x.firstName} ${x.lastName}</td><td class="p-3 border-b border-slate-100">ชั้น ${x.grade}/${x.room} <span class="bg-slate-100 px-1 rounded text-xs ml-1 font-bold text-slate-500">เลขที่ ${x.rollNumber}</span></td><td class="p-3 border-b border-slate-100 text-right"><button onclick="editStudent('${x.id}')" class="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded hover:bg-slate-200 mr-1">แก้ไข</button><button onclick="delStudent('${x.id}')" class="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded hover:bg-rose-200">ลบ</button></td></tr>`).join('') || '<tr><td colspan="4" class="p-8 text-center text-slate-500">ไม่พบข้อมูลนักเรียน</td></tr>';
    }
    function openStudentModal() {
      document.getElementById('ms-is-edit').value = 'false'; document.getElementById('ms-old-id').value=''; document.getElementById('ms-id').value='';
      ['pass','prefix','phone','first','last','grade','room','roll'].forEach(k=>document.getElementById(`ms-${k}`).value='');
      document.getElementById('ms-warn-edit').classList.add('hidden');
      document.getElementById('modal-student-title').textContent = 'เพิ่มนักเรียนใหม่'; document.getElementById('modal-student').classList.remove('app-hidden');
    }
    function editStudent(id) {
      const st = allStudents.find(x=>x.id===id); if(!st) return;
      document.getElementById('ms-is-edit').value = 'true'; document.getElementById('ms-old-id').value=st.id; document.getElementById('ms-id').value=st.id; 
      document.getElementById('ms-pass').value=st.password; document.getElementById('ms-prefix').value=st.prefix||''; document.getElementById('ms-phone').value=st.phone; document.getElementById('ms-first').value=st.firstName; document.getElementById('ms-last').value=st.lastName; document.getElementById('ms-grade').value=st.grade; document.getElementById('ms-room').value=st.room; document.getElementById('ms-roll').value=st.rollNumber;
      
      document.getElementById('ms-warn-edit').classList.remove('hidden');
      document.getElementById('modal-student-title').textContent = 'แก้ไขข้อมูลนักเรียน'; document.getElementById('modal-student').classList.remove('app-hidden');
    }
    async function saveStudent(e) {
      e.preventDefault(); const id = document.getElementById('ms-id').value; const oldId = document.getElementById('ms-old-id').value; const isEdit = document.getElementById('ms-is-edit').value === 'true';
      if(!isEdit && await db.get(`users/${id}`)) return sAlert('ไม่สำเร็จ','รหัสนักเรียนนี้มีในระบบแล้ว','error');
      
      showLoad(true);
      const d = { password:document.getElementById('ms-pass').value, prefix:document.getElementById('ms-prefix').value, firstName:document.getElementById('ms-first').value, lastName:document.getElementById('ms-last').value, grade:document.getElementById('ms-grade').value, room:document.getElementById('ms-room').value, rollNumber:document.getElementById('ms-roll').value, phone:document.getElementById('ms-phone').value, role:'student', studentId:id };
      
      if(isEdit && oldId !== id) {
        if(await db.get(`users/${id}`)) { showLoad(false); return sAlert('ไม่สำเร็จ','รหัสใหม่มีในระบบอยู่แล้ว','error'); }
        await db.put(`users/${id}`, d);
        await db.del(`users/${oldId}`);
        const rg = await db.get('registrations');
        if(rg) {
          const ups = {};
          Object.keys(rg).filter(k=>rg[k].studentId===oldId).forEach(k=>{
            const rData = rg[k]; rData.studentId = id;
            ups[`${id}_${rData.examId}`] = rData;
            ups[k] = null;
          });
          if(Object.keys(ups).length) await db.patch('registrations', ups);
        }
      } else {
        await db.put(`users/${id}`, d);
      }
      
      closeModal('modal-student'); await loadAdStudents(); showLoad(false); sAlert('สำเร็จ','บันทึกข้อมูลเรียบร้อย','success');
    }
    async function delStudent(id) {
      if(!await sConfirm('ลบข้อมูล','ยืนยันการลบข้อมูลนักเรียนรหัส '+id+' หรือไม่?')) return;
      showLoad(true); await db.del(`users/${id}`); await loadAdStudents(); showLoad(false);
    }

    // Exams
    async function loadAdExams() {
      showLoad(true); const eO = await db.get('exams'); showLoad(false);
      allExams = eO ? Object.keys(eO).map(k=>({id:k,...eO[k]})) : [];
      let h = ''; allExams.forEach(e => {
        h += `<tr class="hover:bg-slate-50">
          <td class="p-4 border-b border-slate-100"><strong class="text-slate-800">[${e.code||'-'}] ${e.name}</strong><br><span class="text-slate-500 text-xs">รับชั้น: ${(e.allowedGrades||[]).join(',')}</span></td>
          <td class="p-4 border-b border-slate-100 text-sm">สอบ: ${formatThaiDate(e.date)}<br><span class="text-slate-400">รับ: ${formatThaiDate(e.regOpenDate)} - ${formatThaiDate(e.regCloseDate)}</span></td>
          <td class="p-4 border-b border-slate-100 text-center font-black ${((e.enrolledCount||0)>=e.capacity && e.capacity!==999)?'text-rose-600':'text-emerald-600'}">${e.enrolledCount||0} <span class="text-slate-400 text-sm font-bold">/ ${e.capacity===999?'∞':e.capacity}</span></td>
          <td class="p-4 border-b border-slate-100 text-right space-y-1">
            <button onclick="viewExportList('${e.id}', false)" class="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded hover:bg-emerald-200 shadow-sm">รายชื่อ</button>
            <button onclick="editExam('${e.id}')" class="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded hover:bg-slate-200 shadow-sm">แก้ไข</button>
            <button onclick="delExam('${e.id}')" class="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded hover:bg-rose-200 shadow-sm">ลบ</button>
          </td>
        </tr>`;
      });
      document.getElementById('ad-exams-list').innerHTML = h || '<tr><td colspan="4" class="p-8 text-center text-slate-500">ไม่มีข้อมูลวิชาสอบ</td></tr>';
    }

    async function exportList(examId) {
      showLoad(true);
      const [ex, rgO, uO] = await Promise.all([db.get(`exams/${examId}`), db.get('registrations'), db.get('users')]);
      showLoad(false);
      const regs = Object.keys(rgO||{}).filter(k=>rgO[k].examId===examId).map(k=>rgO[k]);
      if(!regs.length) return sAlert('ไม่มีข้อมูล', 'ยังไม่มีผู้สมัครในวิชานี้', 'warning');
      
      const data = regs.map((r, idx) => {
        const st = uO[r.studentId] || {};
        return {
          'ลำดับ': idx + 1,
          'รหัสนักเรียน': r.studentId,
          'ชื่อ - นามสกุล': `${st.prefix||''}${st.firstName||''} ${st.lastName||''}`,
          'ชั้น': st.grade || '',
          'ห้อง': st.room || '',
          'เลขที่': st.rollNumber || '',
          'เบอร์โทรศัพท์': st.phone || ''
        };
      });

      const swalRes = await Swal.fire({
        title: 'เลือกรูปแบบไฟล์ดาวน์โหลด',
        text: `รายชื่อผู้สมัครวิชา [${ex.code||'-'}] ${ex.name}`,
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Excel (.xlsx)',
        denyButtonText: 'PDF (พิมพ์)',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#10b981',
        denyButtonColor: '#ef4444'
      });

      if (swalRes.isConfirmed) {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "รายชื่อผู้สมัคร");
        XLSX.writeFile(wb, `รายชื่อ_${ex.name}.xlsx`);
      } else if (swalRes.isDenied) {
        let html = `<div class="page-break w-full max-w-[210mm] mx-auto text-black p-4">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold mb-1">รายชื่อผู้สมัครสอบ</h2>
            <h3 class="text-xl mb-1">[${ex.code||'-'}] ${ex.name}</h3>
            <p class="text-sm text-slate-500">พิมพ์เมื่อ: ${formatThaiDate(new Date().toISOString())}</p>
          </div>
          <table class="w-full border border-slate-300 text-sm text-left">
            <thead class="bg-slate-100">
              <tr class="border-b border-slate-300">
                <th class="p-2 border-r border-slate-300 text-center">ลำดับ</th>
                <th class="p-2 border-r border-slate-300 text-center">รหัสนักเรียน</th>
                <th class="p-2 border-r border-slate-300">ชื่อ - นามสกุล</th>
                <th class="p-2 border-r border-slate-300 text-center">ชั้น/ห้อง</th>
                <th class="p-2 border-r border-slate-300 text-center">เลขที่</th>
                <th class="p-2 text-center">เบอร์โทรศัพท์</th>
              </tr>
            </thead>
            <tbody>`;
        data.forEach(r => {
          html += `<tr class="border-b border-slate-300">
            <td class="p-2 text-center border-r border-slate-300">${r['ลำดับ']}</td>
            <td class="p-2 text-center border-r border-slate-300">${r['รหัสนักเรียน']}</td>
            <td class="p-2 border-r border-slate-300">${r['ชื่อ - นามสกุล']}</td>
            <td class="p-2 text-center border-r border-slate-300">${r['ชั้น']}/${r['ห้อง']}</td>
            <td class="p-2 text-center border-r border-slate-300">${r['เลขที่']}</td>
            <td class="p-2 text-center">${r['เบอร์โทรศัพท์']}</td>
          </tr>`;
        });
        html += `</tbody></table></div>`;
        document.getElementById('print-container').innerHTML = html;
        window.print();
      }
    }

    function renderGrades() {
      const gs = ['ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];
      document.getElementById('ex-grade-container').innerHTML = gs.map(g=>`<label class="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200"><input type="checkbox" value="${g}" class="ex-grade w-4 h-4 text-indigo-600"> <span class="font-bold text-slate-700 text-sm">${g}</span></label>`).join('');
    }

    function openExamModal() {
      renderGrades(); document.getElementById('ex-id').value=''; document.getElementById('ex-code').value=''; document.getElementById('ex-name').value=''; document.getElementById('ex-date').value=''; document.getElementById('ex-cap').value=''; document.getElementById('ex-start').value=''; document.getElementById('ex-end').value=''; document.getElementById('ex-reg-open').value=''; document.getElementById('ex-reg-close').value='';
      document.getElementById('modal-exam-title').textContent = 'เพิ่มวิชาสอบ'; document.getElementById('modal-exam').classList.remove('app-hidden');
    }

    function editExam(id) {
      const e = allExams.find(x=>x.id===id); if(!e) return; renderGrades();
      document.getElementById('ex-id').value=e.id; document.getElementById('ex-code').value=e.code||''; document.getElementById('ex-name').value=e.name; document.getElementById('ex-date').value=e.date; document.getElementById('ex-cap').value=e.capacity; document.getElementById('ex-start').value=e.startTime; document.getElementById('ex-end').value=e.endTime; document.getElementById('ex-reg-open').value=e.regOpenDate; document.getElementById('ex-reg-close').value=e.regCloseDate;
      document.querySelectorAll('.ex-grade').forEach(cb=>cb.checked=(e.allowedGrades||[]).includes(cb.value));
      document.getElementById('modal-exam-title').textContent = 'แก้ไขวิชาสอบ'; document.getElementById('modal-exam').classList.remove('app-hidden');
    }

    async function saveExam(e) {
      e.preventDefault(); const gs = Array.from(document.querySelectorAll('.ex-grade:checked')).map(cb=>cb.value);
      if(!gs.length) return sAlert('ข้อผิดพลาด','กรุณาเลือกระดับชั้นอย่างน้อย 1 ระดับ','error');
      const id = document.getElementById('ex-id').value;
      const d = { code:document.getElementById('ex-code').value, name:document.getElementById('ex-name').value, date:document.getElementById('ex-date').value, capacity:parseInt(document.getElementById('ex-cap').value), startTime:document.getElementById('ex-start').value, endTime:document.getElementById('ex-end').value, regOpenDate:document.getElementById('ex-reg-open').value, regCloseDate:document.getElementById('ex-reg-close').value, allowedGrades:gs };
      showLoad(true); if(id) await db.patch(`exams/${id}`,d); else { d.enrolledCount=0; await db.put(`exams/ex_${Date.now()}`,d); }
      closeModal('modal-exam'); loadAdExams();
    }

    async function delExam(id) {
      if(!await sConfirm('ลบวิชาสอบ','ลบถาวร รวมถึงข้อมูลการสมัครของวิชานี้ทั้งหมด?')) return;
      showLoad(true); await db.del(`exams/${id}`);
      const rO = await db.get('registrations'); if(rO) { const ups={}; Object.keys(rO).filter(k=>rO[k].examId===id).forEach(k=>ups[k]=null); await db.patch('registrations',ups); }
      await db.del(`rooms/${id}`); loadAdExams();
    }

    // Rooms & Seating
    async function loadAdRooms() {
      showLoad(true); const [eO, rO] = await Promise.all([db.get('exams'), db.get('registrations')]); showLoad(false);
      allExams = eO ? Object.keys(eO).map(k=>({id:k,...eO[k]})) : [];
      let h = '';
      allExams.sort((a,b)=>a.date.localeCompare(b.date)).forEach(e => {
        const enrol = e.enrolledCount||0;
        const eRegs = Object.keys(rO||{}).filter(k=>rO[k].examId===e.id).map(k=>rO[k]);
        const unassigned = eRegs.filter(x=>!x.roomId || !x.seatNumber).length;
        h += `<tr class="hover:bg-slate-50">
          <td class="p-4 border-b border-slate-100"><strong class="text-slate-800">[${e.code||'-'}] ${e.name}</strong></td>
          <td class="p-4 border-b border-slate-100 text-sm font-medium text-slate-700">${formatThaiDate(e.date)}</td>
          <td class="p-4 border-b border-slate-100 text-center font-black text-indigo-700">${enrol}</td>
          <td class="p-4 border-b border-slate-100 text-center font-black ${unassigned>0?'text-rose-600':'text-emerald-600'}">${unassigned}</td>
          <td class="p-4 border-b border-slate-100 text-right"><button onclick="openManageRooms('${e.id}')" class="bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">จัดการห้องสอบ</button></td>
        </tr>`;
      });
      document.getElementById('ad-rooms-list').innerHTML = h || '<tr><td colspan="5" class="p-8 text-center text-slate-500">ไม่มีข้อมูลวิชาสอบ</td></tr>';
    }

    async function openManageRooms(id) {
      currentExamId = id; const e = allExams.find(x=>x.id===id); document.getElementById('room-exam-name').textContent = `วิชา: [${e.code||'-'}] ${e.name}`;
      document.getElementById('rm-add-name').value=''; document.getElementById('rm-add-cap').value='';
      showLoad(true); await loadRoomData(); showLoad(false); document.getElementById('modal-rooms').classList.remove('app-hidden');
    }

    async function loadRoomData() {
      const [rmO, rgO] = await Promise.all([db.get(`rooms/${currentExamId}`), db.get('registrations')]);
      roomsCache = rmO ? Object.keys(rmO).map(k=>({id:k,...rmO[k]})) : [];
      regsCache = Object.keys(rgO||{}).filter(k=>rgO[k].examId===currentExamId).map(k=>({regId:k,...rgO[k]}));
      
      const totalEnrolled = regsCache.length;
      const totalCap = roomsCache.reduce((sum, r)=>sum+(parseInt(r.capacity)||0), 0);
      const unassigned = regsCache.filter(x=>!x.roomId || !x.seatNumber).length;
      
      document.getElementById('rm-total-enrolled').textContent = totalEnrolled;
      document.getElementById('rm-total-cap').textContent = totalCap;
      document.getElementById('rm-unassigned').textContent = unassigned;

      let h = ''; roomsCache.forEach(r => {
        const assigned = regsCache.filter(x=>x.roomId===r.id).length;
        h += `<tr><td class="p-4 font-bold text-slate-700 border-b border-slate-100">${r.name}</td><td class="p-4 text-center font-bold border-b border-slate-100">${r.capacity}</td><td class="p-4 text-center font-bold text-indigo-600 border-b border-slate-100">${assigned}</td><td class="p-4 text-right border-b border-slate-100"><button onclick="delRoom('${r.id}')" class="text-rose-500 hover:text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded">ลบ</button></td></tr>`;
      });
      document.getElementById('rooms-list').innerHTML = h || '<tr><td colspan="4" class="p-8 text-center text-slate-500">ยังไม่มีห้องสอบ</td></tr>';
    }

    async function addRoom(e) {
      e.preventDefault(); const n = document.getElementById('rm-add-name').value, c = parseInt(document.getElementById('rm-add-cap').value);
      showLoad(true); await db.put(`rooms/${currentExamId}/rm_${Date.now()}`,{name:n, capacity:c});
      document.getElementById('rm-add-name').value=''; document.getElementById('rm-add-cap').value=''; await loadRoomData(); showLoad(false);
    }
    
    async function delRoom(id) {
      if(!await sConfirm('ลบห้อง','ยืนยันลบห้องสอบนี้? ถ้านักเรียนถูกจัดที่นั่งไว้แล้ว นักเรียนจะสูญเสียที่นั่งนั้น')) return;
      showLoad(true); await db.del(`rooms/${currentExamId}/${id}`);
      const ups={}; regsCache.filter(x=>x.roomId===id).forEach(x=>{ups[`${x.regId}/roomId`] = ''; ups[`${x.regId}/seatNumber`] = '';});
      if(Object.keys(ups).length) await db.patch('registrations', ups);
      await loadRoomData(); showLoad(false);
    }

    async function autoAssignSeats() {
      if(!roomsCache.length) return sAlert('ผิดพลาด','กรุณาสร้างห้องสอบให้เพียงพอก่อนจัดที่นั่ง','error');
      if(!await sConfirm('จัดที่นั่งอัตโนมัติ','ระบบจะเรียงชื่อ ก-ฮ และจัดลงห้องสอบตามลำดับ (เลขที่นั่งจะนับ 1 ใหม่ทุกห้อง) ข้อมูลที่นั่งเดิมของวิชานี้จะถูกทับทั้งหมด ยืนยันหรือไม่?')) return;
      
      showLoad(true);
      const uO = await db.get('users');
      let rc = regsCache.map(r=>({...r, ...(uO[r.studentId]||{})}));
      rc.sort((a,b)=>(a.firstName||'').localeCompare(b.firstName||'','th-TH'));
      
      let rmIdx = 0, seatNum = 1, ups = {}, totalAssigned = 0;
      for(const r of rc) {
        if(rmIdx >= roomsCache.length) break; 
        ups[`${r.regId}/roomId`] = roomsCache[rmIdx].id;
        ups[`${r.regId}/seatNumber`] = seatNum;
        seatNum++; totalAssigned++;
        if(seatNum > roomsCache[rmIdx].capacity) { rmIdx++; seatNum = 1; }
      }
      if(Object.keys(ups).length) await db.patch('registrations', ups);
      await loadRoomData(); showLoad(false);
      
      if(totalAssigned < rc.length) sAlert('จัดที่นั่งไม่ครบ',`จัดได้ ${totalAssigned} คน จากทั้งหมด ${rc.length} คน (ห้องสอบไม่เพียงพอ)`,'warning');
      else sAlert('สำเร็จ',`จัดที่นั่งเรียบร้อย ${totalAssigned} คน`,'success');
    }



    // SCORES (CSV Upload / ad-scores)
    async function loadAdScoresMenu() {
      showLoad(true); const eO = await db.get('exams'); showLoad(false);
      allExams = eO ? Object.keys(eO).map(k=>({id:k,...eO[k]})) : [];
      document.getElementById('as-search').value = '';
      document.getElementById('as-workspace').classList.add('hidden');
    }
    
    function searchScoreExam() {
      const q = document.getElementById('as-search').value.toLowerCase();
      const dd = document.getElementById('as-dropdown');
      if(!q) { dd.classList.add('hidden'); return; }
      
      const filtered = allExams.filter(x => (x.code||'').toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
      let h = '';
      filtered.forEach(e => {
        h += `<div class="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="selectScoreExam('${e.id}')">
          <div class="font-bold text-indigo-700">[${e.code||'-'}] ${e.name}</div><div class="text-xs text-slate-500">สอบวันที่: ${formatThaiDate(e.date)}</div>
        </div>`;
      });
      dd.innerHTML = h || '<div class="p-4 text-center text-slate-500">ไม่พบวิชาสอบ</div>';
      dd.classList.remove('hidden');
    }
    
    async function selectScoreExam(id) {
      document.getElementById('as-dropdown').classList.add('hidden');
      document.getElementById('as-search').value = '';
      currentExamId = id; const ex = allExams.find(x=>x.id===id);
      document.getElementById('as-exam-name').textContent = `[${ex.code||'-'}] ${ex.name}`;
      document.getElementById('as-full-score').value = ex.fullScore || '';
      
      showLoad(true); const [rO, uO, rmO] = await Promise.all([db.get('registrations'), db.get('users'), db.get(`rooms/${id}`)]); showLoad(false);
      const rooms = rmO ? Object.keys(rmO).map(k=>({id:k,...rmO[k]})) : [];
      regsCache = Object.keys(rO||{}).filter(k=>rO[k].examId===id).map(k=>({regId:k,...rO[k],...(uO[rO[k].studentId]||{})}));
      regsCache.sort((a,b)=>(a.firstName||'').localeCompare(b.firstName||'','th-TH'));
      
      let h=''; regsCache.forEach(r => {
        const rm = rooms.find(x=>x.id===r.roomId);
        h += `<tr class="hover:bg-slate-50"><td class="p-3 border-b border-slate-100"><strong class="text-slate-800">${r.studentId}</strong><br><span class="text-sm">${r.prefix||''}${r.firstName} ${r.lastName}</span></td><td class="p-3 border-b border-slate-100"><div class="text-indigo-700 font-bold">${rm?rm.name:'-'}</div><div class="text-xs">ที่นั่ง ${r.seatNumber||'-'}</div></td><td class="p-3 text-center border-b border-slate-100"><input type="checkbox" class="cb-absent w-5 h-5 text-rose-500 rounded focus:ring-rose-500 cursor-pointer" data-id="${r.regId}" ${r.isAbsent?'checked':''}></td><td class="p-3 border-b border-slate-100"><input type="number" class="in-score modern-input !mb-0 w-24 p-2 text-center" data-id="${r.regId}" data-st="${r.studentId}" value="${r.score||''}" ${r.isAbsent?'disabled':''}></td></tr>`;
      });
      document.getElementById('as-scores-body').innerHTML = h || '<tr><td colspan="4" class="p-8 text-center text-slate-500">ไม่มีผู้สมัครวิชานี้</td></tr>';
      document.querySelectorAll('.cb-absent').forEach(cb=>cb.addEventListener('change',e=>{const i=document.querySelector(`.in-score[data-id="${e.target.dataset.id}"]`); if(i){ i.disabled=e.target.checked; if(e.target.checked)i.value=''; }}));
      
      document.getElementById('as-workspace').classList.remove('hidden');
    }
    
    function handleCSVUpload(e) {
      const file = e.target.files[0]; if(!file) return;
      const ex = allExams.find(x=>x.id===currentExamId);
      const reader = new FileReader();
      reader.onload = function(evt) {
        const lines = evt.target.result.split('\n');
        const header = lines[0].toLowerCase().trim().split(',');
        if(header[0]!=='student_id' || header[1]!=='exam_code' || header[2]!=='score') return sAlert('ผิดพลาด', 'หัวข้อคอลัมน์ไม่ถูกต้อง (ต้องเป็น student_id, exam_code, score)', 'error');
        
        let successCount=0, errorCount=0;
        for(let i=1; i<lines.length; i++) {
          const row = lines[i].trim().split(',');
          if(row.length < 3) continue;
          const stId = row[0].trim(), ec = row[1].trim(), sc = row[2].trim();
          
          if(ec !== (ex.code||'')) { errorCount++; continue; } // Wrong exam
          
          const inScore = document.querySelector(`.in-score[data-st="${stId}"]`);
          if(inScore) { inScore.value = sc; successCount++; }
        }
        sAlert('อัปโหลดเสร็จสิ้น', `อัปโหลดคะแนนลงตารางสำเร็จ ${successCount} รายการ (ข้าม ${errorCount} รายการที่ไม่ตรงเงื่อนไข)\n*กรุณากด "บันทึกคะแนน" อีกครั้งเพื่อเซฟลงระบบ*`, 'success');
        e.target.value = ''; // reset file input
      };
      reader.readAsText(file);
    }
    
    async function saveResultsDirectly() {
      if(!await sConfirm('ยืนยัน','คุณต้องการบันทึกคะแนนทั้งหมดเข้าสู่ระบบใช่หรือไม่?')) return;
      const fs = document.getElementById('as-full-score').value;
      const ups = {}; 
      regsCache.forEach(r=>{ 
        const a=document.querySelector(`.cb-absent[data-id="${r.regId}"]`).checked;
        const s=document.querySelector(`.in-score[data-id="${r.regId}"]`).value; 
        ups[`${r.regId}/isAbsent`]=a; ups[`${r.regId}/score`]=a?"":s; 
      });
      showLoad(true); 
      await db.patch('registrations', ups);
      if(fs) {
        await db.patch(`exams/${currentExamId}`, { fullScore: parseFloat(fs) });
        // Update allExams cache locally too
        const exIdx = allExams.findIndex(x=>x.id===currentExamId);
        if(exIdx>=0) allExams[exIdx].fullScore = parseFloat(fs);
      }
      showLoad(false); sAlert('สำเร็จ','บันทึกผลเรียบร้อย','success');
    }

    // SUBJECT SCORES
    async function loadAdSubjScoresMenu() {
      showLoad(true); const eO = await db.get('exams'); showLoad(false);
      allExams = eO ? Object.keys(eO).map(k=>({id:k,...eO[k]})) : [];
      document.getElementById('ass-search').value = '';
      document.getElementById('ass-workspace').classList.add('hidden');
    }
    
    function searchSubjScoreExam() {
      const q = document.getElementById('ass-search').value.toLowerCase();
      const dd = document.getElementById('ass-dropdown');
      if(!q) { dd.classList.add('hidden'); return; }
      
      const filtered = allExams.filter(x => (x.code||'').toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
      let h = '';
      filtered.forEach(e => {
        h += `<div class="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="selectSubjScoreExam('${e.id}')">
          <div class="font-bold text-indigo-700">[${e.code||'-'}] ${e.name}</div><div class="text-xs text-slate-500">สอบวันที่: ${formatThaiDate(e.date)}</div>
        </div>`;
      });
      dd.innerHTML = h || '<div class="p-4 text-center text-slate-500">ไม่พบวิชาสอบ</div>';
      dd.classList.remove('hidden');
    }
    
    async function selectSubjScoreExam(id) {
      document.getElementById('ass-dropdown').classList.add('hidden');
      document.getElementById('ass-search').value = '';
      currentExamId = id; const ex = allExams.find(x=>x.id===id);
      document.getElementById('ass-exam-name').textContent = `[${ex.code||'-'}] ${ex.name}`;
      
      showLoad(true); const [rO, uO] = await Promise.all([db.get('registrations'), db.get('users')]); showLoad(false);
      const allRegs = Object.keys(rO||{}).map(k=>({regId:k,...rO[k]}));
      const myRegs = allRegs.filter(r=>r.examId===id).map(r=>({...r, ...(uO[r.studentId]||{})}));
      myRegs.sort((a,b)=>(a.firstName||'').localeCompare(b.firstName||'','th-TH'));
      
      const st = getExamStats(id, allRegs);
      
      document.getElementById('ass-stats').innerHTML = st ? `<span class="font-bold text-emerald-600">Mean: ${st.mean.toFixed(2)}</span> | <span class="font-bold text-indigo-600">SD: ${st.sd.toFixed(2)}</span> | <span class="font-bold text-slate-600">ผู้เข้าสอบ: ${st.scores.length} คน</span>` : 'ไม่มีข้อมูลสถิติ (รอลงคะแนน)';

      let h=''; myRegs.forEach(r => {
        let scText, tsText='-', prText='-', mdBadge='-';
        
        if (r.isAbsent || !r.score || r.score.trim() === '') {
          scText = '<span class="text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded text-xs">ขาดสอบ</span>';
        } else {
          const sc = parseFloat(r.score);
          scText = `<span class="font-black text-emerald-600">${sc}</span>`;
          if (st) {
            tsText = getTScore(sc, st.mean, st.sd);
            prText = getPercentileRank(sc, st.scores);
            const md = getMedal(prText);
            mdBadge = md ? `<span class="${md.color} ${md.bg} px-2 py-1 rounded text-xs font-bold whitespace-nowrap">🥇 ${md.name}</span>` : '-';
          }
        }
        
        h += `<tr class="hover:bg-slate-50"><td class="p-3 border-b border-slate-100"><strong class="text-slate-800">${r.studentId}</strong><br><span class="text-sm">${r.prefix||''}${r.firstName} ${r.lastName}</span></td><td class="p-3 text-center border-b border-slate-100">${scText}</td><td class="p-3 border-b border-slate-100 text-center font-bold text-slate-600">${tsText}</td><td class="p-3 border-b border-slate-100 text-center font-bold text-slate-600">${prText}</td><td class="p-3 border-b border-slate-100 text-center">${mdBadge}</td></tr>`;
      });
      document.getElementById('ass-scores-body').innerHTML = h || '<tr><td colspan="5" class="p-8 text-center text-slate-500">ไม่มีผู้สมัครวิชานี้</td></tr>';
      document.getElementById('ass-workspace').classList.remove('hidden');
    }

    // AD-INDIV-SCORES (V1.6.1)
    let allUsers = [];
    async function loadAdIndivScoresMenu() {
      showLoad(true); const uO = await db.get('users'); showLoad(false);
      allUsers = uO ? Object.keys(uO).map(k=>({studentId:k,...uO[k]})) : [];
      document.getElementById('ais-search').value = '';
      document.getElementById('ais-workspace').classList.add('hidden');
    }
    
    function searchIndivScoreStudent() {
      const q = document.getElementById('ais-search').value.toLowerCase();
      const dd = document.getElementById('ais-dropdown');
      if(!q) { dd.classList.add('hidden'); return; }
      
      const filtered = allUsers.filter(x => x.role==='student' && ((x.studentId||'').toLowerCase().includes(q) || (x.firstName||'').toLowerCase().includes(q) || (x.lastName||'').toLowerCase().includes(q)));
      let h = '';
      filtered.forEach(s => {
        h += `<div class="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onclick="selectIndivScoreStudent('${s.studentId}')">
          <div class="font-bold text-emerald-700">${s.studentId}</div><div class="text-xs text-slate-500">${s.prefix||''}${s.firstName||''} ${s.lastName||''} (ม.${s.grade||'-'}/${s.room||'-'} เลขที่ ${s.rollNumber||'-'})</div>
        </div>`;
      });
      dd.innerHTML = h || '<div class="p-4 text-center text-slate-500">ไม่พบนักเรียน</div>';
      dd.classList.remove('hidden');
    }
    
    async function selectIndivScoreStudent(studentId) {
      document.getElementById('ais-dropdown').classList.add('hidden');
      document.getElementById('ais-search').value = '';
      const st = allUsers.find(x=>x.studentId===studentId);
      document.getElementById('ais-student-name').textContent = `${st.studentId} : ${st.prefix||''}${st.firstName||''} ${st.lastName||''}`;
      document.getElementById('ais-stats').textContent = `ระดับชั้น ม.${st.grade||'-'}/${st.room||'-'} เลขที่ ${st.rollNumber||'-'}`;
      
      showLoad(true); const [rO, eO] = await Promise.all([db.get('registrations'), db.get('exams')]); showLoad(false);
      const allRegs = Object.keys(rO||{}).map(k=>({regId:k,...rO[k]}));
      const myRegs = allRegs.filter(r=>r.studentId===studentId);
      
      let h=''; 
      myRegs.forEach(r => {
        const ex = (eO && eO[r.examId]) ? eO[r.examId] : {};
        let scText, tsText='-', prText='-', mdBadge='-';
        
        if (r.isAbsent || !r.score || r.score.trim() === '') {
          scText = '<span class="text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded text-xs">ขาดสอบ</span>';
        } else {
          const sc = parseFloat(r.score);
          scText = `<span class="font-black text-emerald-600">${sc}</span>`;
          const exStats = getExamStats(r.examId, allRegs);
          if (exStats) {
            tsText = getTScore(sc, exStats.mean, exStats.sd);
            prText = getPercentileRank(sc, exStats.scores);
            const md = getMedal(prText);
            mdBadge = md ? `<span class="${md.color} ${md.bg} px-2 py-1 rounded text-xs font-bold whitespace-nowrap">🥇 ${md.name}</span>` : '-';
          }
        }
        
        h += `<tr class="hover:bg-slate-50"><td class="p-3 border-b border-slate-100"><strong class="text-slate-800">[${ex.code||'-'}] ${ex.name||'วิชาที่ถูกลบ'}</strong></td><td class="p-3 text-center border-b border-slate-100">${scText}</td><td class="p-3 border-b border-slate-100 text-center font-bold text-slate-600">${tsText}</td><td class="p-3 border-b border-slate-100 text-center font-bold text-slate-600">${prText}</td><td class="p-3 border-b border-slate-100 text-center">${mdBadge}</td></tr>`;
      });
      document.getElementById('ais-scores-body').innerHTML = h || '<tr><td colspan="5" class="p-8 text-center text-slate-500">นักเรียนคนนี้ยังไม่ได้ลงทะเบียนสอบวิชาใดเลย</td></tr>';
      document.getElementById('ais-workspace').classList.remove('hidden');
    }

    // Announcements
    async function loadAdAnnounce() {
      showLoad(true); const an = await db.get('announcement'); showLoad(false);
      document.getElementById('ad-ann-text').value = an ? an.text : '';
    }
    async function saveAnnouncement(e) {
      e.preventDefault(); showLoad(true); await db.put('announcement', { text: document.getElementById('ad-ann-text').value }); showLoad(false); sAlert('สำเร็จ','บันทึกประกาศเรียบร้อย','success');
    }
