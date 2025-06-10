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


        
        // --- UI RENDERING & EVENT LISTENERS ---

        function filterAndRender() {
            let filteredAppointments = allAppointments;

            if (selectedFilter !== 'all') {
                filteredAppointments = allAppointments.filter(appt => {
                    const apptDate = new Date(appt.dateTime);
                    const apptMonthYear = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}`;
                    return apptMonthYear === selectedFilter;
                });
            }

            renderAppointments(filteredAppointments);
            updateSummary(filteredAppointments);
        }

        function populateMonthFilter() {
            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            const uniqueMonths = [...new Set(allAppointments.map(appt => {
                const date = new Date(appt.dateTime);
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }))];

             // Clear existing options but keep the "Todos"
            monthFilter.innerHTML = '<option value="all">Todos os Meses</option>';

            uniqueMonths.forEach(monthYear => {
                const [year, month] = monthYear.split('-');
                const option = document.createElement('option');
                option.value = monthYear;
                option.textContent = `${monthNames[parseInt(month) - 1]} de ${year}`;
                monthFilter.appendChild(option);
            });
            
            monthFilter.value = selectedFilter;
        }

        function renderAppointments(appointments) {
            appointmentsList.innerHTML = '';
            if (appointments.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
            }
            appointments.forEach(appt => {
                const card = createAppointmentCard(appt);
                appointmentsList.appendChild(card);
            });
        }

        function createAppointmentCard(appt) {
            const card = document.createElement('div');
            card.className = `card p-5 ${appt.isPaid ? 'paid-card' : 'unpaid-card'}`;
            const formattedDate = new Date(appt.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const formattedValue = appt.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            card.innerHTML = `
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div class="flex-1 mb-4 md:mb-0">
                        <p class="font-bold text-lg text-pink-700">${appt.clientName}</p>
                        <p class="text-gray-600">${appt.service}</p>
                        <div class="flex items-center text-sm text-gray-500 mt-2">
                            <i class="fas fa-calendar-alt mr-2"></i><span>${formattedDate}</span>
                            <span class="mx-2">|</span>
                            <i class="fas fa-money-bill-wave mr-2"></i><span>${formattedValue}</span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3 w-full md:w-auto">
                        ${!appt.isPaid ? `<button class="btn-secondary font-semibold py-2 px-4 rounded-lg flex-1 md:flex-none mark-paid-btn"><i class="fas fa-check mr-2"></i>Marcar Pago</button>` : `<span class="font-bold text-green-600 text-center flex-1"><i class="fas fa-check-circle mr-2"></i>Pago</span>`}
                        <button class="text-red-500 hover:text-red-700 py-2 px-4 rounded-lg delete-btn"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
            
            const markPaidBtn = card.querySelector('.mark-paid-btn');
            if (markPaidBtn) markPaidBtn.addEventListener('click', () => markAsPaid(appt.id));
            
            const deleteBtn = card.querySelector('.delete-btn');
            if (deleteBtn) deleteBtn.addEventListener('click', () => showDeleteModal(appt.id));
            
            return card;
        }

        function updateSummary(appointments) {
            const paidTotal = appointments.filter(a => a.isPaid).reduce((sum, a) => sum + a.value, 0);
            const unpaidTotal = appointments.filter(a => !a.isPaid).reduce((sum, a) => sum + a.value, 0);
            totalPaidEl.textContent = paidTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            totalUnpaidEl.textContent = unpaidTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        // --- INPUT FORMATTING ---
        valueInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value === '') { e.target.value = ''; return; }
            value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            e.target.value = 'R$ ' + value;
        });

        // --- FILTER EVENT LISTENER ---
        monthFilter.addEventListener('change', (e) => {
            selectedFilter = e.target.value;
            filterAndRender();
        });

         // --- DELETE MODAL LOGIC ---
        function showDeleteModal(id) {
            appointmentIdToDelete = id;
            deleteModal.classList.remove('hidden');
            setTimeout(() => {
                deleteModal.classList.remove('opacity-0');
                deleteModal.querySelector('.modal-container').classList.remove('scale-95');
            }, 10);
        }

        function hideDeleteModal() {
            deleteModal.querySelector('.modal-container').classList.add('scale-95');
            deleteModal.classList.add('opacity-0');
            setTimeout(() => {
                deleteModal.classList.add('hidden');
                appointmentIdToDelete = null;
            }, 300);
        }

        cancelDeleteBtn.addEventListener('click', hideDeleteModal);
        
        confirmDeleteBtn.addEventListener('click', async () => {
            if (appointmentIdToDelete) await deleteAppointment(appointmentIdToDelete);
            hideDeleteModal();
        });

         // --- START THE APP ---
        initialize();


