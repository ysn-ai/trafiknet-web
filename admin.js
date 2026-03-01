import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZHdbR7hGeeTZyPBzPOdjZBjxtZlH-KA0",
    authDomain: "trafiknet.firebaseapp.com",
    projectId: "trafiknet",
    storageBucket: "trafiknet.firebasestorage.app",
    messagingSenderId: "795808534933",
    appId: "1:795808534933:web:de1c0a7eec1293eb8ce69c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const ADMIN_EMAIL = "yasin1413@gmail.com";
let globalQuestionsConfig = []; // To hold table data locally for mapping

// --- GÜVENLİK KONTROLÜ ---
onAuthStateChanged(auth, (user) => {
    const loader = document.getElementById('loader');

    if (user && user.email === ADMIN_EMAIL && user.emailVerified) {
        document.getElementById('adminBody').style.display = 'block';
        if (loader) loader.style.display = 'none';
        showToast("Admin yetkisi doğrulandı. Hoş geldiniz.");
        fetchQuestions(); // Listeyi doldur
    } else {
        alert("Erişim Engellendi: Bu sayfayı görüntüleme yetkiniz yok.");
        window.location.href = 'index.html';
    }
});

window.handleLogout = async function () {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Çıkış işlemi başarısız oldu: ", error);
    }
};

// --- GÖRSEL YÜKLEME VE ÖNİZLEME (UI) ---
const fileInputs = [
    { input: 'mainImage', preview: 'mainImagePreview' },
    { input: 'imgA', preview: 'previewA' },
    { input: 'imgB', preview: 'previewB' },
    { input: 'imgC', preview: 'previewC' },
    { input: 'imgD', preview: 'previewD' },
];

fileInputs.forEach(item => {
    const inputEl = document.getElementById(item.input);
    const previewEl = document.getElementById(item.preview);

    if (inputEl && previewEl) {
        inputEl.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    previewEl.src = e.target.result;
                    previewEl.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                previewEl.style.display = 'none';
                previewEl.src = '';
            }
        });
    }
});

