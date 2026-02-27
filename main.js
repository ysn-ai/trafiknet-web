/* --- TRAFİKNET AKILLI SINAV MOTORU (FULL VERSİYON) --- */
window.currentUserRole = 'guest';



let activeQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let wrongCount = 0;
let currentKategori = null; // Mevcut kategoriyi hafızada tutmak için

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('quiz-screen')) {
        // URL'den kategori parametresini kontrol et
        const urlParams = new URLSearchParams(window.location.search);
        const kat = urlParams.get('kategori');
        startNewQuiz(kat);
    }
});

import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Sınavı başlatırken opsiyonel kategori filtresi ile rastgele 10-50 soru seç
window.startNewQuiz = async function (secilenKategori = null) {
    const modeSel = document.getElementById('mode-selection');
    const quizScr = document.getElementById('quiz-screen');
    const loadingEl = document.getElementById('loading-spinner'); // Gösterge varsa ekleyebiliriz

    if (modeSel) modeSel.style.display = 'none';
    if (quizScr) quizScr.style.display = 'none';

    // UI'da ufak bir yükleniyor durumu gösterebiliriz (basitçe testin içine yazarak)
    const questionTextEl = document.getElementById('question-text');
    if (questionTextEl) questionTextEl.innerText = "Sorular buluttan getiriliyor... Lütfen bekleyin.";
    if (quizScr) quizScr.style.display = 'block';

    currentKategori = secilenKategori;
    let fetchedQuestions = [];

    try {
        const qRef = collection(window.db, "questions");
        let qQuery = qRef;

        // Eğer kategori varsa filtrele
        if (secilenKategori && secilenKategori !== 'Karışık' && secilenKategori !== 'all') {
            qQuery = query(qRef, where("kategori", "==", secilenKategori));
        }

        const querySnapshot = await getDocs(qQuery);
        querySnapshot.forEach((doc) => {
            fetchedQuestions.push(doc.data());
        });

        if (fetchedQuestions.length === 0) {
            questionTextEl.innerText = "Bu kategoriye ait soru bulunamadı!";
            return;
        }

        // Filtrelenmiş veya tüm diziyi karıştır
        let shuffled = [...fetchedQuestions].sort(() => 0.5 - Math.random());

        // Kapasite limiti ayarı
        let limit = 50;
        if (window.currentUserRole === 'guest') {
            limit = 15;
            alert('Misafir kullanıcı olduğunuz için sınav 15 soru ile sınırlandırılmıştır.\nTam deneme için sağ üstten giriş yapabilirsiniz.');
        }

        activeQuestions = shuffled.slice(0, limit);
        currentQuestionIndex = 0;
        score = 0;
        correctCount = 0;
        wrongCount = 0;

        document.getElementById('question-counter').innerText = `Soru ${currentQuestionIndex + 1} / ${activeQuestions.length}`;
        loadQuestion();
        // startTimer(); // Timer fonksiyonu yok, eklenmedi.

    } catch (error) {
        console.error("Firestore'dan soru çekerken hata yaşandı:", error);
        questionTextEl.innerText = "Sunucuya bağlanılamadı. Lütfen internetinizi kontrol edin.";
    }
}

