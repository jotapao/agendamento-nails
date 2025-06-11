
        document.addEventListener('DOMContentLoaded', () => {
            // --- LOGIN ELEMENTS ---
            const loginPage = document.getElementById('login-page');
            const appPage = document.getElementById('app-page');
            const loginForm = document.getElementById('login-form');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const loginError = document.getElementById('login-error');

            // --- APP ELEMENTS ---
            let itemToDelete = null; 
            let allAppointments = [];
            let allExpenses = [];
            let currentFilterType = 'all';

            // Service Options
            const services = [
                "Unha em Gel",
                "Esmaltação em Gel",
                "Fibra",
                "Mão",
                "Pé",
                "Pé e Mão",
                "Alongamento",
                "Outro" // Permite flexibilidade
            ];

            // Appointments
            const addAppointmentForm = document.getElementById('add-appointment-form');
            const appointmentsList = document.getElementById('appointments-list');
            const emptyAppointmentsEl = document.getElementById('empty-appointments');
            const clientNameInput = document.getElementById('client-name');
            const serviceSelect = document.getElementById('service-select');
            const valueInput = document.getElementById('value');
            const dateTimeInput = document.getElementById('date-time');

            // Expenses
            const addExpenseForm = document.getElementById('add-expense-form');
            const expensesList = document.getElementById('expenses-list');
            const emptyExpensesEl = document.getElementById('empty-expenses');
            const expenseDescriptionInput = document.getElementById('expense-description');
            const expenseValueInput = document.getElementById('expense-value');
            const expenseDateInput = document.getElementById('expense-date');

            // Summary
            const netBalanceEl = document.getElementById('net-balance');
            const totalPaidEl = document.getElementById('total-paid');
            const totalUnpaidEl = document.getElementById('total-unpaid');
            const periodExpensesEl = document.getElementById('period-expenses');
            
            // Filters
            const filterButtons = document.querySelectorAll('.filter-btn');
            const filterInputs = document.getElementById('filter-inputs');
            const dayFilterInput = document.getElementById('day-filter-input');
            const weekFilterInput = document.getElementById('week-filter-input');
            const monthFilterInput = document.getElementById('month-filter-input');
            const periodFilterInput = document.getElementById('period-filter-input');
            const dayInput = document.getElementById('day-input');
            const weekInput = document.getElementById('week-input');
            const monthSelect = document.getElementById('month-select');
            const startDateInput = document.getElementById('start-date-input');
            const endDateInput = document.getElementById('end-date-input');

            // Common
            const deleteModal = document.getElementById('delete-modal');
            const deleteModalText = document.getElementById('delete-modal-text');
            const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
            const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
            
            // --- INITIALIZATION ---
            function populateServiceSelect() {
                serviceSelect.innerHTML = services.map(service => `<option value="${service}">${service}</option>`).join('');
            }

            // --- LOGIN LOGIC ---
            function showApp() {
                loginPage.classList.add('hidden');
                appPage.classList.remove('hidden');
                document.body.classList.remove('flex', 'items-center', 'justify-center', 'h-full');
                populateServiceSelect();
                loadInitialData();
            }

            function showLogin() {
                loginPage.classList.remove('hidden');
                appPage.classList.add('hidden');
                document.body.classList.add('flex', 'items-center', 'justify-center', 'h-full');
            }

            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = usernameInput.value;
                const password = passwordInput.value;
                if (username === 'Dry2510' && password === '2510Dry') {
                    sessionStorage.setItem('isLoggedIn', 'true');
                    loginError.classList.add('hidden');
                    showApp();
                } else {
                    loginError.classList.remove('hidden');
                    passwordInput.value = '';
                }
            });
            
            if (sessionStorage.getItem('isLoggedIn') === 'true') {
                showApp();
            } else {
                showLogin();
            }

            // --- DATA HANDLING ---
            const getFromStorage = (key) => JSON.parse(localStorage.getItem(key)) || [];
            const saveToStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));
            const getAppointments = () => getFromStorage('nailAppointments').sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
            const saveAppointments = (data) => saveToStorage('nailAppointments', data);
            const getExpenses = () => getFromStorage('nailExpenses').sort((a, b) => new Date(b.date) - new Date(a.date));
            const saveExpenses = (data) => saveToStorage('nailExpenses', data);
            
            function loadInitialData() {
                allAppointments = getAppointments();
                allExpenses = getExpenses();
                populateMonthFilter();
                filterAndRender();
            }

            // --- EVENT LISTENERS ---
            addAppointmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const value = parseFloat(valueInput.value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                if (clientNameInput.value && serviceSelect.value && !isNaN(value) && dateTimeInput.value) {
                    saveAppointments([{ id: crypto.randomUUID(), clientName: clientNameInput.value.trim(), service: serviceSelect.value, value, dateTime: dateTimeInput.value, isPaid: false, createdAt: new Date().toISOString() }, ...getAppointments()]);
                    addAppointmentForm.reset();
                    valueInput.value = '';
                    loadInitialData();
                }
            });

            addExpenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const value = parseFloat(expenseValueInput.value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                if(expenseDescriptionInput.value && !isNaN(value) && expenseDateInput.value) {
                    saveExpenses([{ id: crypto.randomUUID(), description: expenseDescriptionInput.value.trim(), value, date: expenseDateInput.value }, ...getExpenses()]);
                    addExpenseForm.reset();
                    expenseValueInput.value = '';
                    loadInitialData();
                }
            });

            // --- GENERIC ACTIONS ---
            function markAsPaid(id) {
                const appointments = getAppointments();
                const appointmentIndex = appointments.findIndex(a => a.id === id);
                if (appointmentIndex > -1) {
                    appointments[appointmentIndex].isPaid = true;
                    saveAppointments(appointments);
                    loadInitialData();
                }
            }

            function deleteItem(item) {
                if (item.type === 'appointment') saveAppointments(getAppointments().filter(a => a.id !== item.id));
                else if (item.type === 'expense') saveExpenses(getExpenses().filter(e => e.id !== item.id));
                loadInitialData();
            }
            
            // --- FILTERING LOGIC ---
            filterButtons.forEach(button => {
                button.addEventListener('click', () => {
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    currentFilterType = button.dataset.filter;
                    updateFilterInputsVisibility();
                    filterAndRender();
                });
            });

            [dayInput, weekInput, monthSelect, startDateInput, endDateInput].forEach(input => {
                input.addEventListener('change', filterAndRender);
            });

            function updateFilterInputsVisibility() {
                [dayFilterInput, weekFilterInput, monthFilterInput, periodFilterInput].forEach(el => el.classList.add('hidden'));
                if (currentFilterType === 'day') dayFilterInput.classList.remove('hidden');
                else if (currentFilterType === 'week') weekFilterInput.classList.remove('hidden');
                else if (currentFilterType === 'month') monthFilterInput.classList.remove('hidden');
                else if (currentFilterType === 'period') periodFilterInput.classList.remove('hidden');
            }

            function filterAndRender() {
                let filteredAppointments = allAppointments;
                let filteredExpenses = allExpenses;

                if (currentFilterType === 'day' && dayInput.value) {
                    filteredAppointments = allAppointments.filter(a => a.dateTime.startsWith(dayInput.value));
                    filteredExpenses = allExpenses.filter(e => e.date === dayInput.value);
                } else if (currentFilterType === 'week' && weekInput.value) {
                    const { start, end } = getWeekDateRange(weekInput.value);
                    filteredAppointments = allAppointments.filter(a => { const d = new Date(a.dateTime); return d >= start && d <= end; });
                    filteredExpenses = allExpenses.filter(e => { const d = new Date(e.date + "T00:00:00"); return d >= start && d <= end; });
                } else if (currentFilterType === 'month' && monthSelect.value !== 'all') {
                    filteredAppointments = allAppointments.filter(a => a.dateTime.startsWith(monthSelect.value));
                    filteredExpenses = allExpenses.filter(e => e.date.startsWith(monthSelect.value));
                } else if (currentFilterType === 'period' && startDateInput.value && endDateInput.value) {
                    const start = new Date(startDateInput.value + "T00:00:00");
                    const end = new Date(endDateInput.value + "T23:59:59");
                    filteredAppointments = allAppointments.filter(a => { const d = new Date(a.dateTime); return d >= start && d <= end; });
                    filteredExpenses = allExpenses.filter(e => { const d = new Date(e.date + "T00:00:00"); return d >= start && d <= end; });
                }

                renderAppointments(filteredAppointments);
                renderExpenses(filteredExpenses);
                updatePeriodSummary(filteredAppointments, filteredExpenses);
            }
            
            // --- UI RENDERING ---
            function populateMonthFilter() {
                const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                const appointmentMonths = allAppointments.map(a => a.dateTime.substring(0, 7));
                const expenseMonths = allExpenses.map(e => e.date.substring(0, 7));
                const uniqueMonths = [...new Set([...appointmentMonths, ...expenseMonths])].sort().reverse();
                
                monthSelect.innerHTML = '<option value="all">Selecione o Mês</option>';
                uniqueMonths.forEach(monthYear => {
                    const [year, month] = monthYear.split('-');
                    const option = document.createElement('option');
                    option.value = monthYear;
                    option.textContent = `${monthNames[parseInt(month) - 1]} de ${year}`;
                    monthSelect.appendChild(option);
                });
            }
            
            function renderAppointments(appointments) {
                appointmentsList.innerHTML = '';
                emptyAppointmentsEl.classList.toggle('hidden', appointments.length > 0);
                appointments.forEach(appt => appointmentsList.appendChild(createCard(appt, 'appointment')));
            }

            function renderExpenses(expenses) {
                expensesList.innerHTML = '';
                emptyExpensesEl.classList.toggle('hidden', expenses.length > 0);
                expenses.forEach(exp => expensesList.appendChild(createCard(exp, 'expense')));
            }

            function createCard(item, type) {
                const card = document.createElement('div');
                let innerHTML = '';

                if (type === 'appointment') {
                    card.className = `card p-5 ${item.isPaid ? 'paid-card' : 'unpaid-card'}`;
                    const formattedDate = new Date(item.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                    const formattedValue = item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    innerHTML = `
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div class="flex-1">
                                <p class="font-bold text-lg text-pink-700">${item.clientName}</p>
                                <p class="text-gray-600">${item.service}</p>
                                <div class="flex flex-col sm:flex-row items-start sm:items-center text-sm text-gray-500 mt-2 gap-x-2">
                                    <span class="flex items-center"><i class="fas fa-calendar-alt mr-2"></i>${formattedDate}</span>
                                    <span class="hidden sm:inline">|</span>
                                    <span class="flex items-center"><i class="fas fa-money-bill-wave mr-2"></i>${formattedValue}</span>
                                </div>
                            </div>
                            <div class="flex items-center space-x-3 w-full md:w-auto">
                                ${!item.isPaid ? `<button class="btn-secondary font-semibold py-2 px-4 rounded-lg flex-1 md:flex-none mark-paid-btn"><i class="fas fa-check mr-2"></i>Marcar Pago</button>` : `<span class="font-bold text-green-600 text-center flex-1"><i class="fas fa-check-circle mr-2"></i>Pago</span>`}
                                <button class="text-red-500 hover:text-red-700 py-2 px-4 rounded-lg delete-btn"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        </div>`;
                } else { // type === 'expense'
                    card.className = 'card p-5 border-l-4 border-red-500';
                    const formattedDate = new Date(item.date + 'T03:00:00').toLocaleDateString('pt-BR', {dateStyle: 'short'});
                    const formattedValue = item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    innerHTML = `
                        <div class="flex justify-between items-center gap-4">
                             <div class="flex-1">
                                <p class="font-bold text-gray-800">${item.description}</p>
                                <div class="flex items-center text-sm text-gray-500 mt-2">
                                    <i class="fas fa-calendar-alt mr-2"></i><span>${formattedDate}</span>
                                    <span class="mx-2">|</span>
                                    <span class="text-red-600 font-semibold">${formattedValue}</span>
                                </div>
                            </div>
                            <button class="text-red-500 hover:text-red-700 py-2 px-4 rounded-lg delete-btn"><i class="fas fa-trash-alt"></i></button>
                        </div>`;
                }
                card.innerHTML = innerHTML;
                
                const markPaidBtn = card.querySelector('.mark-paid-btn');
                if (markPaidBtn) markPaidBtn.addEventListener('click', () => markAsPaid(item.id));
                card.querySelector('.delete-btn').addEventListener('click', () => showDeleteModal({id: item.id, type}));
                
                return card;
            }

            // --- SUMMARY UI ---
            function updatePeriodSummary(appointments, expenses) {
                const paidTotal = appointments.filter(a => a.isPaid).reduce((sum, a) => sum + a.value, 0);
                const unpaidTotal = appointments.filter(a => !a.isPaid).reduce((sum, a) => sum + a.value, 0);
                const expensesTotal = expenses.reduce((sum, e) => sum + e.value, 0);
                const netBalance = (paidTotal + unpaidTotal) - expensesTotal;

                netBalanceEl.textContent = netBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                netBalanceEl.classList.remove('text-green-600', 'text-red-600', 'text-blue-500');
                if (netBalance > 0) netBalanceEl.classList.add('text-green-600');
                else if (netBalance < 0) netBalanceEl.classList.add('text-red-600');
                else netBalanceEl.classList.add('text-blue-500');

                totalPaidEl.textContent = paidTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                totalUnpaidEl.textContent = unpaidTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                periodExpensesEl.textContent = expensesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }

            // --- HELPERS & MODAL ---
            function getWeekDateRange(weekString) {
                const [year, weekNum] = weekString.split('-W').map(Number);
                const firstDayOfYear = new Date(year, 0, 1);
                const daysOffset = (firstDayOfYear.getDay() + 6) % 7;
                const firstMonday = new Date(firstDayOfYear);
                if (daysOffset > 0) {
                   firstMonday.setDate(firstDayOfYear.getDate() - daysOffset + (daysOffset > 3 ? 8 : 1) );
                }
                const start = new Date(firstMonday);
                start.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                return { start, end };
            }

            function setupCurrencyInput(inputElement) {
                inputElement.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value === '') { e.target.value = ''; return; }
                    value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    e.target.value = 'R$ ' + value;
                });
            }
            setupCurrencyInput(valueInput);
            setupCurrencyInput(expenseValueInput);

            function showDeleteModal(item) {
                itemToDelete = item;
                const itemType = item.type === 'appointment' ? 'o agendamento' : 'o gasto';
                deleteModalText.textContent = `Tem certeza que deseja excluir ${itemType}? Esta ação não pode ser desfeita.`;
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
                    itemToDelete = null;
                }, 300);
            }

            cancelDeleteBtn.addEventListener('click', hideDeleteModal);
            confirmDeleteBtn.addEventListener('click', () => {
                if (itemToDelete) deleteItem(itemToDelete);
                hideDeleteModal();
            });
        });