// --- FIREBASE STORAGE YÜKLEME ARACI ---
async function uploadImageToStorage(file, folderPath) {
    if (!file) return "";

    // Güvenli dosya adı oluştur ('image_12345.png')
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-]/g, "")}`;
    const storageRef = ref(storage, `${folderPath}/${fileName}`);

    try {
        const uploadTask = await uploadBytesResumable(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);
        return downloadURL;
    } catch (error) {
        console.error("Storage yükleme hatası:", error);
        throw error;
    }
}

// --- FORMU KAYDET (FIRESTORE) ---
document.getElementById('addQuestionForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    loader.style.display = 'flex';
    loaderText.innerText = 'Veriler ve görseller buluta yükleniyor...';

    try {
        const kategori = document.getElementById('kategori').value;
        const cevap = document.getElementById('cevap').value;
        const soru = document.getElementById('soru').value;

        let imageUrl = "";
        let hasImageOptions = false;

        // Düzenleme (Edit) kontrolü
        const editId = document.getElementById('addQuestionForm').getAttribute('data-edit-id');
        let mevcutSoru = null;

        if (editId) {
            mevcutSoru = globalQuestionsConfig.find(q => q.id === editId);
            // Düzenleme modunda resim seçilmemişse eski resmi koru
            if (mevcutSoru && mevcutSoru.imageUrl) {
                imageUrl = mevcutSoru.imageUrl;
            }
        }

        // 1. Ana Görseli Yükle (Yeni resim varsa eskisini ezeriz)
        const mainImageFile = document.getElementById('mainImage').files[0];
        if (mainImageFile) {
            imageUrl = await uploadImageToStorage(mainImageFile, 'questions');
        }

        // 2. Şık Sinyallerini Al (Metin veya Resim)
        const optsData = [
            { id: 'A', textId: 'textA', fileId: 'imgA' },
            { id: 'B', textId: 'textB', fileId: 'imgB' },
            { id: 'C', textId: 'textC', fileId: 'imgC' },
            { id: 'D', textId: 'textD', fileId: 'imgD' }
        ];

        let finalSecenekler = [];

        for (let i = 0; i < optsData.length; i++) {
            const el = optsData[i];
            const file = document.getElementById(el.fileId).files[0];
            const textValue = document.getElementById(el.textId).value;

            if (file) {
                // Eğer şıkta yeni resim seçilmişse yükle
                const optUrl = await uploadImageToStorage(file, 'options');
                finalSecenekler.push(`${el.id}) ${optUrl}`);
                hasImageOptions = true;
            } else {
                // Sadece metin varsa veya eski resim varsa koru
                if (mevcutSoru && mevcutSoru.secenekler && mevcutSoru.secenekler[i]) {
                    const eskiOpt = mevcutSoru.secenekler[i];
                    // Eğer eşkiden resim varsa ve değiştirilmediyse / metin girilmediyse koru (eskiURL)
                    if (eskiOpt.includes('http') && !textValue) {
                        finalSecenekler.push(eskiOpt);
                        hasImageOptions = true;
                        continue;
                    }
                }
                finalSecenekler.push(`${el.id}) ${textValue || "Boş Şık"}`);
            }
        }

        // 3. Firestore'a Kaydet veya Güncelle
        const questionData = {
            kategori: kategori,
            soru: soru,
            cevap: cevap,
            imageUrl: imageUrl,
            hasImageOptions: hasImageOptions,
            secenekler: finalSecenekler
        };

        if (editId) {
            await updateDoc(doc(db, "questions", editId), questionData);
            showToast("Soru başarıyla güncellendi! ✅");
            window.cancelEditQuestion(); // Formu sıfırla
        } else {
            await addDoc(collection(db, "questions"), questionData);
            showToast("Soru başarıyla eklendi! 🎉");

            // Formu temizle
            document.getElementById('addQuestionForm').reset();
            fileInputs.forEach(item => {
                const prev = document.getElementById(item.preview);
                if (prev) prev.style.display = 'none';
            });
        }

        loader.style.display = 'none';
        fetchQuestions();

    } catch (err) {
        loader.style.display = 'none';
        console.error("Hata:", err);
        alert("Soru eklenirken bir hata oluştu: " + err.message);
    }
});

// --- SORULARI TABLOYLA LİSTELE ---
async function fetchQuestions() {
    const tbody = document.getElementById('questionsTableBody');
    const totalCount = document.getElementById('totalQuestionsCount');

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Yükleniyor...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "questions"));
        globalQuestionsConfig = [];
        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">Henüz eklenmiş soru yok.</td></tr>';
            totalCount.innerText = "0";
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            data.id = doc.id;
            globalQuestionsConfig.push(data);

            const tr = document.createElement('tr');

            // Görsel rozeti (Var/Yok)
            const imgBadge = data.imageUrl ? `<span style="color:var(--orange); font-weight: bold;">[Görsel Var]</span>` : `<span style="color:#cbd5e1;">Yok</span>`;

            tr.innerHTML = `
                <td><span style="font-size: 12px; background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${data.kategori}</span></td>
                <td><div style="max-height: 40px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${data.soru}</div></td>
                <td>${imgBadge}</td>
                <td style="font-weight: bold; color: var(--navy);">${data.cevap}</td>
                <td style="text-align: right;">
                    <button class="btn-outline-small" style="margin-right:8px; padding:6px 12px; font-size:12px;" onclick="editQuestion('${data.id}')">Düzenle</button>
                    <button class="btn-delete" onclick="deleteQuestion('${data.id}')">Sil</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        totalCount.innerText = globalQuestionsConfig.length;

    } catch (error) {
        console.error("Sorular listelenemedi:", error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Veri çekilirken hata oluştu.</td></tr>';
    }
}