function loadQuestion() {
    const q = activeQuestions[currentQuestionIndex];
    if (!q) return;

    document.getElementById('next-btn').style.display = 'none';

    // Soru Başlığı ve İlerleyiş
    document.getElementById('question-counter').innerText = `Soru ${currentQuestionIndex + 1} / ${activeQuestions.length}`;

    // Soru Metni ve Resmi 
    let textHTML = `<h3>${q.soru}</h3>`;
    if (q.imageUrl && q.imageUrl !== null && q.imageUrl !== "") {
        textHTML = `<div style="text-align:center;"><img src="${q.imageUrl}" alt="Soru Görseli" class="question-image" style="max-height: 250px; max-width: 100%; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>` + textHTML;
    }
    document.getElementById('question-text').innerHTML = textHTML;

    // Şıkların Oluşturulması
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    q.secenekler.forEach((secenek) => {
        const button = document.createElement('button');
        button.classList.add('option-btn');

        // A) resimler/images/... => HTTP URL algılaması
        let btnHTML = secenek;
        let parts = secenek.split(") ");

        // Eğer HTTP bağlantısı içeriyorsa <img> etiketiyle sarmala
        if (parts.length === 2 && parts[1].startsWith('http')) {
            btnHTML = `<div style="font-weight: 800; color: var(--navy); margin-bottom: 5px;">${parts[0]})</div>
                        <div style="width: 100%; display: flex; align-items: center; justify-content: center;">
                           <img src="${parts[1]}" alt="Şık" class="option-image" style="max-width: 100%; max-height: 120px; border-radius: 6px;">
                        </div>`;
            button.style.textAlign = 'center';
            button.style.padding = '10px';
        }

        button.innerHTML = btnHTML;
        button.onclick = () => checkAnswer(button, secenek, q.cevap);
        optionsContainer.appendChild(button);
    });

    // Görselli şıklarda Grid (Izgara) sistemini devreye sok
    if (q.hasImageOptions) {
        optionsContainer.style.display = 'grid';
        optionsContainer.style.gridTemplateColumns = '1fr 1fr';
        optionsContainer.style.gap = '15px';
    } else {
        optionsContainer.style.display = 'flex';
        optionsContainer.style.flexDirection = 'column';
    }

    const progressPercentage = ((currentQuestionIndex) / activeQuestions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progressPercentage}%`;
}

function checkAnswer(clickedButton, secilenMetin, dogruCevapHarfi) {
    const optionsContainer = document.getElementById('options-container');
    const allButtons = Array.from(optionsContainer.children);

    // Düğmeleri etkisizleştir
    allButtons.forEach(btn => btn.disabled = true);

    // Tıklanan metinden kullanıcının seçtiği harfi ayıkla (Örn: "A) HTTP..." -> "A")
    const secilenHarf = secilenMetin.split(')')[0].trim();
    const isCorrect = (secilenHarf === dogruCevapHarfi);

    // Renklendirme Ataması
    allButtons.forEach(btn => {
        // Bu butonun temsil ettiği şıkkı bulalım (Örn: A, B, C, D)
        const btnHarfHTML = btn.innerHTML.match(/([A-D])\)/);
        const thisBtnHarf = btnHarfHTML ? btnHarfHTML[1] : btn.innerText.split(')')[0].trim();

        if (thisBtnHarf === dogruCevapHarfi) {
            btn.classList.add('correct');
        }
    });

    if (isCorrect) {
        score += 10;
        correctCount++;
        document.getElementById('score-display').innerText = `Puan: ${score}`;
    } else {
        wrongCount++;
        clickedButton.classList.add('wrong');
    }

    document.getElementById('next-btn').style.display = 'block';
}

window.nextQuestion = function () {
    // Misafir Kısıtlaması (15 soruyu tamamlayıp 16. soruya geçerken durdurur: index == 14)
    if (window.currentUserRole === 'guest' && currentQuestionIndex === 14) {
        alert('Misafir sınırına ulaştınız! Sınava devam etmek ve detaylı analiz görmek için ücretsiz giriş yapın.');
        openModal();
        return;
    }

    currentQuestionIndex++;
    if (currentQuestionIndex < activeQuestions.length) {
        loadQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    document.getElementById('progress-fill').style.width = '100%';
    const totalAnswered = currentQuestionIndex + 1; // Limit takıldıysa toplam çözülen
    const maxScore = totalAnswered * 10;
    document.getElementById('final-score').innerText = `Toplam Puanınız: ${score} / ${maxScore}`;

    // Profil verilerini Firestore'a kaydet
    if (window.currentUserRole === 'user' && typeof window.saveExamResult === 'function') {
        window.saveExamResult(correctCount, totalAnswered);
    }
}

window.restartQuiz = function () {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'block';
    startNewQuiz(currentKategori); // Mevcut kategoriyle (varsa) yeniden başlat
}

// Modaller ve Kaydırma
window.scrollToElement = function (id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
window.openModal = function () {
    document.getElementById('loginModal').style.display = 'block';
    toggleAuth('login'); // Modal açıldığında varsayılan olarak Giriş Yap gelsin
}
window.closeModal = function () { document.getElementById('loginModal').style.display = 'none'; }

// Profil Modalı İşlemleri
let successChartInstance = null;

window.openProfileModal = function () {
    document.getElementById('profileModal').style.display = 'block';
    initProfileChart();
}

window.closeProfileModal = function () {
    document.getElementById('profileModal').style.display = 'none';
}


function initProfileChart() {
    const ctx = document.getElementById('successChart').getContext('2d');

    // Eğer chart zaten çizildiyse tekrar çizme (veya destroy edip yenile)
    if (successChartInstance) {
        successChartInstance.destroy();
    }

    successChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['İlk Yardım', 'Motor', 'Trafik', 'Adab'],
            datasets: [{
                label: 'Başarı Oranı (%)',
                data: [85, 60, 92, 75],
                backgroundColor: [
                    'rgba(26, 43, 72, 0.8)',   // navy
                    'rgba(255, 126, 33, 0.8)', // orange
                    'rgba(26, 43, 72, 0.8)',
                    'rgba(255, 126, 33, 0.8)'
                ],
                borderColor: [
                    '#1a2b48',
                    '#ff7e21',
                    '#1a2b48',
                    '#ff7e21'
                ],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

window.onclick = function (e) {
    const loginM = document.getElementById('loginModal');
    const profileM = document.getElementById('profileModal');
    if (e.target == loginM) loginM.style.display = 'none';
    if (e.target == profileM) profileM.style.display = 'none';
}

// Auth formları (Giriş/Kayıt/Şifremi Unuttum) arası geçiş
window.toggleAuth = function (view) {
    const loginForm = document.getElementById('loginFormContainer');
    const registerForm = document.getElementById('registerFormContainer');
    const resetForm = document.getElementById('forgotPasswordFormContainer');

    if (!loginForm || !registerForm || !resetForm) return;

    // Tümünü gizle
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    resetForm.style.display = 'none';

    if (view === 'register') {
        registerForm.style.display = 'block';
    } else if (view === 'forgotPassword') {
        resetForm.style.display = 'block';
    } else {
        loginForm.style.display = 'block';
    }
}

// Tam Sayfa Profil (SPA Mantığı)
window.openProfile = function () {
    const mainView = document.getElementById('mainView');
    const profileSection = document.getElementById('profileSection');
    const navReturnHome = document.getElementById('navReturnHome');

    if (mainView) mainView.style.display = 'none';
    if (profileSection) profileSection.style.display = 'block';
    if (navReturnHome) navReturnHome.style.display = 'block';

    // Grafiği çiz ve verileri çek
    initProfileChart();
    if (typeof window.fetchProfileStats === 'function') {
        window.fetchProfileStats();
    }
}

window.closeProfile = function () {
    const mainView = document.getElementById('mainView');
    const profileSection = document.getElementById('profileSection');
    const navReturnHome = document.getElementById('navReturnHome');

    if (mainView) mainView.style.display = 'block';
    if (profileSection) profileSection.style.display = 'none';
    if (navReturnHome) navReturnHome.style.display = 'none';
}


// --- Scroll Fade-in-up Animasyonları ---
document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // observer.unobserve(entry.target); // İstenirse bir kere çalışması için açılabilir
            }
        });
    }, {
        threshold: 0.15
    });

    const animateElements = document.querySelectorAll('.animate-on-scroll');
    animateElements.forEach(el => observer.observe(el));
});

// --- Akordeon (Ders Notları) Kontrolü ---
window.toggleAccordion = function (headerElement) {
    const item = headerElement.parentElement;

    // (Opsiyonel) Açık olan diğer sekmeleri kapatmak isterseniz:
    const allItems = document.querySelectorAll('.accordion-item');
    allItems.forEach(acc => {
        if (acc !== item && acc.classList.contains('active')) {
            acc.classList.remove('active');
        }
    });

    // Tıklanan sekmeyi aç/kapat
    item.classList.toggle('active');
};