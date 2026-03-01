import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZHdbR7hGeeTZyPBzPOdjZBjxtZlH-KA0",
    authDomain: "trafiknet.firebaseapp.com",
    projectId: "trafiknet",
    storageBucket: "trafiknet.firebasestorage.app",
    messagingSenderId: "795808534933",
    appId: "1:795808534933:web:de1c0a7eec1293eb8ce69c",
    measurementId: "G-ZQ55WL7P24"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- GOOGLE ANALYTİCS ---
try {
    getAnalytics(app);
} catch (e) {
    console.warn("Analytics başlatılamadı:", e);
}

// ============================================================
// İLK İÇERİK (SEED DATA) — Koleksiyon boşsa otomatik eklenir
// ============================================================
const SEED_POST = {
    baslik: "1 Mart 2026 İtibarıyla Trafikte Başlayan Yeni Dönem: Cezalar Güncellendi",
    kisaOz: "2026 yılı itibarıyla trafik para cezalarında yeniden değerleme yapıldı. Ehliyet sınavı koşulları, ceza puanı sistemi ve aday sürücü kurallarında önemli değişiklikler hayata geçti. Sürücülerin mutlaka bilmesi gereken tüm güncel düzenlemeler bu rehberde.",
    slug: "trafik-cezalari-2026-yeni-donem",
    kategori: "Mevzuat",
    gorselUrl: "",
    tamMetin: `
<h2>2026 Trafik Cezaları: Yeniden Değerleme ile Ne Kadar Arttı?</h2>
<p>Her yıl ocak ayında Türkiye İstatistik Kurumu (TÜİK) tarafından açıklanan yeniden değerleme katsayısı, trafik para cezalarını doğrudan etkiliyor. <strong>2026 yılı için belirlenen yeniden değerleme oranıyla birlikte</strong> temel trafik cezalarında ciddi artışlar yaşandı. Bu artışlar, Karayolları Trafik Kanunu'nun 116. maddesi kapsamında uygulanıyor.</p>

<div class="info-box warning">
<p>⚠️ <strong>Önemli:</strong> Trafik cezaları, her yıl yeniden değerleme oranında güncellenir. Birden fazla ihlal bulunması halinde cezalar ayrı ayrı uygulanır.</p>
</div>

<h2>🚦 Temel Trafik Cezalarında 2026 Güncel Tutarlar</h2>
<p>Aşağıdaki tabloda en sık karşılaşılan ihlaller için 2026 yılında uygulanan ceza miktarları ve ceza puanları yer almaktadır:</p>

<table>
<thead>
<tr><th>İhlal Türü</th><th>Para Cezası (TL)</th><th>Ceza Puanı</th></tr>
</thead>
<tbody>
<tr><td>Emniyet kemeri takmamak</td><td>990 TL</td><td>15 Puan</td></tr>
<tr><td>Seyir halinde cep telefonu kullanmak</td><td>1.650 TL</td><td>15 Puan</td></tr>
<tr><td>Kırmızı ışık ihlali</td><td>1.320 TL</td><td>20 Puan</td></tr>
<tr><td>Hız sınırını %10-30 aşmak</td><td>990 TL</td><td>10 Puan</td></tr>
<tr><td>Hız sınırını %30-50 aşmak</td><td>1.980 TL</td><td>20 Puan</td></tr>
<tr><td>Hız sınırını %50'den fazla aşmak</td><td>3.300 TL + Ehliyete El Koyma</td><td>30 Puan</td></tr>
<tr><td>Alkollü araç kullanmak (0.50 promil)</td><td>3.300 TL + 6 Ay Süreyle Askıya Alma</td><td>100 Puan</td></tr>
<tr><td>Geçiş üstünlüğüne uymamak</td><td>990 TL</td><td>10 Puan</td></tr>
<tr><td>Park ihlali</td><td>750 TL</td><td>—</td></tr>
</tbody>
</table>

<h2>📋 Ceza Puanı Sistemi: Ehliyetinizi Kaybetmemek İçin Bilinmesi Gerekenler</h2>
<p>Türkiye'de uygulanan ceza puanı sistemi, sürücülerin tekrarlayan ihlallerini önlemeye yönelik bir caydırıcılık mekanizmasıdır. Sistem şu şekilde işliyor:</p>

<ul>
<li><strong>100 puan dolduğunda:</strong> Ehliyetiniz 2 ay süreyle geçici olarak geri alınır. Bu süre içinde yeniden sınava girme zorunluluğu oluşur.</li>
<li><strong>Aday (Stajyer) Sürücüler için 2 yıl 75 puan:</strong> İlk 2 yıllık aday sürücülük döneminde 75 ceza puanına ulaşılması durumunda ehliyet iptal edilir.</li>
<li><strong>Puanlar silinir mi?</strong> Belirli bir ihlal işlenmeden 1 yıl geçmesi durumunda puan sicili temiz sayılabilir (mahkeme kararına göre değişir).</li>
</ul>

<div class="info-box">
<p>💡 <strong>Bilgi Notu:</strong> Ceza puanları trafik noktasında öğrenilebilir ya da e-devlet üzerinden "Araç ve Sürücü Bilgileri" bölümünden takip edilebilir.</p>
</div>

<h2>🚗 Aday (Stajyer) Sürücüler: 2026'da Kural Sıkılaşıyor mu?</h2>
<p>Ehliyet yeni almış sürücüler için <strong>2 yıllık aday sürücülük dönemi</strong> oldukça kritik. Bu dönemde normal sürücülere kıyasla çok daha sert yaptırımlar uygulanıyor:</p>

<ul>
<li>Alkol toleransı <strong>sıfır</strong>; 0.20 promil dahi ehliyetin iptaline yol açar.</li>
<li>Toplam 75 ceza puanına ulaşmak ehliyeti geçersiz kılar ve kursa yeniden başlamayı zorunlu hale getirir.</li>
<li>Ehliyet iptali durumunda <strong>bekleme süresi uygulanır</strong>; yani belirli bir süre geçmeden yeni ehliyet başvurusu yapılamaz.</li>
</ul>

<h2>📝 Ehliyet Sınavı 2026: Değişen Sorular ve Yeni Konular</h2>
<p>MEB tarafından her yıl güncellenen ehliyet sınav havuzunda 2026 yılında bazı önemli değişiklikler yapıldı. Güncel müfredatta öne çıkan konular:</p>

<ul>
<li><strong>Elektronik araçlar ve hibrit teknoloji:</strong> Elektrikli araçların farları, güvenli durdurma prosedürleri ve şarj altyapısı.</li>
<li><strong>İklim ve çevre bilinci:</strong> Emisyon sınırları, çevreci sürüş teknikleri ve park kısıtlama bölgeleri.</li>
<li><strong>Güncellenmiş ilk yardım prosedürleri:</strong> Yeni TYD (Temel Yaşam Desteği) protokollerine uygun sorular.</li>
<li><strong>Akıllı trafik sistemleri:</strong> Radar, kamera ve otomatik ceza uygulamaları hakkında farkındalık soruları.</li>
</ul>

<div class="info-box success">
<p>✅ <strong>TrafikNet Önerisi:</strong> Güncel soru havuzuna göre hazırlanmak için TrafikNet'in deneme sınavı modülünü kullanabilirsiniz. Tüm sorular 2026 müfredatına göre düzenlenmiştir.</p>
</div>

<h2>🔑 Ehliyet Başvurusu 2026: Güncel Süreç ve Ücretler</h2>
<p>B sınıfı ehliyet almak isteyenler için 2026 yılında güncellenmiş resmi başvuru süreci şu adımları içeriyor:</p>

<ol>
<li><strong>Sürücü Kursu Kaydı:</strong> MEB lisanslı bir kursa kayıt yaptırın. Teorik dersler 46 saat, uygulama dersleri 12 saat zorunludur.</li>
<li><strong>Sağlık Raporu:</strong> Aile hekiminizden veya özel klinikten ehliyet için sağlık raporu alın.</li>
<li><strong>Teorik Sınav:</strong> 50 çoktan seçmeli soru; geçme notu 70 puandır (35 doğru). Ehliyet Sınav Merkezi (ESM) üzerinden gerçekleştirilir.</li>
<li><strong>Direksiyon Sınavı (PDSK):</strong> Sınav aracıyla uygulama sınavı. Hata puanı sistemiyle değerlendirilir.</li>
<li><strong>Ehliyet Ücreti:</strong> 2026 yılı için B sınıfı ehliyet harcı yaklaşık 3.200–3.800 TL aralığında olup resmî Hazine ve Maliye Bakanlığı tarifesine tabidir.</li>
</ol>

<h2>⚠️ 2026'da En Çok Dikkat Edilmesi Gereken Kural Değişiklikleri</h2>
<p>Aşağıdaki düzenlemeler, 2026 yılında sürücülerin en sık gözden kaçırdığı kritik noktalardır:</p>

<ul>
<li><strong>Park sensörü zorunluluğu</strong> yeni tescil edilecek araçlar için adım adım uygulamaya giriyor.</li>
<li><strong>Çocuk koltuğu denetimi artırıldı:</strong> 135 cm altındaki çocukların uygun koltuk olmadan taşınması 1.980 TL ceza + 25 ceza puanı.</li>
<li><strong>Bisiklet şeridi ihlalleri</strong> büyükşehirlerde kamera sistemiyle otomatik olarak tespit ediliyor.</li>
<li><strong>Yaya geçidi ihlali:</strong> Yayaya yol vermemek 1.320 TL ceza + 15 puan olarak güncellendi.</li>
</ul>

<div class="info-box">
<p>📌 <strong>Sonuç:</strong> 2026 yılı, trafik mevzuatının belki de son yılların en kapsamlı güncellemelerini getirdiği bir dönem oldu. Sürücüler olarak bilgi sahibi olmak, hem para cezasından hem de ceza puanı kaybından korunmanın en etkili yolu.</p>
</div>
`
};

