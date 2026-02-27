import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendEmailVerification, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, increment, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZHdbR7hGeeTZyPBzPOdjZBjxtZlH-KA0",
    authDomain: "trafiknet.firebaseapp.com",
    projectId: "trafiknet",
    storageBucket: "trafiknet.firebasestorage.app",
    messagingSenderId: "795808534933",
    appId: "1:795808534933:web:de1c0a7eec1293eb8ce69c"
};

const app = initializeApp(firebaseConfig);
window.auth = getAuth(app); // Global erişim için
window.db = getFirestore(app);

async function registerUser(email, password, fullName) {
    try {
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        await updateProfile(userCredential.user, { displayName: fullName });
        await sendEmailVerification(userCredential.user);
        alert('Kayıt başarılı! Lütfen e-posta adresinize gelen linke tıklayarak hesabınızı doğrulayın.');
        await signOut(window.auth);
        closeModal();
    } catch (error) {
        let msg = "Kayıt işlemi başarısız.";
        if (error.code === 'auth/email-already-in-use') msg = "Bu e-posta adresi zaten kullanımda.";
        else if (error.code === 'auth/weak-password') msg = "Şifre çok zayıf (En az 6 karakter olmalı).";
        else if (error.code === 'auth/invalid-email') msg = "Geçersiz e-posta adresi.";
        alert(msg);
    }
}

async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(window.auth, email, password);

        if (!userCredential.user.emailVerified) {
            alert('Lütfen önce e-posta adresinizi doğrulayın.');
            await signOut(window.auth);
            return;
        }

        alert('Giriş Başarılı');
        closeModal();
        if (typeof openProfile === 'function') openProfile(); // Giriş yapınca profile yönlendir
    } catch (error) {
        let msg = "Giriş işlemi başarısız.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = "Hatalı e-posta veya şifre girdiniz.";
        } else if (error.code === 'auth/invalid-email') {
            msg = "Geçersiz e-posta adresi.";
        }
        alert(msg);
    }
}

async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(window.auth, email);
        alert('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.');
        toggleAuth('login');
    } catch (error) {
        let msg = "İşlem başarısız.";
        if (error.code === 'auth/user-not-found') msg = "Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.";
        else if (error.code === 'auth/invalid-email') msg = "Geçersiz e-posta adresi.";
        alert(msg);
    }
}

async function logoutUser() {
    try {
        await signOut(window.auth);
        location.reload(); // Temiz bir sayfa için yenile
    } catch (error) {
        console.error("Çıkış yapılırken hata:", error);
    }
}

window.handleLogout = async function () {
    try {
        // Firebase Çıkış
        await signOut(window.auth);

        // Yerel Veri / State Temizliği
        if (window.statsUnsubscribe) { window.statsUnsubscribe(); }
        localStorage.clear();
        sessionStorage.clear();

        // Tüm UI'yi güvenli bir şekilde sıfırlamak için sayfayı yenile ve /index.html'e sabitle
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Çıkış işlemi başarısız oldu: ", error);
        alert("Çıkış yapılamadı. Lütfen tekrar deneyin.");
    }
};