// --- SORU DÜZENLEME (EDİT) --- 
window.editQuestion = function (docId) {
    const question = globalQuestionsConfig.find(q => q.id === docId);
    if (!question) return;

    document.getElementById('addQuestionForm').setAttribute('data-edit-id', docId);
    document.getElementById('soruFormTitle').innerText = "Soruyu Düzenle";
    document.getElementById('saveQuestionBtn').innerText = "Değişiklikleri Kaydet";
    document.getElementById('cancelQuestionBtn').style.display = "inline-block";

    document.getElementById('kategori').value = question.kategori;
    document.getElementById('cevap').value = question.cevap;
    document.getElementById('soru').value = question.soru;

    // Ana resim önizleme
    if (question.imageUrl) {
        document.getElementById('mainImagePreview').src = question.imageUrl;
        document.getElementById('mainImagePreview').style.display = 'block';
    } else {
        document.getElementById('mainImagePreview').src = "";
        document.getElementById('mainImagePreview').style.display = 'none';
    }

    // Şıkları doldur
    const opts = ['textA', 'textB', 'textC', 'textD'];
    const prevs = ['previewA', 'previewB', 'previewC', 'previewD'];

    for (let i = 0; i < 4; i++) {
        document.getElementById(opts[i]).value = '';
        document.getElementById(prevs[i]).src = '';
        document.getElementById(prevs[i]).style.display = 'none';

        if (question.secenekler && question.secenekler[i]) {
            const val = question.secenekler[i].split(") ")[1];
            if (val && val.startsWith('http')) {
                document.getElementById(prevs[i]).src = val;
                document.getElementById(prevs[i]).style.display = 'block';
            } else {
                document.getElementById(opts[i]).value = val || '';
            }
        }
    }

    // Sayfayı kaydır
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- DÜZENLEMEYİ İPTAL ET ---
window.cancelEditQuestion = function () {
    document.getElementById('addQuestionForm').removeAttribute('data-edit-id');
    document.getElementById('addQuestionForm').reset();
    document.getElementById('soruFormTitle').innerText = "Yeni Soru Ekle";
    document.getElementById('saveQuestionBtn').innerText = "Soruyu Firebase'e Kaydet";
    document.getElementById('cancelQuestionBtn').style.display = "none";

    fileInputs.forEach(item => {
        const prev = document.getElementById(item.preview);
        if (prev) { prev.style.display = 'none'; prev.src = ''; }
    });
};

// --- SORU VE BAĞLI GÖRSELLERİ SİLME (TAM TEMİZLİK) ---
window.deleteQuestion = async function (docId) {
    if (!confirm("Kritik İşlem: Bu soruyu ve Storage'da barındırdığı tüm resimleri kalıcı olarak silmek istediğinize emin misiniz?")) return;

    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    loader.style.display = 'flex';
    loaderText.innerText = 'Soru ve resimler temizleniyor...';

    try {
        // 1. Dokümanı yerel diziden bul
        const questionObj = globalQuestionsConfig.find(q => q.id === docId);

        if (questionObj) {
            // Ana resmi sil
            if (questionObj.imageUrl && questionObj.imageUrl.includes('firebase')) {
                await deleteStorageFileByUrl(questionObj.imageUrl);
            }

            // Şıklardaki resimleri sil
            if (questionObj.hasImageOptions && questionObj.secenekler) {
                for (let secenek of questionObj.secenekler) {
                    const parts = secenek.split(") ");
                    if (parts.length === 2 && parts[1].startsWith('http')) {
                        await deleteStorageFileByUrl(parts[1]);
                    }
                }
            }
        }

        // 2. Firestore kaydını sil
        await deleteDoc(doc(db, "questions", docId));

        loader.style.display = 'none';
        showToast("Soru ve tüm resimleri kalıcı olarak silindi. 🗑️");

        // Tabloyu tazele
        fetchQuestions();

    } catch (error) {
        loader.style.display = 'none';
        console.error("Silme hatası:", error);
        alert("Soru silinemedi. Hata: " + error.message);
    }
};

// Storage URL'sinden dosyayı bulup silen yardımcı fonksiyon
async function deleteStorageFileByUrl(url) {
    try {
        // Firebase Storage Download URL'lerini referansa çevirmek için:
        // 'refFromURL' 10.8 API'sinde farklı kullanılabilir, biz doğrudan getStorage().refFromURL (veya URL ayrıştırma) kullanmalıyız. 
        // Ancak en garantilisi ref(storage, url) direkt olarak url beslemeye izin verir.
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
        console.log("Storage dosyası silindi:", url);
    } catch (err) {
        // Eğer dosya zaten silinmişse 404 verecektir, bu bir hata değildir bypass et.
        if (err.code === 'storage/object-not-found') {
            console.log("Dosya zaten Storage'da yok:", url);
        } else {
            console.error("Storage silme hatası url: " + url, err);
        }
    }
}

// --- YARDIMCI / TOAST ---
function showToast(message) {
    const t = document.getElementById("toast");
    t.innerText = message;
    t.className = "show";
    setTimeout(function () { t.className = t.className.replace("show", ""); }, 3000);
}

// ==== HATA BİLDİRİMLERİ (REPORTS) YÖNETİMİ ====

// Tab Değiştirme Fonksiyonu
window.switchAdminTab = function (tabName) {
    const qSec = document.getElementById('questionsSection');
    const rSec = document.getElementById('reportsSection');
    const rehberSec = document.getElementById('rehberSection');
    const formSec = document.querySelector('.admin-card:nth-of-type(1)');

    // Tüm tab butonlarını sıfırla
    ['tab-questions', 'tab-reports', 'tab-rehber'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.background = 'transparent'; el.style.color = 'var(--navy)'; }
    });

    // Tüm section'ları gizle
    [qSec, rSec, rehberSec].forEach(s => { if (s) s.style.display = 'none'; });
    if (formSec) formSec.style.display = 'none';

    if (tabName === 'questions') {
        if (qSec) qSec.style.display = 'block';
        if (formSec) formSec.style.display = 'block';
        document.getElementById('tab-questions').style.background = 'var(--navy)';
        document.getElementById('tab-questions').style.color = 'white';
        fetchQuestions();
    } else if (tabName === 'reports') {
        if (rSec) rSec.style.display = 'block';
        const btn = document.getElementById('tab-reports');
        if (btn) { btn.style.background = 'var(--orange)'; btn.style.color = 'white'; }
        loadReports();
    } else if (tabName === 'rehber') {
        if (rehberSec) rehberSec.style.display = 'block';
        const btn = document.getElementById('tab-rehber');
        if (btn) { btn.style.background = '#10b981'; btn.style.color = 'white'; }
        loadRehberPosts();
    }
}

