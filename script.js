        // Import Firebase modules
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, collection, addDoc, onSnapshot, updateDoc, deleteDoc, query, orderBy, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        
        // --- CONFIGURATION ---
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-nail-app';

         // --- GLOBAL STATE ---
        let app, auth, db, userId;
        let isAuthReady = false;
        let appointmentsCollection;
        let unsubscribeAppointments = null;
        let appointmentIdToDelete = null;
        let allAppointments = [];
        let selectedFilter = 'all';

         // --- DOM ELEMENTS ---

         const form = document.getElementById('add-appointment-form');
        const appointmentsList = document.getElementById('appointments-list');
        const loadingState = document.getElementById('loading-state');
        const emptyState = document.getElementById('empty-state');
        const totalPaidEl = document.getElementById('total-paid');
        const totalUnpaidEl = document.getElementById('total-unpaid');
        const userIdDisplay = document.getElementById('userIdDisplay');
        const userInfoDiv = document.getElementById('user-info');
        const valueInput = document.getElementById('value');
        const deleteModal = document.getElementById('delete-modal');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const monthFilter = document.getElementById('month-filter');