onAuthStateChanged(window.auth, (user) => {
    const loginLink = document.querySelector('.nav-links a.btn-orange');

    if (user && user.emailVerified) {
        if (loginLink) {
            loginLink.textContent = 'Profilim 👤';
            loginLink.onclick = (e) => {
                e.preventDefault();
                openProfile();
            };
        }
        window.currentUserRole = 'user';

        // Profil sayfasındaki isim güncellemesi
        const welcomeText = document.getElementById('welcomeUserText');
        const avatarEl = document.querySelector('.profile-avatar');

        if (welcomeText) {
            const displayName = user.displayName || user.email.split('@')[0];
            welcomeText.textContent = `Merhaba, ${displayName} 👋`;
        }

        // Firestore'dan özel avatar çek
        getDoc(doc(window.db, "users", user.uid)).then(docSnap => {
            if (docSnap.exists() && docSnap.data().avatar) {
                if (avatarEl) avatarEl.textContent = docSnap.data().avatar;
            } else {
                if (avatarEl) avatarEl.textContent = '👤';
            }
        });

        // Admin Panel Butonu Yetki Kontrolü
        const adminBtn = document.getElementById('adminPanelBtn');
        if (adminBtn) {
            if (user.email === 'yasin1413@gmail.com') {
                adminBtn.style.display = 'block';
            } else {
                adminBtn.style.display = 'none';
            }
        }

        // Akıllı Alt Bilgi: Ücretsiz Kayıt Ol bölümünü gizle
        const pricingSection = document.getElementById('pricing');
        if (pricingSection) pricingSection.style.display = 'none';

        // İstatistikleri Dinle (Dashboard)
        if (typeof window.fetchProfileStats === 'function') {
            window.fetchProfileStats();
        }

    } else {
        if (loginLink) {
            loginLink.textContent = 'Giriş Yap';
            loginLink.onclick = (e) => {
                e.preventDefault();
                openModal();
            };
        }
        window.currentUserRole = 'guest';

        // Akıllı Alt Bilgi: Ücretsiz Kayıt Ol bölümünü göster
        const pricingSection = document.getElementById('pricing');
        if (pricingSection) pricingSection.style.display = 'block';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            if (!email || !password) {
                alert("Lütfen e-posta ve şifrenizi giriniz.");
                return;
            }
            loginUser(email, password);
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value.trim();
            const confirmPassword = document.getElementById('registerPasswordConfirm').value.trim();
            const fullName = document.getElementById('registerName').value.trim();

            if (!fullName || !email || !password || !confirmPassword) {
                alert("Lütfen tüm alanları doldurunuz.");
                return;
            }

            if (password !== confirmPassword) {
                alert("Şifreler eşleşmiyor!");
                return;
            }

            registerUser(email, password, fullName);
        });
    }

    if (resetPasswordBtn) {
        resetPasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value.trim();
            if (!email) {
                alert("Lütfen bir e-posta adresi giriniz.");
                return;
            }
            resetPassword(email);
        });
    }

    // Çıkış Yap Butonu Dinleyicisi
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.handleLogout) {
                window.handleLogout();
            } else {
                logoutUser();
            }
        });
    }
});

// --- FIRESTORE İSTATİSTİK FONKSİYONLARI ---

window.saveExamResult = async function (correctInc, totalInExam, categoryStats = null) {
    if (!window.auth.currentUser) return;
    const uid = window.auth.currentUser.uid;
    const userRef = doc(window.db, "users", uid);

    try {
        let updateData = {
            solvedCount: increment(totalInExam),
            correctCount: increment(correctInc),
            completedExams: increment(1)
        };

        // Eğer kategori datası geldiyse ekle
        if (categoryStats) {
            updateData['trafik_correct'] = increment(categoryStats['Trafik ve Çevre Bilgisi'].correct);
            updateData['trafik_total'] = increment(categoryStats['Trafik ve Çevre Bilgisi'].total);
            updateData['motor_correct'] = increment(categoryStats['Araç Tekniği (Motor)'].correct);
            updateData['motor_total'] = increment(categoryStats['Araç Tekniği (Motor)'].total);
            updateData['ilkyardim_correct'] = increment(categoryStats['İlk Yardım Bilgisi'].correct);
            updateData['ilkyardim_total'] = increment(categoryStats['İlk Yardım Bilgisi'].total);
            updateData['adap_correct'] = increment(categoryStats['Trafik Adabı'].correct);
            updateData['adap_total'] = increment(categoryStats['Trafik Adabı'].total);
        }

        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            // İlk kez döküman yaratılırsa increment yerine asıl datayı yolla
            let initialData = {
                solvedCount: totalInExam,
                correctCount: correctInc,
                completedExams: 1,
                trafik_correct: categoryStats ? categoryStats['Trafik ve Çevre Bilgisi'].correct : 0,
                trafik_total: categoryStats ? categoryStats['Trafik ve Çevre Bilgisi'].total : 0,
                motor_correct: categoryStats ? categoryStats['Araç Tekniği (Motor)'].correct : 0,
                motor_total: categoryStats ? categoryStats['Araç Tekniği (Motor)'].total : 0,
                ilkyardim_correct: categoryStats ? categoryStats['İlk Yardım Bilgisi'].correct : 0,
                ilkyardim_total: categoryStats ? categoryStats['İlk Yardım Bilgisi'].total : 0,
                adap_correct: categoryStats ? categoryStats['Trafik Adabı'].correct : 0,
                adap_total: categoryStats ? categoryStats['Trafik Adabı'].total : 0
            };
            await setDoc(userRef, initialData);
        } else {
            await updateDoc(userRef, updateData);
        }
    } catch (err) {
        console.error("Exam save error", err);
    }
};