// Raporları Firebase'den Çek
async function loadReports() {
    const tbody = document.getElementById('reportsTableBody');
    const countEl = document.getElementById('totalReportsCount');

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Yükleniyor...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "reports"));
        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">Henüz hata bildirimi yok. Harika!</td></tr>';
            countEl.innerText = "0";
            return;
        }

        let reportCount = 0;
        // Firebase Timestamp'e göre en yeniler en üste gelsin diye diziye atalım
        let reportsArray = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            reportsArray.push(data);
        });

        // Yeniden eskiye sırala
        reportsArray.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.seconds - a.createdAt.seconds;
        });

        reportsArray.forEach(data => {
            reportCount++;
            const tr = document.createElement('tr');

            // Tarih formatı
            let dateStr = "Tarih Yok";
            if (data.createdAt && data.createdAt.seconds) {
                const date = new Date(data.createdAt.seconds * 1000);
                dateStr = date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            }

            // Eğer not yoksa "Belirtilmemiş" yazalım
            const noteText = data.userNote ? data.userNote : '<span style="color:#cbd5e1; font-style:italic;">Belirtilmemiş</span>';

            tr.innerHTML = `
                <td><span style="font-size: 13px; color: #64748b;">${dateStr}</span></td>
                <td><strong>${data.userEmail}</strong></td>
                <td><span style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${data.errorType}</span></td>
                <td>
                    <div style="font-size: 13px; margin-bottom: 5px;">${noteText}</div>
                    <div style="font-size: 11px; color: #94a3b8; font-family: monospace;">Soru ID: ${data.questionId}</div>
                </td>
                <td style="text-align: right;">
                    <button class="btn-delete" onclick="deleteReport('${data.id}')" title="Raporu Sil/Çözüldü İşaretle">🗑️ Gizle</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        countEl.innerText = reportCount;

    } catch (err) {
        console.error("Raporlar çekilirken hata:", err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Veri çekilirken hata oluştu.</td></tr>';
    }
}

// Rapor Silme Fonksiyonu
window.deleteReport = async function (reportId) {
    if (!confirm("Bu hata bildirimini silmek (veya çözüldü olarak işaretlemek) istediğinize emin misiniz?")) return;

    try {
        await deleteDoc(doc(db, "reports", reportId));
        showToast("Bildirim başarıyla silindi. ✔️");
        loadReports();
    } catch (err) {
        console.error("Rapor silinirken hata:", err);
        alert("Bildirim silinemedi: " + err.message);
    }
}

// ================================================================
// BİLGİ MERKEZİ (REHBER) YÖNETİMİ
// ================================================================

// Rehber yazılarını listele
async function loadRehberPosts() {
    const tbody = document.getElementById('rehberTableBody');
    const countEl = document.getElementById('totalRehberCount');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Yükleniyor...</td></tr>';

    try {
        const q = query(collection(db, "rehber"), orderBy("yayinTarihi", "desc"));
        const snapshot = await getDocs(q);
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#64748b;">Henüz rehber yazısı yok.</td></tr>';
            if (countEl) countEl.innerText = '0';
            return;
        }

        let count = 0;
        snapshot.forEach(d => {
            count++;
            const data = d.data();
            const dateStr = data.yayinTarihi?.toDate
                ? data.yayinTarihi.toDate().toLocaleDateString('tr-TR')
                : '—';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-size:12px;background:#e2e8f0;padding:4px 8px;border-radius:4px;">${data.kategori || '—'}</span></td>
                <td style="font-weight:600;color:var(--navy);">${data.baslik}</td>
                <td style="font-size:13px;color:#64748b;">${dateStr}</td>
                <td style="text-align:right;">
                    <a href="rehber-detay.html?slug=${data.slug}" target="_blank" style="margin-right:8px;font-size:12px;color:var(--navy);">Görüntüle</a>
                    <button class="btn-outline-small" style="margin-right:8px; padding:6px 12px; font-size:12px;" onclick="editRehberPost('${d.id}')">Düzenle</button>
                    <button class="btn-delete" onclick="deleteRehberPost('${d.id}')">Sil</button>
                </td>`;
            tbody.appendChild(tr);
        });
        if (countEl) countEl.innerText = count;

    } catch (err) {
        console.error('Rehber listesi hatası:', err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Veri çekilirken hata oluştu.</td></tr>';
    }
}

