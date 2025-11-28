import { auth, db } from './firebaseConfig.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Auth state listener
onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (user) {
        // User is signed in
        console.log('User signed in:', user.email);
        
        // Update UI with user info
        updateUserUI(user);
        
        // Redirect from auth pages to dashboard
        if (currentPage === 'login.html' || currentPage === 'signup.html' || currentPage === 'index.html') {
            window.location.href = 'dashboard.html';
        }
    } else {
        // User is signed out
        console.log('User signed out');
        
        // Redirect protected pages to login
        if (currentPage !== 'index.html' && currentPage !== 'login.html' && currentPage !== 'signup.html') {
            window.location.href = 'login.html';
        }
    }
});

// Update UI with user information
function updateUserUI(user) {
    const userNameElements = document.querySelectorAll('#userName, #userDisplayName');
    userNameElements.forEach(element => {
        if (element) {
            element.textContent = user.displayName || user.email.split('@')[0];
        }
    });
}

// Sign up function
export async function signupUser(email, password, fullName) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile with display name
        await updateProfile(user, {
            displayName: fullName
        });
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName: fullName,
            createdAt: new Date(),
            monthlyBudget: 0,
            currency: 'USD'
        });
        
        return { success: true, user };
    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
    }
}

// Login function
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// Logout function
export async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

// Event listeners for auth forms
document.addEventListener('DOMContentLoaded', function() {
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const signupBtn = document.getElementById('signupBtn');
            const errorDiv = document.getElementById('signupError');
            
            // Show loading state
            signupBtn.classList.add('btn-loading');
            errorDiv.style.display = 'none';
            
            const result = await signupUser(email, password, fullName);
            
            // Hide loading state
            signupBtn.classList.remove('btn-loading');
            
            if (result.success) {
                // Redirect will happen automatically due to auth state change
            } else {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
                errorDiv.classList.add('shake');
                setTimeout(() => errorDiv.classList.remove('shake'), 500);
            }
        });
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            const errorDiv = document.getElementById('loginError');
            
            // Show loading state
            loginBtn.classList.add('btn-loading');
            errorDiv.style.display = 'none';
            
            const result = await loginUser(email, password);
            
            // Hide loading state
            loginBtn.classList.remove('btn-loading');
            
            if (result.success) {
                // Redirect will happen automatically due to auth state change
            } else {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
                errorDiv.classList.add('shake');
                setTimeout(() => errorDiv.classList.remove('shake'), 500);
            }
        });
    }
    
    // Logout buttons
    const logoutButtons = document.querySelectorAll('#logoutBtn');
    logoutButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                await logoutUser();
            });
        }
    });
    
    // Password visibility toggle
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const passwordInput = this.parentElement.querySelector('input[type="password"], input[type="text"]');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
});
