/* --- TRAFİKNET AKILLI SINAV MOTORU (FULL VERSİYON) --- */

// --- TEMA ÖN YÜKLEME ---
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
}

window.currentUserRole = 'guest';

// --- KARANLIK MOD (DARK MODE) MANTIĞI ---
window.toggleDarkMode = function () {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

let activeQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let wrongCount = 0;
let currentKategori = null; // Mevcut kategoriyi hafızada tutmak için

// MOCK EXAM STATE
let isMockExam = false;
let userAnswers = []; // [index] -> secilenHarf (örn: "A", "B")
let examTimerInterval = null;
let timeRemaining = 45 * 60;

function startExamTimer() {
    timeRemaining = 45 * 60;
    const timerEl = document.getElementById('exam-timer');
    if (timerEl) timerEl.style.display = 'inline-block';

    clearInterval(examTimerInterval);
    examTimerInterval = setInterval(() => {
        timeRemaining--;
        let m = Math.floor(timeRemaining / 60);
        let s = timeRemaining % 60;
        if (timerEl) timerEl.innerText = `⏱ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        if (timeRemaining <= 0) {
            clearInterval(examTimerInterval);
            alert("Süre doldu! Sınavınız otomatik olarak bitiriliyor.");
            window.finishExam();
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('quiz-screen')) {
        // URL'den kategori parametresini kontrol et
        const urlParams = new URLSearchParams(window.location.search);
        const kat = urlParams.get('kategori');

        if (kat === 'mock') {
            window.showPreExamScreen();
        } else if (kat) {
            startNewQuiz(kat);
        }
    }
});

import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.showPreExamScreen = function () {
    const modeSel = document.getElementById('mode-selection');
    if (modeSel) modeSel.style.display = 'none';

    // quiz-container içindeki her şeyi gizle
    const quizScr = document.getElementById('quiz-screen');
    if (quizScr) quizScr.style.display = 'none';

    document.getElementById('pre-exam-screen').style.display = 'block';
};

// Sınavı başlatırken opsiyonel kategori filtresi ile rastgele 10-50 soru seç
window.startNewQuiz = async function (secilenKategori = null) {
    const modeSel = document.getElementById('mode-selection');
    const preExamScr = document.getElementById('pre-exam-screen');
    const quizScr = document.getElementById('quiz-screen');

    if (modeSel) modeSel.style.display = 'none';
    if (preExamScr) preExamScr.style.display = 'none';

    // Mock Exam kontrolü
    if (secilenKategori === 'mock') {
        isMockExam = true;
        secilenKategori = null; // Karışık olacak
        startExamTimer();
    } else {
        isMockExam = false;
        const timerEl = document.getElementById('exam-timer');
        if (timerEl) timerEl.style.display = 'none';
    }

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

        // Fisher-Yates Shuffle Fonksiyonu
        const shuffleArray = (array) => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        if (isMockExam) {
            // Mock Exam = Karma (Trafik 23, İlk Yardım 12, Motor 9, Adap 6)
            const trafik = shuffleArray(fetchedQuestions.filter(q => q.kategori === 'Trafik ve Çevre Bilgisi')).slice(0, 23);
            const ilkYardim = shuffleArray(fetchedQuestions.filter(q => q.kategori === 'İlk Yardım Bilgisi')).slice(0, 12);
            const motor = shuffleArray(fetchedQuestions.filter(q => q.kategori === 'Araç Tekniği (Motor)')).slice(0, 9);
            const adabi = shuffleArray(fetchedQuestions.filter(q => q.kategori === 'Trafik Adabı')).slice(0, 6);

            // Hepsini birleştir ve en son sınav sıralaması için test boyunca karışık olması için bir kez daha karıştır
            activeQuestions = shuffleArray([...trafik, ...ilkYardim, ...motor, ...adabi]);
        } else {
            // Kategori Testi
            let shuffled = shuffleArray(fetchedQuestions);
            let limit = 50;
            if (secilenKategori === 'Trafik ve Çevre Bilgisi') limit = 23;
            else if (secilenKategori === 'İlk Yardım Bilgisi') limit = 12;
            else if (secilenKategori === 'Araç Tekniği (Motor)') limit = 9;
            else if (secilenKategori === 'Trafik Adabı') limit = 6;

            // Kategorisine göre limiti ayarla ve diziyi kes
            activeQuestions = shuffled.slice(0, limit);
        }

        // Misafir Kullanıcı Sınırı
        if (window.currentUserRole === 'guest') {
            activeQuestions = activeQuestions.slice(0, 15);
            alert('Misafir kullanıcı olduğunuz için sınav 15 soru ile sınırlandırılmıştır.\\nTam deneme için sağ üstten giriş yapabilirsiniz.');
        }
        currentQuestionIndex = 0;
        score = 0;
        correctCount = 0;
        wrongCount = 0;
        userAnswers = new Array(activeQuestions.length).fill(null);

        document.getElementById('question-counter').innerText = `Soru ${currentQuestionIndex + 1} / ${activeQuestions.length}`;

        if (isMockExam) {
            startExamTimer();
        } else {
            const timerEl = document.getElementById('exam-timer');
            if (timerEl) timerEl.style.display = 'none';
        }

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

    // Navigasyon tuşlarını güncelle
    updateNavigationButtons();

    // Soru Başlığı ve İlerleyiş
    if (!isMockExam) {
        document.getElementById('question-counter').innerText = `Soru ${currentQuestionIndex + 1} / ${activeQuestions.length}`;
    } else {
        document.getElementById('question-counter').innerText = `Soru ${currentQuestionIndex + 1} / ${activeQuestions.length}`;
        document.getElementById('score-display').style.display = 'none'; // Skor gerçek zamanlı gösterilmez
    }

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

        // Eğer daha önce seçilmişse vurgula
        const btnHarfHTML = btnHTML.match(/([A-D])\)/);
        const thisBtnHarf = btnHarfHTML ? btnHarfHTML[1] : secenek.split(')')[0].trim();

        // Daha önce bu soruya cevap verildiyse (kullanıcı geri döndüyse)
        if (userAnswers[currentQuestionIndex]) {
            button.disabled = true; // Tüm şıkları kilitle, değiştirtme

            if (userAnswers[currentQuestionIndex] === thisBtnHarf) {
                if (isMockExam) {
                    button.classList.add('selected-option');
                } else {
                    // Practice modundaysa doğru/yanlış rengini de geri yükle
                    if (thisBtnHarf === q.cevap) {
                        button.classList.add('correct');
                    } else {
                        button.classList.add('wrong');
                    }
                }
            } else if (!isMockExam && thisBtnHarf === q.cevap) {
                // Practice modundaysa ve bu buton doğru cevapsa, diğer buton da yanlış seçilmişse, doğruyu da yeşil göster
                button.classList.add('correct');
            }
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

    // Daha önceden cevaplandıysa hiçbir işlem yapma (güvenlik)
    if (userAnswers[currentQuestionIndex]) return;

    const secilenHarf = secilenMetin.split(')')[0].trim();
    userAnswers[currentQuestionIndex] = secilenHarf;

    // Şıkları kilitle ki bir daha basamasın (Sadece bu soruyu, ilk seçimde)
    allButtons.forEach(btn => btn.disabled = true);

    if (isMockExam) {
        clickedButton.classList.add('selected-option');
        return;
    }

    // Practice Modu İse (Anında Renklendirme)
    allButtons.forEach(btn => {
        const btnHarfHTML = btn.innerHTML.match(/([A-D])\)/);
        const thisBtnHarf = btnHarfHTML ? btnHarfHTML[1] : btn.innerText.split(')')[0].trim();

        if (thisBtnHarf === dogruCevapHarfi) {
            btn.classList.add('correct');
        } else if (thisBtnHarf === secilenHarf && secilenHarf !== dogruCevapHarfi) {
            btn.classList.add('wrong');
        }
    });

    document.getElementById('next-btn').style.display = 'block';
}

function updateNavigationButtons() {
    const navDiv = document.getElementById('exam-navigation');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');

    navDiv.style.display = 'flex';
    navDiv.style.alignItems = 'center';
    navDiv.style.justifyContent = 'space-between';

    // Hatalı Soru Bildir Butonunu Dinamik Ekle (Eğer yoksa)
    let reportBtn = document.getElementById('btn-report-error');
    if (!reportBtn) {
        reportBtn = document.createElement('button');
        reportBtn.id = 'btn-report-error';
        reportBtn.className = 'btn-outline-small';
        reportBtn.innerHTML = '⚠️ Hata Bildir';
        reportBtn.style.borderColor = '#dc2626';
        reportBtn.style.color = '#dc2626';
        // En başa ekle
        navDiv.insertBefore(reportBtn, prevBtn);
    }

    // Her güncellendiğinde aktif sorunun ID'sini alması için onclick güncelle
    const activeQId = activeQuestions[currentQuestionIndex].id;
    reportBtn.onclick = () => window.openReportModal(activeQId);

    prevBtn.style.display = currentQuestionIndex > 0 ? 'block' : 'none';

    if (currentQuestionIndex === activeQuestions.length - 1) {
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        finishBtn.style.display = 'none';
    }
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
    } else if (!isMockExam) {
        window.finishExam();
    }
}

window.prevQuestion = function () {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

window.finishExam = function () {
    clearInterval(examTimerInterval);
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';

    // Her iki MOD için de aynı döngü ile puan/doğru/yanlış hesapla
    correctCount = 0;
    wrongCount = 0;
    let blankCount = 0;
    score = 0;

    // Gelişmiş İstatistikler (Konu Bazlı)
    let categoryStats = {
        'Trafik ve Çevre Bilgisi': { correct: 0, total: 0 },
        'İlk Yardım Bilgisi': { correct: 0, total: 0 },
        'Araç Tekniği (Motor)': { correct: 0, total: 0 },
        'Trafik Adabı': { correct: 0, total: 0 }
    };

    for (let i = 0; i < activeQuestions.length; i++) {
        const q = activeQuestions[i];
        const dogruCevap = q.cevap;
        const kullaniciCevabi = userAnswers[i];
        const cat = q.kategori;

        // Kategori istatistiği hazırla
        if (categoryStats[cat]) {
            categoryStats[cat].total++;
        }

        if (!kullaniciCevabi) {
            blankCount++;
        } else if (kullaniciCevabi === dogruCevap) {
            correctCount++;
            score += (100 / activeQuestions.length); // Dinamik puan

            if (categoryStats[cat]) {
                categoryStats[cat].correct++;
            }
        } else {
            wrongCount++;
        }
    }

    document.getElementById('res-correct').innerText = correctCount;
    document.getElementById('res-wrong').innerText = wrongCount;
    document.getElementById('res-blank').innerText = blankCount;
    document.getElementById('res-score').innerText = Math.round(score);

    const statusEl = document.getElementById('res-status');
    if (isMockExam) {
        if (score >= 70) {
            statusEl.innerText = "Tebrikler, Geçtiniz! 🎉";
            statusEl.style.backgroundColor = "#dcfce3";
            statusEl.style.color = "#16a34a";
        } else {
            statusEl.innerText = "Maalesef Kaldınız! 😔";
            statusEl.style.backgroundColor = "#fee2e2";
            statusEl.style.color = "#dc2626";
        }
    } else {
        statusEl.innerText = "Pratik Testi Tamamlandı!";
        statusEl.style.backgroundColor = "#f1f5f9";
        statusEl.style.color = "#64748b";
    }

    // Profil istatistiğini kaydetmeye çalış (auth.js içindeki window.saveExamResult)
    // Eğer deneme sınavıysa konu detaylarını da gönder
    if (window.saveExamResult && typeof window.saveExamResult === 'function') {
        if (isMockExam) {
            window.saveExamResult(correctCount, activeQuestions.length, categoryStats);
        } else {
            window.saveExamResult(correctCount, activeQuestions.length, null);
        }
    }
}

window.reviewMistakes = function () {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('review-screen').style.display = 'block';

    const container = document.getElementById('review-container');
    container.innerHTML = '';

    let hasMistakes = false;

    for (let i = 0; i < activeQuestions.length; i++) {
        const q = activeQuestions[i];
        const userAnswer = userAnswers[i];

        if (!userAnswer || userAnswer !== q.cevap) {
            hasMistakes = true;

            const div = document.createElement('div');
            div.style.background = 'white';
            div.style.padding = '20px';
            div.style.borderRadius = '12px';
            div.style.marginBottom = '20px';
            div.style.borderLeft = '4px solid #ef4444';
            div.style.boxShadow = 'var(--shadow-sm)';

            let optionsHtml = '';
            q.secenekler.forEach(opt => {
                const optHarfMatch = opt.match(/([A-D])\)/);
                const optHarf = optHarfMatch ? optHarfMatch[1] : opt.split(')')[0].trim();

                let colorAttr = 'color: #64748b;';
                let bgAttr = '';

                if (optHarf === q.cevap) { // Doğru olan yeşil
                    colorAttr = 'color: #16a34a; font-weight: bold;';
                    bgAttr = 'background: #dcfce3; padding: 5px; border-radius: 4px;';
                } else if (optHarf === userAnswer) { // Kullanıcının seçtiği yanlış kırmızı
                    colorAttr = 'color: #dc2626; text-decoration: line-through;';
                    bgAttr = 'background: #fee2e2; padding: 5px; border-radius: 4px;';
                }

                // Resim formatını kontrol et
                const parts = opt.split(") ");
                if (parts.length === 2 && parts[1].startsWith('http')) {
                    optionsHtml += `<div style="margin-bottom: 8px; ${bgAttr}"><span style="${colorAttr}">${parts[0]}) </span><img src="${parts[1]}" alt="Soru Şıkkı Görseli" style="max-height: 40px; vertical-align: middle;"></div>`;
                } else {
                    optionsHtml += `<div style="margin-bottom: 8px; ${bgAttr}"><span style="${colorAttr}">${opt}</span></div>`;
                }
            });

            let imgHtml = '';
            if (q.imageUrl) {
                imgHtml = `<div style="margin-bottom: 10px;"><img src="${q.imageUrl}" alt="Soru İllüstrasyonu" style="max-height: 150px; border-radius: 6px;"></div>`;
            }

            div.innerHTML = `
                <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">Soru ${i + 1}</div>
                <h4 style="color: var(--navy); margin-bottom: 15px;">${q.soru}</h4>
                ${imgHtml}
                <div style="margin-top: 15px;">${optionsHtml}</div>
            `;
            container.appendChild(div);
        }
    }

    if (!hasMistakes) {
        container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 30px;">Hiç yanlışınız yok veya işaretleme yapmadınız! Harika!</div>';
    }
}

window.showResultScreen = async function () {
    document.getElementById('review-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';

    // Tavsiye Edilen Rehber Yazılarını Yükle (Dwell Time SEO Algoritması)
    const recBox = document.getElementById('recommendedArticlesBox');
    const recList = document.getElementById('recommended-articles-list');
    if (recBox && recList) {
        try {
            // App.js'den db'yi al
            const { db } = await import('./app.js');
            const { collection, getDocs, query, limit, orderBy } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

            const qRef = query(collection(db, 'rehber_yazilari'), orderBy('yayinTarihi', 'desc'), limit(3));
            const snap = await getDocs(qRef);

            if (!snap.empty) {
                let htmlStr = '';
                snap.forEach(doc => {
                    const data = doc.data();
                    htmlStr += `
                    <a href="rehber-detay.html?slug=${data.slug}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: var(--navy); transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        <div style="flex: 1;">
                            <h4 style="font-size: 15px; margin-bottom: 4px; font-weight: 700;">${data.baslik}</h4>
                            <span style="font-size: 12px; color: white; background: var(--orange); padding: 2px 8px; border-radius: 12px;">${data.kategori || 'Bilgi'}</span>
                        </div>
                        <span style="color: var(--orange); font-size: 18px;">→</span>
                    </a>`;
                });
                recList.innerHTML = htmlStr;
                recBox.style.display = 'block';
            } else {
                recBox.style.display = 'none';
            }
        } catch (err) {
            console.error("Rehber yazıları yüklenirken hata:", err);
            recBox.style.display = 'none';
        }
    }
}

window.restartExam = function () {
    // Sınavı sıfırla ve yeniden başlat (mevcut kategoriyi ya da mock modunu kullanarak)
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('review-screen').style.display = 'none';

    // Tavsiye kutusunu da gizle (yeniden sınav esnasında)
    const recBox = document.getElementById('recommendedArticlesBox');
    if (recBox) recBox.style.display = 'none';

    // Geçen mod hangisiyse, ona göre tekrar çağır
    if (isMockExam) {
        startNewQuiz('mock');
    } else {
        startNewQuiz(currentKategori);
    }
}

// Modaller ve Kaydırma
window.scrollToElement = function (id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
window.openModal = function () {
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
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
    if (typeof closeMobileMenu === 'function') closeMobileMenu();
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

// ==== HATALI SORU BİLDİRİMİ EKRANI ====
import { addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.openReportModal = function (questionId) {
    document.getElementById('reportQuestionId').value = questionId;
    document.getElementById('reportErrorType').value = 'Yanlış Cevap';
    document.getElementById('reportUserNote').value = '';
    document.getElementById('reportSuccessMsg').style.display = 'none';
    document.getElementById('submitReportBtn').disabled = false;
    document.getElementById('submitReportBtn').innerText = 'Gönder';

    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

window.closeReportModal = function () {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

window.submitErrorReport = async function () {
    const qId = document.getElementById('reportQuestionId').value;
    const errType = document.getElementById('reportErrorType').value;
    const note = document.getElementById('reportUserNote').value.trim();
    const btn = document.getElementById('submitReportBtn');
    const msgBlock = document.getElementById('reportSuccessMsg');

    let userEmail = "Ziyaretçi";
    if (window.auth && window.auth.currentUser) {
        userEmail = window.auth.currentUser.email;
    }

    try {
        btn.disabled = true;
        btn.innerText = 'Gönderiliyor...';

        await addDoc(collection(window.db, "reports"), {
            questionId: qId,
            userEmail: userEmail,
            errorType: errType,
            userNote: note,
            status: 'Bekliyor', // Admin paneli için varsayılan durum
            createdAt: serverTimestamp()
        });

        msgBlock.style.display = 'block';
        btn.innerText = 'Gönderildi';

        // 2 saniye sonra modalı kapat
        setTimeout(() => {
            closeReportModal();
        }, 2000);

    } catch (err) {
        console.error("Hata bildirimi gönderilemedi:", err);
        alert("Bir hata oluştu, lütfen internet bağlantınızı kontrol edip tekrar deneyin.");
        btn.disabled = false;
        btn.innerText = 'Tekrar Dene';
    }
}