// ============================================================
// SAYFA TESPİTİ VE YÖNLENDİRME
// ============================================================
const currentPage = window.location.pathname;

if (currentPage.includes('rehber-detay')) {
    // Detay sayfası
    initDetayPage();
} else {
    // Liste sayfası
    initListePage();
}

// ============================================================
// LİSTE SAYFASI
// ============================================================
async function initListePage() {
    try {
        const q = query(collection(db, "rehber"), orderBy("yayinTarihi", "desc"));
        const snapshot = await getDocs(q);

        let posts = [];
        snapshot.forEach(doc => {
            posts.push({ id: doc.id, ...doc.data() });
        });

        // Eğer koleksiyon boşsa seed yap
        if (posts.length === 0) {
            await seedFirstPost();
            // Tekrar çek
            const snap2 = await getDocs(q);
            snap2.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
        }

        // rehber.html'deki global fonksiyon
        if (typeof window.setAllPosts === 'function') {
            window.setAllPosts(posts);
        }

    } catch (err) {
        console.error("Rehber listesi yüklenemedi:", err);
        const grid = document.getElementById('rehberGrid');
        if (grid) {
            grid.innerHTML = `<div class="loading-state">
                <p style="color: #ef4444;">İçerikler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</p>
            </div>`;
        }
    }
}

