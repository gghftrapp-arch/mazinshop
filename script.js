const API_URL = 'http://127.0.0.1:5000';

let isRegisterMode = false;
let isCaptchaVerified = false;
let currentUser = localStorage.getItem('mazin_current_user') || null;

window.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        document.getElementById('auth-overlay').style.display = 'none';
        loadUserData();
    } else {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
    renderHomeSocials();
    renderStorePanels();
    renderStoreFiles();
    renderStoreAccounts();
    renderStoreSupport();
    renderUserDeliveries();
    startAutoRefresh();
});

function startAutoRefresh() {
    setInterval(() => {
        if (currentUser) {
            loadUserData();
            renderUserDeliveries();
        }
        renderStorePanels();
        renderStoreFiles();
        renderStoreAccounts();
    }, 6000);
}

/* ===================== AUTH ===================== */
function toggleCaptcha() {
    let box = document.getElementById('captcha-box');
    isCaptchaVerified = !isCaptchaVerified;
    if (isCaptchaVerified) { box.classList.add('checked'); } else { box.classList.remove('checked'); }
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    let subtitle = document.getElementById('auth-subtitle');
    let btn = document.getElementById('auth-action-btn');
    let switchText = document.getElementById('auth-switch-text');

    if (isRegisterMode) {
        subtitle.innerText = "إنشاء حساب جديد في الموقع ";
        btn.innerText = "تسجيل حساب جديد";
        switchText.innerHTML = 'لديك حساب بالفعل؟ <span onclick="toggleAuthMode()">تسجيل الدخول</span>';
    } else {
        subtitle.innerText = "تسجيل الدخول إلى حسابك الخاص ";
        btn.innerText = "تسجيل الدخول";
        switchText.innerHTML = 'ليس لديك حساب؟ <span onclick="toggleAuthMode()">إنشاء حساب جديد</span>';
    }
}

function handleAuthSubmit() {
    let user = document.getElementById('auth-username').value.trim();
    let pass = document.getElementById('auth-password').value.trim();

    if (!user || !pass) { alert('الرجاء إدخال اسم المستخدم وكلمة المرور.'); return; }
    if (!isCaptchaVerified) { alert('يرجى تأكيد التحقق البشري أولاً!'); return; }

    let endpoint = isRegisterMode ? `${API_URL}/api/register` : `${API_URL}/api/login`;

    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentUser = data.username || user;
            userBalance = data.balance !== undefined ? data.balance : 0.00;
            localStorage.setItem('mazin_current_user', currentUser);
            document.getElementById('auth-overlay').style.display = 'none';
            updateBalanceDisplay();
            renderCart();
            renderUserDeliveries();
            if (document.getElementById('sidebar-username-text')) {
                document.getElementById('sidebar-username-text').innerText = currentUser;
            }
            alert(isRegisterMode ? 'تم إنشاء الحساب بنجاح!' : 'تم تسجيل الدخول !');
        } else {
            alert(data.message || 'فشل العملية!');
        }
    })
    .catch(err => {
        console.error(err);
        alert('حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى بعد قليل.');
    });
}

function handleLogout() { localStorage.removeItem('mazin_current_user'); location.reload(); }

/* ===================== USER DATA / BALANCE ===================== */
let userBalance = 0.00;
let cartItems = [];

function formatContactLink(platform, raw) {
    if (!raw) return '';
    raw = raw.trim();
    if (raw.startsWith('http')) return raw;

    if (platform === 'whatsapp') {
        let digits = raw.replace(/[^0-9]/g, '');
        if (digits.startsWith('0')) digits = '20' + digits.slice(1);
        return `https://wa.me/${digits}`;
    }
    if (platform === 'telegram') {
        let handle = raw.replace(/^@/, '');
        return `https://t.me/${handle}`;
    }
    return raw;
}

function loadUserData() {
    if (!currentUser) return;
    fetch(`${API_URL}/api/balance/${currentUser}`)
    .then(res => res.json())
    .then(data => {
        userBalance = data.balance !== undefined ? data.balance : 0.00;
        updateBalanceDisplay();
    }).catch(e => {});
}

function saveUserData() {
    let usersDB = JSON.parse(localStorage.getItem('mazin_users_db')) || {};
    if (currentUser && usersDB[currentUser]) {
        usersDB[currentUser].cart = cartItems;
        localStorage.setItem('mazin_users_db', JSON.stringify(usersDB));
    }
}

function updateBalanceDisplay() {
    document.getElementById('user-balance').innerText = userBalance.toFixed(2);
    let sideBal = document.getElementById('sidebar-balance-text');
    if (sideBal) sideBal.innerText = userBalance.toFixed(2) + ' ج';
    saveUserData();
}