window.statsUnsubscribe = null;

window.fetchProfileStats = function () {
    if (!window.auth.currentUser) return;
    const uid = window.auth.currentUser.uid;
    const userRef = doc(window.db, "users", uid);

    try {
        if (window.statsUnsubscribe) window.statsUnsubscribe();

        window.statsUnsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const solved = data.solvedCount || 0;
                const correct = data.correctCount || 0;
                const exams = data.completedExams || 0;

                const solvedCountEl = document.getElementById('solvedCount');
                if (solvedCountEl) solvedCountEl.innerText = solved;

                const completedExamsEl = document.getElementById('completedExams');
                if (completedExamsEl) completedExamsEl.innerText = exams;

                let rate = 0;
                if (solved > 0) {
                    rate = Math.round((correct / solved) * 100);
                }
                const successRateEl = document.getElementById('successRate');
                if (successRateEl) successRateEl.innerText = `%${rate}`;

                // --- Gelişmiş İstatistik Barları (Progress Bar UI) İçin Data Çek ---
                function getPerc(c, t) { return t > 0 ? Math.round((c / t) * 100) : 0; }
                const trafikP = getPerc(data.trafik_correct || 0, data.trafik_total || 0);
                const motorP = getPerc(data.motor_correct || 0, data.motor_total || 0);
                const ilkP = getPerc(data.ilkyardim_correct || 0, data.ilkyardim_total || 0);
                const adapP = getPerc(data.adap_correct || 0, data.adap_total || 0);

                if (document.getElementById('bar-trafik')) {
                    document.getElementById('bar-trafik').style.width = `${trafikP}%`;
                    document.getElementById('perc-trafik').innerText = `%${trafikP}`;
                }
                if (document.getElementById('bar-motor')) {
                    document.getElementById('bar-motor').style.width = `${motorP}%`;
                    document.getElementById('perc-motor').innerText = `%${motorP}`;
                }
                if (document.getElementById('bar-ilkyardim')) {
                    document.getElementById('bar-ilkyardim').style.width = `${ilkP}%`;
                    document.getElementById('perc-ilkyardim').innerText = `%${ilkP}`;
                }
                if (document.getElementById('bar-adap')) {
                    document.getElementById('bar-adap').style.width = `${adapP}%`;
                    document.getElementById('perc-adap').innerText = `%${adapP}`;
                }

                if (window.successChartInstance) {
                    window.successChartInstance.data.datasets[0].data = [trafikP, ilkP, motorP, adapP];
                    window.successChartInstance.update();
                }
            } else {
                // Doküman henüz yoksa, dashboard 0 kalsın
                if (document.getElementById('solvedCount')) document.getElementById('solvedCount').innerText = 0;
                if (document.getElementById('completedExams')) document.getElementById('completedExams').innerText = 0;
                if (document.getElementById('successRate')) document.getElementById('successRate').innerText = "%0";

                // Barları da Sıfırla
                ['trafik', 'motor', 'ilkyardim', 'adap'].forEach(t => {
                    if (document.getElementById(`bar-${t}`)) document.getElementById(`bar-${t}`).style.width = '0%';
                    if (document.getElementById(`perc-${t}`)) document.getElementById(`perc-${t}`).innerText = '%0';
                });
            }
        });
    } catch (err) {
        console.error("Fetch stats error", err);
    }
};