// ============================================================
// DETAY SAYFASI
// ============================================================
async function initDetayPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) {
        showError();
        return;
    }

    try {
        const q = query(collection(db, "rehber"), where("slug", "==", slug));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            // Eğer bu seed makalenin slugıysa, seed yap ve tekrar dene
            if (slug === SEED_POST.slug) {
                await seedFirstPost();
                const snap2 = await getDocs(q);
                if (snap2.empty) { showError(); return; }
                snap2.forEach(doc => renderDetay({ id: doc.id, ...doc.data() }));
            } else {
                showError();
            }
            return;
        }

        let postData = null;
        snapshot.forEach(doc => { postData = { id: doc.id, ...doc.data() }; });
        renderDetay(postData);

        // Diğer yazıları da yükle
        loadOtherPosts(postData.id);

    } catch (err) {
        console.error("Rehber detayı yüklenemedi:", err);
        showError();
    }
}

function renderDetay(post) {
    // Loading gizle, içerik göster
    document.getElementById('loadingWrapper').style.display = 'none';
    document.getElementById('articleContent').style.display = 'block';

    // Dinamik Meta Güncelleme
    const pageTitle = `${post.baslik} | TrafikNet Rehber`;
    document.title = pageTitle;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', post.kisaOz);

    // JSON-LD güncelle
    const dateStr = post.yayinTarihi?.toDate
        ? post.yayinTarihi.toDate().toISOString()
        : new Date().toISOString();

    const schemaEl = document.getElementById('articleSchema');
    if (schemaEl) {
        schemaEl.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": post.baslik,
            "description": post.kisaOz,
            "datePublished": dateStr,
            "url": window.location.href,
            "publisher": {
                "@type": "Organization",
                "name": "TrafikNet",
                "url": "https://trafiknet.site",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://trafiknet.site/app_icon.png"
                }
            }
        });
    }

    // Kategori badge
    const badgeClasses = {
        'Mevzuat': 'badge-mevzuat',
        'Duyuru': 'badge-duyuru',
        'Teknik Bilgi': 'badge-teknik'
    };
    const badgeEl = document.getElementById('artKategoriBadge');
    if (badgeEl) {
        badgeEl.textContent = post.kategori || 'Rehber';
        badgeEl.className = `kategori-badge ${badgeClasses[post.kategori] || 'badge-mevzuat'}`;
    }

    // Tarih
    const artDate = document.getElementById('artDate');
    if (artDate) {
        const d = post.yayinTarihi?.toDate ? post.yayinTarihi.toDate() : new Date();
        artDate.textContent = `📅 ${d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    }

    // Başlık ve özet
    const baslikEl = document.getElementById('artBaslik');
    if (baslikEl) baslikEl.textContent = post.baslik;
    const ozEl = document.getElementById('artKisaOz');
    if (ozEl) ozEl.textContent = post.kisaOz;

    // Kapak görseli
    const gorselEl = document.getElementById('artGorsel');
    if (gorselEl && post.gorselUrl) {
        gorselEl.src = post.gorselUrl;
        gorselEl.alt = post.baslik;
        gorselEl.style.display = 'block';
    }

    // Tam metin (HTML olarak) — shortcode işlenerek render edilir
    const metinEl = document.getElementById('artTamMetin');
    if (metinEl) {
        const islenmisMetin = processShortcodes(post.tamMetin || '<p>İçerik bulunamadı.</p>');
        metinEl.innerHTML = islenmisMetin;
    }
}

async function loadOtherPosts(currentId) {
    const listEl = document.getElementById('otherPostsList');
    if (!listEl) return;

    try {
        const q = query(collection(db, "rehber"), orderBy("yayinTarihi", "desc"));
        const snapshot = await getDocs(q);

        const icons = { 'Mevzuat': '⚖️', 'Duyuru': '📢', 'Teknik Bilgi': '🔧' };
        let html = '';
        let count = 0;

        snapshot.forEach(doc => {
            if (doc.id === currentId || count >= 4) return;
            const d = doc.data();
            const icon = icons[d.kategori] || '📋';
            const dateStr = d.yayinTarihi?.toDate
                ? d.yayinTarihi.toDate().toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—';

            html += `
            <a href="rehber-detay.html?slug=${d.slug}" class="other-post-link">
                <span class="other-post-icon">${icon}</span>
                <div>
                    <h4>${d.baslik}</h4>
                    <span>${d.kategori} · ${dateStr}</span>
                </div>
            </a>`;
            count++;
        });

        listEl.innerHTML = html || '<p style="color: #94a3b8; font-size: 14px;">Başka yazı bulunamadı.</p>';

    } catch (err) {
        console.error("Diğer yazılar yüklenemedi:", err);
        listEl.innerHTML = '<p style="color: #94a3b8; font-size: 14px;">Yüklenirken hata oluştu.</p>';
    }
}

function showError() {
    document.getElementById('loadingWrapper').style.display = 'none';
    document.getElementById('errorWrapper').style.display = 'block';
}

// ============================================================
// SEED: İlk yazıyı Firebase'e ekle
// ============================================================
async function seedFirstPost() {
    try {
        await addDoc(collection(db, "rehber"), {
            ...SEED_POST,
            yayinTarihi: serverTimestamp()
        });
        console.log("✅ İlk Rehber yazısı Firebase'e eklendi (seed).");
    } catch (err) {
        console.error("Seed hatası:", err);
    }
}

// ============================================================
// SHORTCODE ENGINE
// Kısa kodları HTML bileşenleriyle eşleştiren evrensel fonksiyon.
// Yeni widget eklemek için SHORTCODES objesine key/value ekleyin.
// ============================================================
const SHORTCODES = {
    'DEGER_KAYBI_ROBOTU': getDkrWidgetHTML
};

function processShortcodes(htmlMetin) {
    for (const [kod, htmlFn] of Object.entries(SHORTCODES)) {
        const placeholder = `[${kod}]`;
        if (htmlMetin.includes(placeholder)) {
            htmlMetin = htmlMetin.replaceAll(placeholder, htmlFn());
        }
    }
    return htmlMetin;
}

// ============================================================
// DEĞER KAYBI ROBOTU — Hesaplama Widget'ı HTML'i
// ============================================================
function getDkrWidgetHTML() {
    return `
    <div class="dkr-widget" id="dkrWidget">
        <div class="dkr-header">
            <div class="dkr-icon">🚗</div>
            <div>
                <h3 class="dkr-title">Araç Değer Kaybı Hesaplayıcı</h3>
                <p class="dkr-subtitle">Aracınızın tahmini değer kaybını anında hesaplayın</p>
            </div>
        </div>

        <div class="dkr-form">
            <div class="dkr-field">
                <label class="dkr-label">💰 Araç Fiyatı (TL)</label>
                <div class="dkr-input-wrap">
                    <input type="number" id="dkrFiyat" class="dkr-input" placeholder="Örn: 1000000" min="0" step="1000">
                    <span class="dkr-unit">TL</span>
                </div>
            </div>
            <div class="dkr-field">
                <label class="dkr-label">🛣️ Kilometre</label>
                <div class="dkr-input-wrap">
                    <input type="number" id="dkrKm" class="dkr-input" placeholder="Örn: 45000" min="0" step="1000">
                    <span class="dkr-unit">KM</span>
                </div>
            </div>
            <div class="dkr-field">
                <label class="dkr-label">📅 Araç Yaşı</label>
                <div class="dkr-input-wrap">
                    <input type="number" id="dkrYas" class="dkr-input" placeholder="Örn: 3" min="0" max="30">
                    <span class="dkr-unit">Yıl</span>
                </div>
            </div>
        </div>

        <button class="dkr-btn" onclick="dkrHesapla()">⚡ Hesapla</button>

        <div class="dkr-result" id="dkrSonuc" style="display:none;">
            <div class="dkr-result-row">
                <span class="dkr-result-label">Tahmini Değer Kaybı</span>
                <span class="dkr-result-value" id="dkrKayipOran">—</span>
            </div>
            <div class="dkr-result-row dkr-highlight">
                <span class="dkr-result-label">Güncel Piyasa Değeri</span>
                <span class="dkr-result-value" id="dkrGuncelDeger">—</span>
            </div>
            <div class="dkr-result-row">
                <span class="dkr-result-label">Kayıp Tutarı</span>
                <span class="dkr-result-value dkr-red" id="dkrKayipTutar">—</span>
            </div>
            <p class="dkr-disclaimer">⚠️ Bu hesaplama yalnızca bilgilendirme amaçlıdır. Gerçek değer için ekspere başvurunuz.</p>
        </div>
    </div>
    <script>
    function dkrHesapla() {
        const fiyat = parseFloat(document.getElementById('dkrFiyat').value);
        const km    = parseFloat(document.getElementById('dkrKm').value);
        const yas   = parseFloat(document.getElementById('dkrYas').value);

        if (!fiyat || isNaN(fiyat) || fiyat <= 0) { alert('Lütfen geçerli bir araç fiyatı girin.'); return; }
        if (km < 0 || isNaN(km))                  { alert('Lütfen geçerli bir kilometre değeri girin.'); return; }
        if (yas < 0 || isNaN(yas))                { alert('Lütfen geçerli bir araç yaşı girin.'); return; }

        // Değer kaybı hesaplama modeli (yaklaşık TRAMER tabanlı)
        let yasKayip = 0;
        if      (yas <= 1)  yasKayip = 0.15;
        else if (yas <= 2)  yasKayip = 0.25;
        else if (yas <= 3)  yasKayip = 0.35;
        else if (yas <= 5)  yasKayip = 0.45;
        else if (yas <= 8)  yasKayip = 0.55;
        else if (yas <= 12) yasKayip = 0.65;
        else                yasKayip = 0.70;

        // Her 10.000 km için %1 ek kayıp (maks %20)
        const kmKayip = Math.min((km / 10000) * 0.01, 0.20);
        const toplamKayipOrani = Math.min(yasKayip + kmKayip, 0.80);

        const kayipTutar  = fiyat * toplamKayipOrani;
        const guncelDeger = fiyat - kayipTutar;

        const formatTL = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TL';

        document.getElementById('dkrKayipOran').textContent   = '%' + (toplamKayipOrani * 100).toFixed(1);
        document.getElementById('dkrGuncelDeger').textContent = formatTL(guncelDeger);
        document.getElementById('dkrKayipTutar').textContent  = '- ' + formatTL(kayipTutar);

        const sonuc = document.getElementById('dkrSonuc');
        sonuc.style.display = 'block';
        sonuc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    <\/script>`;
}