/* ===================== MUSIC ===================== */
const music = document.getElementById('bg-music');
const musicIcon = document.getElementById('music-icon');
let musicPlayPromise = null;

function safePauseMusic() {
    if (musicPlayPromise) {
        musicPlayPromise.then(() => {
            music.pause();
            musicIcon.classList.remove('fa-spin');
        }).catch(() => {
            musicIcon.classList.remove('fa-spin');
        });
    } else {
        music.pause();
        musicIcon.classList.remove('fa-spin');
    }
}

function toggleMusic() {
    if (music.paused) {
        music.volume = 0.3;
        musicPlayPromise = music.play();
        musicIcon.classList.add('fa-spin');
        musicPlayPromise.catch(() => {
            musicIcon.classList.remove('fa-spin');
        });
    } else {
        safePauseMusic();
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) safePauseMusic();
});
window.addEventListener('pagehide', () => { music.pause(); });

/* ===================== DEPOSIT ===================== */
function confirmDeposit() {
    let amount = parseFloat(document.getElementById('deposit-amount-input').value) || 0;
    let code = document.getElementById('deposit-code-input').value.trim();

    if (!(amount > 0) || !code) {
        alert('أدخل المبلغ ورقم العملية بشكل صحيح.');
        return;
    }

    if (!currentUser) {
        alert('يجب تسجيل الدخول أولاً قبل إرسال طلب شحن!');
        return;
    }

    fetch(`${API_URL}/api/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: currentUser,
            amount: amount,
            code: code,
            date: new Date().toLocaleString()
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert(data.message || 'تم إرسال طلب الشحن بنجاح في انتظار مراجعة الأدمن!');
            document.getElementById('deposit-amount-input').value = '';
            document.getElementById('deposit-code-input').value = '';
            closeDepositModal();
        } else {
            alert(data.message || 'فشل إرسال طلب الشحن.');
        }
    })
    .catch(err => {
        console.error(err);
        alert('تعذر إرسال طلب الشحن الآن، حاول مرة أخرى بعد قليل.');
    });
}

function openDepositModal() {
    closeCheckoutModal();

    fetch(`${API_URL}/api/settings`)
    .then(res => res.json())
    .then(data => {
        let wallet = data.settings && data.settings.wallet;
        if (wallet) document.getElementById('dynamic-wallet-num').innerText = wallet;
    })
    .catch(() => {});

    let modal = document.getElementById('deposit-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeDepositModal() {
    let modal = document.getElementById('deposit-modal');
    modal.classList.remove('active');
    setTimeout(() => { if (!modal.classList.contains('active')) modal.style.display = 'none'; }, 300);
}

/* ===================== CART ===================== */
function saveCart() {
    saveUserData();
    renderCart();
}

function addToCart(name, price) {
    cartItems.push({ name, price });
    saveCart();
    alert('تمت الإضافة للسلة!');
}

function removeFromCart(index) {
    cartItems.splice(index, 1);
    saveCart();
}

function renderCart() {
    let container = document.getElementById('cart-items-container');
    if (!container) return;
    if (cartItems.length === 0) {
        container.innerHTML = '<div class="empty-state">سلة الشراء فارغة حالياً.</div>';
        document.getElementById('cart-counter').innerText = 0;
        return;
    }
    let html = '';
    let total = 0;
    cartItems.forEach((item, index) => {
        total += item.price;
        html += `
            <div class="cart-box-item">
                <span>${item.name}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <strong style="color:var(--accent-green);">${item.price} ج</strong>
                    <button onclick="removeFromCart(${index})" style="background:none; border:none; color:var(--danger-color); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    html += `<button class="submit-deposit-btn" style="margin-top: 15px;" onclick="openCheckoutModal(${total})">إتمام شراء السلة بالرصيد (${total} ج)</button>`;
    container.innerHTML = html;
    document.getElementById('cart-counter').innerText = cartItems.length;
}

/* ===================== CHECKOUT ===================== */
function openCheckoutModal(total) {
    closeDepositModal();
    let modalBody = document.getElementById('checkout-modal-body');
    let actionContainer = document.getElementById('checkout-action-container');

    if (userBalance >= total) {
        modalBody.innerHTML = `
            إجمالي السلة: <span>${total} ج</span><br>
            رصيدك الحالي: <span>${userBalance.toFixed(2)} ج</span><br>
            الرصيد بعد الخصم: <span style="color:var(--accent-green);">${(userBalance - total).toFixed(2)} ج</span><br><br>
            هل أنت متأكد من خصم المبلغ وإرسال طلبك للأدمن انتظر؟
        `;
        actionContainer.innerHTML = `<button class="submit-deposit-btn" onclick="executeBalanceCheckout(${total})">تأكيد الخصم وإرسال الطلب</button>`;
    } else {
        let needed = total - userBalance;
        modalBody.innerHTML = `
            إجمالي السلة: <span>${total} ج</span><br>
            رصيدك الحالي: <span style="color:var(--danger-color);">${userBalance.toFixed(2)} ج</span><br>
            المبلغ المطلوب إضافته: <span style="color:var(--danger-color);">${needed.toFixed(2)} ج</span><br><br>
            عذراً، رصيدك الحالي لا يكفي لإتمام عملية الشراء!
        `;
        actionContainer.innerHTML = `<button class="submit-deposit-btn" style="background:var(--primary-blue, #3b82f6);" onclick="closeCheckoutModal(); openDepositModal();">الذهاب لشحن الرصيد الآن</button>`;
    }

    let checkoutModal = document.getElementById('checkout-modal');
    checkoutModal.style.display = 'flex';
    setTimeout(() => checkoutModal.classList.add('active'), 10);
}

function closeCheckoutModal() {
    let checkoutModal = document.getElementById('checkout-modal');
    checkoutModal.classList.remove('active');
    setTimeout(() => { if (!checkoutModal.classList.contains('active')) checkoutModal.style.display = 'none'; }, 300);
}

function executeBalanceCheckout(total) {
    if (userBalance < total) {
        alert('رصيدك غير كافي!');
        return;
    }

    fetch(`${API_URL}/api/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, total: total, items: cartItems })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            userBalance = data.new_balance;
            updateBalanceDisplay();

            cartItems = [];
            saveCart();
            closeCheckoutModal();
            alert('تم خصم المبلغ وإرسال الطلب للأدمن بنجاح!');
            switchTab('deliveries', null);
            loadUserData();
        } else {
            alert(data.message || 'فشل إتمام الشراء.');
        }
    })
    .catch(err => {
        alert('تعذر إتمام عملية الشراء الآن، حاول مرة أخرى بعد قليل.');
    });
}

/* ===================== DELIVERIES ===================== */
function renderUserDeliveries() {
    let container = document.getElementById('user-deliveries-container');
    if (!container) return;
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state">سجل الدخول الأول عشان تشوف طلباتك.</div>';
        return;
    }

    fetch(`${API_URL}/api/deliveries/${currentUser}`)
    .then(res => res.json())
    .then(data => {
        let deliveries = data.deliveries || [];
        if (deliveries.length === 0) {
            container.innerHTML = '<div class="empty-state">لا توجد طلبات مستلمة أو أكواد حالياً.</div>';
            return;
        }
        let html = '';
        deliveries.forEach((del, index) => {
            let timeTag = del.dateTime ? `<div style="font-size:10px; color:var(--accent-green); margin-bottom:6px; font-weight:700;"><i class="fa-regular fa-clock"></i> وقت الطلب الدقيق: ${del.dateTime}</div>` : '';

            html += `
                <div class="delivery-card-item">
                    <h4><i class="fa-solid fa-circle-check"></i> ${del.title}</h4>
                    ${timeTag}
                    <p>${del.desc}</p>
                    <div style="position: relative;">
                        <div class="delivery-code-box" id="delivery-code-${index}">${del.code}</div>
                        <button onclick="copyDeliveryCode('delivery-code-${index}')" style="position: absolute; top: 8px; left: 8px; background: var(--accent-green); color: #030508; border: none; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 800; cursor: pointer;">
                            <i class="fa-regular fa-copy"></i> نسخ
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    })
    .catch(() => {
        container.innerHTML = '<div class="empty-state">تعذر تحميل الطلبات الآن.</div>';
    });
}

