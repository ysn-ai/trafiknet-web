import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

        // 1. Ana Görseli Yükle
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
                // Eğer şıkta resim seçilmişse metni yok say ve URL olarak dön
                const optUrl = await uploadImageToStorage(file, 'options');
                // Format: "A) https://firebasestorage..." (Ana sınav motoruna uyumlu)
                finalSecenekler.push(`${el.id}) ${optUrl}`);
                hasImageOptions = true;
            } else {
                // Sadece metin varsa: "A) Şık metni..."
                finalSecenekler.push(`${el.id}) ${textValue || "Boş Şık"}`);
            }
        }

        // 3. Firestore'a Kaydet
        const questionData = {
            kategori: kategori,
            soru: soru,
            cevap: cevap,
            imageUrl: imageUrl,
            hasImageOptions: hasImageOptions,
            secenekler: finalSecenekler
        };

        await addDoc(collection(db, "questions"), questionData);

        // Formu temizle ve listeyi tazele
        document.getElementById('addQuestionForm').reset();
        fileInputs.forEach(item => {
            const prev = document.getElementById(item.preview);
            if (prev) prev.style.display = 'none';
        });

        loader.style.display = 'none';
        showToast("Soru başarıyla eklendi! 🎉");
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