// ==== PROFİL AYARLARI MODAL İŞLEMLERİ ====
import { updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

window.openProfileSettingsModal = function () {
    const modal = document.getElementById('profileSettingsModal');
    if (modal) {
        const nameInput = document.getElementById('updateNameInput');
        if (window.auth && window.auth.currentUser) {
            nameInput.value = window.auth.currentUser.displayName || '';
        }

        // Firestore'dan mevcut avatarı seç
        const uid = window.auth.currentUser.uid;
        getDoc(doc(window.db, "users", uid)).then(docSnap => {
            let curAvatar = '👤';
            if (docSnap.exists() && docSnap.data().avatar) curAvatar = docSnap.data().avatar;

            document.getElementById('selectedAvatarInput').value = curAvatar;
            const allOptions = document.querySelectorAll('.avatar-option');
            allOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.style.borderColor = 'transparent';
                if (opt.textContent.trim() === curAvatar) {
                    opt.classList.add('selected');
                    opt.style.borderColor = 'var(--orange)';
                }
            });
        });

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

window.closeProfileSettingsModal = function () {
    const modal = document.getElementById('profileSettingsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.getElementById('updatePasswordInput').value = '';
        document.getElementById('settingsMessage').style.display = 'none';
    }
}

window.selectAvatar = function (element, avatarEmoji) {
    const allOptions = document.querySelectorAll('.avatar-option');
    allOptions.forEach(opt => {
        opt.classList.remove('selected');
        opt.style.borderColor = 'transparent';
    });

    element.classList.add('selected');
    element.style.borderColor = 'var(--orange)';
    document.getElementById('selectedAvatarInput').value = avatarEmoji;
}

window.saveProfileSettings = async function () {
    const user = window.auth.currentUser;
    if (!user) return;

    const newName = document.getElementById('updateNameInput').value.trim();
    const newPassword = document.getElementById('updatePasswordInput').value.trim();
    const newAvatar = document.getElementById('selectedAvatarInput').value;
    const msgEl = document.getElementById('settingsMessage');

    msgEl.style.display = 'block';
    msgEl.style.color = 'var(--navy)';
    msgEl.innerText = "Güncelleniyor...";

    try {
        // İsim Güncelleme
        if (newName && newName !== user.displayName) {
            await updateProfile(user, { displayName: newName });
            document.getElementById('welcomeUserText').textContent = `Merhaba, ${newName} 👋`;
        }

        // Firestore Avatar Güncelleme
        const userRef = doc(window.db, "users", user.uid);
        await setDoc(userRef, { avatar: newAvatar }, { merge: true });

        const avatarEl = document.querySelector('.profile-avatar');
        if (avatarEl) avatarEl.textContent = newAvatar;

        // Şifre Güncelleme (Geçerli oturum yeniyse çalışır)
        if (newPassword) {
            if (newPassword.length < 6) {
                msgEl.style.color = 'red';
                msgEl.innerText = "Şifre en az 6 karakter olmalıdır.";
                return;
            }
            await updatePassword(user, newPassword);
        }

        msgEl.style.color = 'green';
        msgEl.innerText = "Profil başarıyla güncellendi!";

        setTimeout(() => {
            closeProfileSettingsModal();
        }, 1500);

    } catch (err) {
        msgEl.style.color = 'red';
        if (err.code === 'auth/requires-recent-login') {
            msgEl.innerText = "Güvenlik nedeniyle şifre değiştirmek için çıkış yapıp tekrar giriş yapmalısınız.";
        } else {
            msgEl.innerText = "Bir hata oluştu: " + err.message;
        }
    }
}