// Yeni rehber yazısı ekle
window.saveRehberPost = async function () {
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');

    const baslik = document.getElementById('rehberBaslik')?.value?.trim();
    const kisaOz = document.getElementById('rehberKisaOz')?.value?.trim();
    const tamMetin = document.getElementById('rehberTamMetin')?.value?.trim();
    const kategori = document.getElementById('rehberKategori')?.value;
    const gorselUrl = document.getElementById('rehberGorselUrl')?.value?.trim();
    const slugRaw = document.getElementById('rehberSlug')?.value?.trim();

    if (!baslik || !kisaOz || !tamMetin || !slugRaw) {
        alert('Başlık, kısa özet, tam metin ve slug alanları zorunludur.');
        return;
    }

    const slug = slugRaw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Düzenleme Modu Kontrolü
    const editId = document.getElementById('rehberFormWrapper').getAttribute('data-edit-id');

    loader.style.display = 'flex';
    loaderText.innerText = 'Rehber yazısı kaydediliyor...';

    try {
        const postData = {
            baslik, kisaOz, tamMetin, kategori, gorselUrl, slug
        };

        if (editId) {
            // Güncelleme yap
            await updateDoc(doc(db, 'rehber', editId), postData);
            showToast('Rehber yazısı başarıyla güncellendi! ✅');
            window.cancelEditRehber();
        } else {
            // Yeni Ekleme
            postData.yayinTarihi = serverTimestamp();
            await addDoc(collection(db, 'rehber'), postData);
            showToast('Rehber yazısı başarıyla eklendi! 🎉');
            // Formu temizle
            ['rehberBaslik', 'rehberKisaOz', 'rehberTamMetin', 'rehberGorselUrl', 'rehberSlug']
                .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        }

        loader.style.display = 'none';
        loadRehberPosts();
    } catch (err) {
        loader.style.display = 'none';
        console.error('Rehber kayıt hatası:', err);
        alert('Rehber yazısı kaydedilemedi: ' + err.message);
    }
};

