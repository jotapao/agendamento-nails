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

         // --- INITIALIZATION FUNCTION ---
        async function initialize() {
            try {
                app = initializeApp(firebaseConfig);
                auth = getAuth(app);
                db = getFirestore(app);
                setLogLevel('debug');
                
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        userId = user.uid;
                        const collectionPath = `artifacts/${appId}/users/${userId}/appointments`;
                        appointmentsCollection = collection(db, collectionPath);
                        userIdDisplay.textContent = userId;
                        userInfoDiv.classList.remove('hidden');
                        isAuthReady = true;
                        await listenForAppointments();
                    } else {
                        isAuthReady = false;
                        if(unsubscribeAppointments) unsubscribeAppointments();
                    }
                });

                if (initialAuthToken) { await signInWithCustomToken(auth, initialAuthToken); } 
                else { await signInAnonymously(auth); }

            } catch (error) {
                console.error("Firebase initialization failed:", error);
                loadingState.textContent = 'Erro ao conectar com o banco de dados.';
            }
        }

        // --- DATA HANDLING FUNCTIONS ---

        async function listenForAppointments() {
            if (!isAuthReady || !appointmentsCollection) return;
            loadingState.classList.remove('hidden');
            emptyState.classList.add('hidden');
            
            const q = query(appointmentsCollection, orderBy("dateTime", "desc"));
            unsubscribeAppointments = onSnapshot(q, (snapshot) => {
                loadingState.classList.add('hidden');
                
                allAppointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                populateMonthFilter();
                filterAndRender();

            }, (error) => {
                console.error("Error fetching appointments: ", error);
                loadingState.textContent = "Erro ao carregar os dados.";
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!isAuthReady) return;

            const clientName = document.getElementById('client-name').value.trim();
            const service = document.getElementById('service').value.trim();
            const rawValue = valueInput.value;
            const dateTime = document.getElementById('date-time').value;
            const value = parseFloat(rawValue.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());

            if (clientName && service && !isNaN(value) && dateTime) {
                try {
                    await addDoc(appointmentsCollection, { clientName, service, value, dateTime, isPaid: false, createdAt: new Date() });
                    form.reset();
                    valueInput.value = '';
                } catch (error) {
                    console.error("Error adding document: ", error);
                }
            }
        });

        async function markAsPaid(id) {
            if (!isAuthReady) return;
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/appointments`, id);
            try {
                await updateDoc(docRef, { isPaid: true });
            } catch (error) { console.error("Error updating document: ", error); }
        }

        async function deleteAppointment(id) {
            if (!isAuthReady || !id) return;
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/appointments`, id);
            try {
                await deleteDoc(docRef);
            } catch (error) { console.error("Error deleting document: ", error); }
        }