function copyDeliveryCode(elementId) {
    let textToCopy = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('تم النسخ بنجاح!');
    }).catch(err => {
        alert('فشل النسخ تلقائياً.');
    });
}

/* ===================== HOME SOCIALS ===================== */
function renderHomeSocials() {
    const platforms = ['whatsapp', 'telegram', 'youtube', 'instagram', 'tiktok'];

    fetch(`${API_URL}/api/settings`)
    .then(res => res.json())
    .then(data => {
        let socialData = (data.settings && data.settings.social) || {};
        platforms.forEach(platform => {
            let link = formatContactLink(platform, socialData[platform]);
            let container = document.getElementById('home-' + platform + '-slot');
            if (!container) return;
            if (link && link.trim() !== "") {
                container.innerHTML = `<a href="${link}" target="_blank" class="home-social-btn">انضم / زيارة</a>`;
            } else {
                container.innerHTML = `<span class="no-link-text">لم يتم إضافة أي لينكات</span>`;
            }
        });
    })
    .catch(() => {
        platforms.forEach(platform => {
            let container = document.getElementById('home-' + platform + '-slot');
            if (container) container.innerHTML = `<span class="no-link-text">لم يتم إضافة أي لينكات</span>`;
        });
    });
}

/* ===================== PARTICLES BACKGROUND ===================== */
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particlesArray = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.8;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
        if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
    }
    draw() {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.65)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particlesArray = [];
    for (let i = 0; i < 50; i++) particlesArray.push(new Particle());
}
initParticles();

function animateCyberGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesArray.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animateCyberGrid);
}
animateCyberGrid();

/* ===================== PROTECTION ===================== */
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if (e.key === 'F12') e.preventDefault();
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) e.preventDefault();
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) e.preventDefault();
});

/* ===================== UI: SIDEBAR / TABS ===================== */
function toggleSidebar() { document.getElementById('sidebar-overlay').classList.toggle('active'); }

function switchTab(tabName, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
    let tabElem = document.getElementById('tab-' + tabName);
    if (tabElem) tabElem.classList.add('active');
    if (btnElement) btnElement.classList.add('active');
}

/* ===================== STORE: PANELS ===================== */
function renderStorePanels() {
    let grid = document.getElementById('store-panels-grid');
    if (!grid) return;

    fetch(`${API_URL}/api/panels`)
    .then(res => res.json())
    .then(data => {
        let panels = data.panels || [];
        if (panels.length === 0) {
            grid.innerHTML = '<div class="empty-state">لا توجد بنلات مضافة حالياً.</div>';
            return;
        }
        let html = '';
        panels.forEach((item, index) => {
            let p = item.prices || { '1d': 50 };
            let isVideo = item.img && (item.img.includes('data:video') || item.img.endsWith('.mp4'));
            let mediaElement = isVideo ?
                `<video src="${item.img}" autoplay muted loop playsinline style="width:100%; height:100%; object-fit:cover;"></video>` :
                `<img src="${item.img || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300'}" alt="Panel">`;

            html += `
                <div class="item-card">
                    <div class="server-status"><div class="status-dot"></div> نشط</div>
                    <div class="item-img-box">${mediaElement}</div>
                    <div class="item-body">
                        <div class="item-name">${item.name}</div>
                        <div class="item-desc">${item.desc}</div>
                        <div class="duration-box">
                            <label>اختر المدة:</label>
                            <select class="duration-select" id="duration-${index}" onchange="changePanelPrice(${index})">
                                <option value="1h" data-price="${p['1h'] || 10}">ساعة واحدة (${p['1h'] || 10} ج)</option>
                                <option value="3h" data-price="${p['3h'] || 25}">3 ساعات (${p['3h'] || 25} ج)</option>
                                <option value="6h" data-price="${p['6h'] || 40}">6 ساعات (${p['6h'] || 40} ج)</option>
                                <option value="12h" data-price="${p['12h'] || 60}">12 ساعة (${p['12h'] || 60} ج)</option>
                                <option value="1d" data-price="${p['1d'] || 50}" selected>يوم واحد (${p['1d'] || 50} ج)</option>
                                <option value="1w" data-price="${p['1w'] || 300}">أسبوع (${p['1w'] || 300} ج)</option>
                                <option value="1m" data-price="${p['1m'] || 900}">شهر (${p['1m'] || 900} ج)</option>
                            </select>
                        </div>
                        <div class="item-footer">
                            <span class="item-price" id="price-display-${index}">${p['1d'] || 50} ج</span>
                            <button class="buy-now-btn" onclick="addPanelToCartDynamic(${index}, '${item.name}')">إضافة للسلة</button>
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    })
    .catch(() => {
        grid.innerHTML = '<div class="empty-state">لا توجد بنلات مضافة حالياً.</div>';
    });
}

function changePanelPrice(index) {
    let selectElem = document.getElementById('duration-' + index);
    let price = selectElem.options[selectElem.selectedIndex].getAttribute('data-price');
    document.getElementById('price-display-' + index).innerText = price + ' ج';
}

function addPanelToCartDynamic(index, panelName) {
    let selectElem = document.getElementById('duration-' + index);
    let price = parseFloat(selectElem.options[selectElem.selectedIndex].getAttribute('data-price'));
    let durationText = selectElem.options[selectElem.selectedIndex].text;
    let fullName = `${panelName} (${durationText.split('(')[0].trim()})`;
    addToCart(fullName, price);
}

/* ===================== STORE: FILES ===================== */
function renderStoreFiles() {
    let grid = document.getElementById('store-files-grid');
    if (!grid) return;

    fetch(`${API_URL}/api/files`)
    .then(res => res.json())
    .then(data => {
        let files = data.files || [];
        if (files.length === 0) {
            grid.innerHTML = '<div class="empty-state">لا توجد ملفات أو سورسات مضافة حالياً.</div>';
            return;
        }
        let html = '';
        files.forEach(item => {
            let isVideo = item.img && (item.img.includes('data:video') || item.img.endsWith('.mp4'));
            let mediaElement = isVideo ?
                `<video src="${item.img}" autoplay muted loop playsinline style="width:100%; height:100%; object-fit:cover;"></video>` :
                `<img src="${item.img || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300'}" alt="File">`;

            html += `
                <div class="item-card">
                    <div class="server-status"><div class="status-dot"></div> جاهز</div>
                    <div class="item-img-box">${mediaElement}</div>
                    <div class="item-body">
                        <div class="item-name">${item.name}</div>
                        <div class="item-desc">${item.desc}</div>
                        <div class="item-footer">
                            <span class="item-price">${item.price} ج</span>
                            <button class="buy-now-btn" onclick="addToCart('${item.name}', ${item.price})">إضافة للسلة</button>
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    })
    .catch(() => {
        grid.innerHTML = '<div class="empty-state">لا توجد ملفات أو سورسات مضافة حالياً.</div>';
    });
}

/* ===================== STORE: ACCOUNTS ===================== */
function renderStoreAccounts() {
    let grid = document.getElementById('store-accounts-grid');
    if (!grid) return;

    fetch(`${API_URL}/api/accounts`)
    .then(res => res.json())
    .then(data => {
        let accounts = data.accounts || [];
        if (accounts.length === 0) {
            grid.innerHTML = '<div class="empty-state">لا توجد حسابات مضافة حالياً.</div>';
            return;
        }
        let html = '';
        accounts.forEach(item => {
            html += `
                <div class="item-card">
                    <div class="server-status"><div class="status-dot"></div> متاح</div>
                    <div class="item-img-box"><img src="${item.img || 'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=300'}" alt="Account"></div>
                    <div class="item-body">
                        <div class="item-name">${item.name}</div>
                        <div class="item-desc">${item.desc}</div>
                        <div class="item-footer">
                            <span class="item-price">${item.price} ج</span>
                            <button class="buy-now-btn" onclick="addToCart('${item.name}', ${item.price})">إضافة للسلة</button>
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    })
    .catch(() => {
        grid.innerHTML = '<div class="empty-state">لا توجد حسابات مضافة حالياً.</div>';
    });
}

/* ===================== STORE: SUPPORT ===================== */
function renderStoreSupport() {
    let grid = document.getElementById('store-support-grid');
    if (!grid) return;

    fetch(`${API_URL}/api/settings`)
    .then(res => res.json())
    .then(data => {
        let supportObj = (data.settings && data.settings.support) || {};
        if (!supportObj.whatsapp && !supportObj.telegram) {
            grid.innerHTML = '<div class="empty-state">لا توجد وسائل دعم فني مضافة حالياً من لوحة التحكم.</div>';
            return;
        }
        let html = '';
        if (supportObj.whatsapp) {
            let cleanWa = formatContactLink('whatsapp', supportObj.whatsapp);
            html += `
                <div class="support-card-item">
                    <div style="font-size:12px; font-weight:700;"><i class="fa-brands fa-whatsapp" style="color:#25d366;"></i> واتساب الدعم الفني</div>
                    <div class="support-value">${supportObj.message || 'تواصل معنا لأي استفسار'}</div>
                    <a href="${cleanWa}" target="_blank" class="contact-btn">مراسلة واتساب</a>
                </div>
            `;
        }
        if (supportObj.telegram) {
            let cleanTg = formatContactLink('telegram', supportObj.telegram);
            html += `
                <div class="support-card-item">
                    <div style="font-size:12px; font-weight:700;"><i class="fa-brands fa-telegram" style="color:#0088cc;"></i> تليجرام الدعم الفني</div>
                    <div class="support-value">معرف التليجرام الرسمي</div>
                    <a href="${cleanTg}" target="_blank" class="contact-btn" style="background:#0088cc; color:#fff;">مراسلة تليجرام</a>
                </div>
            `;
        }
        grid.innerHTML = html;
    })
    .catch(() => {
        grid.innerHTML = '<div class="empty-state">لا توجد وسائل دعم فني مضافة حالياً من لوحة التحكم.</div>';
    });
}