// --- REHBER YAZISI DÜZENLEME (EDİT) ---
window.editRehberPost = async function (docId) {
    const loader = document.getElementById('loader');
    loader.style.display = 'flex';

    try {
        const docRef = doc(db, 'rehber', docId);
        const docSnap = await getDocs(query(collection(db, 'rehber')));
        let targetDoc = null;

        docSnap.forEach(d => {
            if (d.id === docId) targetDoc = d.data();
        });

        if (targetDoc) {
            document.getElementById('rehberFormWrapper').setAttribute('data-edit-id', docId);
            document.getElementById('rehberFormTitle').innerText = "📰 Yazıyı Düzenle";
            document.getElementById('saveRehberBtn').innerText = "Değişiklikleri İleti Güncelle";
            document.getElementById('cancelRehberBtn').style.display = "inline-block";

            document.getElementById('rehberKategori').value = targetDoc.kategori || "Mevzuat";
            document.getElementById('rehberSlug').value = targetDoc.slug || "";
            document.getElementById('rehberBaslik').value = targetDoc.baslik || "";
            document.getElementById('rehberKisaOz').value = targetDoc.kisaOz || "";
            document.getElementById('rehberTamMetin').value = targetDoc.tamMetin || "";
            document.getElementById('rehberGorselUrl').value = targetDoc.gorselUrl || "";

            // Sayfayı formun mntıkalarına kaydır
            document.getElementById('rehberSection').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        console.error("Düzenleme için veri çekilemedi:", err);
    }
    loader.style.display = 'none';
};

// --- REHBER DÜZENLEMEYİ İPTAL ET ---
window.cancelEditRehber = function () {
    document.getElementById('rehberFormWrapper').removeAttribute('data-edit-id');
    ['rehberBaslik', 'rehberKisaOz', 'rehberTamMetin', 'rehberGorselUrl', 'rehberSlug']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    document.getElementById('rehberFormTitle').innerText = "📰 Yeni Bilgi Merkezi Yazısı Ekle";
    document.getElementById('saveRehberBtn').innerText = "📰 Yazıyı Firebase'e Kaydet";
    document.getElementById('cancelRehberBtn').style.display = "none";
};


// Rehber yazısı sil
window.deleteRehberPost = async function (docId) {
    if (!confirm('Bu rehber yazısını kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
        await deleteDoc(doc(db, 'rehber', docId));
        showToast('Rehber yazısı silindi. 🗑️');
        loadRehberPosts();
    } catch (err) {
        console.error('Rehber silme hatası:', err);
        alert('Silme işlemi başarısız: ' + err.message);
    }
};
