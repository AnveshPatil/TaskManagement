const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');

// Read data from JSON file
function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const defaultData = {
        users: [
          { id: 1, name: "Manager", email: "manager@test.com", password: "123", role: "manager" },
          { id: 2, name: "Sahil", email: "sahil@test.com", password: "123", role: "employee" },
          { id: 3, name: "Aditya", email: "aditya@test.com", password: "123", role: "employee" }
        ],
        tasks: []
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error("Error loading data:", err);
    return { users: [], tasks: [] };
  }
}

// Save data to JSON file
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error saving data:", err);
  }
}

// ---------------- API ENDPOINTS ---------------- //

// Original Simple Login Endpoint
app.post('/api/login', (req, res) => {
  const { users } = loadData();
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  res.json({ id: user.id, name: user.name, role: user.role });
});

// Create Employee (Manager only)
app.post('/api/users', (req, res) => {
  const db = loadData();
  const { name, email, password } = req.body;
  
  if (db.users.some(u => u.email === email)) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const newUser = { id: Date.now(), name, email, password, role: 'employee' };
  db.users.push(newUser);
  saveData(db);

  res.json({ message: "Employee registered successfully", user: newUser });
});

// Fetch Employees List
app.get('/api/employees', (req, res) => {
  const { users } = loadData();
  const employees = users
    .filter(u => u.role === 'employee')
    .map(({ id, name, email }) => ({ id, name, email }));
  res.json(employees);
});

// Advanced Assign Task (With Priority & Due Date)
app.post('/api/tasks', (req, res) => {
  const db = loadData();
  const { assignedTo, title, description, priority, dueDate } = req.body;
  
  const employee = db.users.find(u => u.id === Number(assignedTo));

  const newTask = { 
    id: Date.now(), 
    assignedTo: Number(assignedTo),
    assignedToName: employee ? employee.name : "Employee",
    title, 
    description: description || "",
    priority: priority || "Medium",
    dueDate: dueDate || "",
    status: 'Pending' 
  };
  
  db.tasks.push(newTask);
  saveData(db);

  res.json({ message: "Task assigned successfully", task: newTask });
});

// Get Tasks
app.get('/api/tasks', (req, res) => {
  const { tasks } = loadData();
  const { userId, role } = req.query;
  
  if (role === 'manager') {
    return res.json(tasks);
  } else {
    const employeeTasks = tasks.filter(t => t.assignedTo === Number(userId));
    return res.json(employeeTasks);
  }
});

// Update Task Status
app.patch('/api/tasks/:id', (req, res) => {
  const db = loadData();
  const taskId = Number(req.params.id);
  const { status } = req.body;
  const task = db.tasks.find(t => t.id === taskId);
  
  if (task) {
    task.status = status;
    saveData(db);
    res.json({ message: "Task status updated", task });
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

// Delete Task (Manager)
app.delete('/api/tasks/:id', (req, res) => {
  const db = loadData();
  const taskId = Number(req.params.id);
  
  db.tasks = db.tasks.filter(t => t.id !== taskId);
  saveData(db);

  res.json({ message: "Task deleted successfully" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});