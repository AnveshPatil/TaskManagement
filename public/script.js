let currentUser = null;
let allTasks = [];
let currentFilter = 'All';

const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const managerPanel = document.getElementById('manager-panel');
const userDisplayName = document.getElementById('user-display-name');
const taskGrid = document.getElementById('task-grid');

// Check view on load
function checkAuthOnLoad() {
  if (!currentUser) {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
  } else {
    initDashboard();
  }
}

// 1. Handle Login (Original Simple Auth)
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (res.ok) {
    currentUser = await res.json();
    initDashboard();
  } else {
    alert('Invalid Credentials');
  }
});

// 2. Initialize Dashboard
async function initDashboard() {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  userDisplayName.textContent = `${currentUser.name} (${currentUser.role})`;

  if (currentUser.role === 'manager') {
    managerPanel.classList.remove('hidden');
    loadEmployeeDropdown();
  } else {
    managerPanel.classList.add('hidden');
  }

  loadTasks();
}

// 3. Load Employee List into Manager Dropdown
async function loadEmployeeDropdown() {
  const res = await fetch('/api/employees');
  const employees = await res.json();
  const select = document.getElementById('employee-select');
  select.innerHTML = '<option value="">Select Employee</option>';

  employees.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = `${emp.name} (${emp.email})`;
    select.appendChild(opt);
  });
}

// 4. Create Employee Account (Manager)
document.getElementById('add-employee-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('emp-name').value;
  const email = document.getElementById('emp-email').value;
  const password = document.getElementById('emp-pass').value;

  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });

  if (res.ok) {
    alert('Employee account created!');
    e.target.reset();
    loadEmployeeDropdown();
  } else {
    const err = await res.json();
    alert(err.error);
  }
});

// 5. Assign Task (Manager)
document.getElementById('assign-task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const assignedTo = document.getElementById('employee-select').value;
  const title = document.getElementById('task-title').value;
  const description = document.getElementById('task-desc').value;
  const priority = document.getElementById('task-priority').value;
  const dueDate = document.getElementById('task-duedate').value;

  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedTo, title, description, priority, dueDate })
  });

  e.target.reset();
  loadTasks();
});

// 6. Fetch & Render Tasks
async function loadTasks() {
  const res = await fetch(`/api/tasks?userId=${currentUser.id}&role=${currentUser.role}`);
  allTasks = await res.json();

  if (currentUser.role === 'manager') {
    updateStats(allTasks);
  }

  renderTaskGrid();
}

// Update Stats Cards
function updateStats(tasks) {
  document.getElementById('stat-total').textContent = tasks.length;
  document.getElementById('stat-completed').textContent = tasks.filter(t => t.status === 'Completed').length;
  document.getElementById('stat-pending').textContent = tasks.filter(t => t.status === 'Pending').length;
  document.getElementById('stat-high').textContent = tasks.filter(t => t.priority === 'High').length;
}

// Filter Task List
function filterTasks(status) {
  currentFilter = status;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderTaskGrid();
}

// Render Task Cards
function renderTaskGrid() {
  taskGrid.innerHTML = '';
  const filtered = allTasks.filter(t => currentFilter === 'All' ? true : t.status === currentFilter);

  if (filtered.length === 0) {
    taskGrid.innerHTML = `<p style="color:#94a3b8">No tasks found.</p>`;
    return;
  }

  filtered.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card ${task.priority}`;
    card.innerHTML = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="badge badge-${task.status.toLowerCase()}">${task.status}</span>
          <span style="font-size:0.75rem; color:#94a3b8">${task.priority} Priority</span>
        </div>
        <h4 style="margin-top:0.5rem">${task.title}</h4>
        <p style="font-size:0.85rem; color:#94a3b8; margin-top:0.3rem">${task.description || 'No description'}</p>
      </div>

      <div>
        <div class="task-meta">
          <div>Assigned to: <strong>${task.assignedToName || 'Employee'}</strong></div>
          ${task.dueDate ? `<div>Due: ${task.dueDate}</div>` : ''}
        </div>
        <div class="task-actions">
          <button class="btn btn-secondary" style="font-size:0.8rem; padding:0.4rem;" onclick="toggleTaskStatus(${task.id}, '${task.status}')">
            Mark ${task.status === 'Pending' ? 'Completed' : 'Pending'}
          </button>
          ${currentUser.role === 'manager' ? `
            <button class="btn btn-danger" style="font-size:0.8rem; padding:0.4rem;" onclick="deleteTask(${task.id})">Delete</button>
          ` : ''}
        </div>
      </div>
    `;
    taskGrid.appendChild(card);
  });
}

// 7. Update Task Status
async function toggleTaskStatus(taskId, currentStatus) {
  const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
  await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  });
  loadTasks();
}

// 8. Delete Task (Manager)
async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
  loadTasks();
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  currentUser = null;
  checkAuthOnLoad();
});

// Run check
checkAuthOnLoad();