import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendEmailVerification, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, increment, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
        if (welcomeText) {
            const displayName = user.displayName || user.email.split('@')[0];
            welcomeText.textContent = `Merhaba, ${displayName} 👋`;
        }

        // Akıllı Alt Bilgi: Ücretsiz Kayıt Ol bölümünü gizle
        const pricingSection = document.getElementById('pricing');
        if (pricingSection) pricingSection.style.display = 'none';

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

window.saveExamResult = async function (correctInc, totalInExam) {
    if (!window.auth.currentUser) return;
    const uid = window.auth.currentUser.uid;
    const userRef = doc(window.db, "users", uid);

    try {
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            await setDoc(userRef, {
                solvedCount: totalInExam,
                correctCount: correctInc,
                completedExams: 1
            });
        } else {
            await updateDoc(userRef, {
                solvedCount: increment(totalInExam),
                correctCount: increment(correctInc),
                completedExams: increment(1)
            });
        }
    } catch (err) {
        console.error("Exam save error", err);
    }
};

window.fetchProfileStats = async function () {
    if (!window.auth.currentUser) return;
    const uid = window.auth.currentUser.uid;
    const userRef = doc(window.db, "users", uid);

    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const solved = data.solvedCount || 0;
            const correct = data.correctCount || 0;
            const exams = data.completedExams || 0;

            document.getElementById('solvedCount').innerText = solved;
            document.getElementById('completedExams').innerText = exams;

            const rate = solved > 0 ? Math.round((correct / solved) * 100) : 0;
            document.getElementById('successRate').innerText = `%${rate}`;

            if (window.successChartInstance) {
                window.successChartInstance.data.datasets[0].data = [rate, rate, rate, rate];
                window.successChartInstance.update();
            }
        }
    } catch (err) {
        console.error("Fetch stats error", err);
    }
};
