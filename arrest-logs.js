// ========================================
// ARREST LOGS SYSTEM
// FBI TEAM ROBLOX
// ========================================

// Arrest logs cache
let arrestsCache = [];
let isAgent = false;

// ========================================
// AGENT AUTHENTICATION
// ========================================

const AGENT_EMAIL = 'agent@ftr.com';

// Update auth state checker to include agent
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Check if agent
        if (user.email === AGENT_EMAIL) {
            currentUser = user;
            isAgent = true;
            isAdmin = false; // Agent is NOT admin
            updateAgentUI(true);
            console.log('✓ Agent authenticated:', user.email);
            
            // Show Arrest Logs tab
            showArrestLogsTab();
        }
        // Check if admin (already handled in main code)
        else if (ADMIN_EMAILS.includes(user.email)) {
            currentUser = user;
            isAdmin = true;
            isAgent = false;
            updateAdminUI(true);
            console.log('✓ Admin authenticated:', user.email);
            
            // Admins can also see Arrest Logs
            showArrestLogsTab();
        }
        // Not authorized
        else {
            currentUser = user;
            isAdmin = false;
            isAgent = false;
            updateAdminUI(false);
            updateAgentUI(false);
            console.warn('⚠ User not authorized:', user.email);
            alert('You are not authorized.');
            firebase.auth().signOut();
        }
    } else {
        // Logged out
        currentUser = null;
        isAdmin = false;
        isAgent = false;
        updateAdminUI(false);
        updateAgentUI(false);
        hideArrestLogsTab();
        console.log('✗ No user authenticated');
    }
});

// Update agent UI
function updateAgentUI(loggedIn) {
    const agentElements = document.querySelectorAll('.agent-only');
    const agentBtn = document.getElementById('agentBtn');
    
    if (loggedIn) {
        agentElements.forEach(el => el.style.display = 'block');
        if (agentBtn) {
            agentBtn.textContent = 'Logout';
            agentBtn.classList.add('logged-in');
        }
    } else {
        agentElements.forEach(el => el.style.display = 'none');
        if (agentBtn) {
            agentBtn.textContent = 'Agent Login';
            agentBtn.classList.remove('logged-in');
        }
    }
}

// Show/Hide Arrest Logs Tab
function showArrestLogsTab() {
    const arrestTab = document.getElementById('arrestsTab');
    if (arrestTab) {
        arrestTab.style.display = 'block';
    }
}

function hideArrestLogsTab() {
    const arrestTab = document.getElementById('arrestsTab');
    if (arrestTab) {
        arrestTab.style.display = 'none';
    }
    
    // Switch to another tab if currently on arrests
    const arrestContent = document.getElementById('arrests');
    if (arrestContent && arrestContent.classList.contains('active')) {
        switchTab('information');
    }
}

// ========================================
// AGENT LOGIN MODAL
// ========================================

function showAgentLogin() {
    if (isAgent || isAdmin) {
        // Logout
        firebase.auth().signOut();
    } else {
        document.getElementById('agentLoginModal').classList.add('active');
    }
}

async function agentLogin() {
    const email = document.getElementById('agentEmail').value.trim();
    const password = document.getElementById('agentPassword').value;
    const loginBtn = document.getElementById('agentLoginBtn');
    
    if (!email || !password) {
        showAgentLoginMessage('Please enter email and password', true);
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    
    try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
        await firebase.auth().signInWithEmailAndPassword(email, password);
        
        showAgentLoginMessage('Login successful!');
        closeModal('agentLoginModal');
        
        // Clear form
        document.getElementById('agentEmail').value = '';
        document.getElementById('agentPassword').value = '';
        
    } catch (error) {
        console.error('Agent login error:', error);
        
        let errorMessage = 'Login failed. ';
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address.';
                break;
            case 'auth/user-not-found':
                errorMessage += 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Incorrect password.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAgentLoginMessage(errorMessage, true);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
}

function showAgentLoginMessage(message, isError = false) {
    const messageDiv = document.getElementById('agentLoginMessage');
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.background = isError ? 
        'linear-gradient(135deg, #dc2626, #991b1b)' : 
        'linear-gradient(135deg, #22c55e, #16a34a)';
    messageDiv.style.color = 'white';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// ========================================
// LOAD ARRESTS
// ========================================

async function loadArrests() {
    try {
        const data = await getData('arrests');
        
        if (data) {
            arrestsCache = Object.values(data);
            // Sort by timestamp (newest first)
            arrestsCache.sort((a, b) => b.timestamp - a.timestamp);
        } else {
            arrestsCache = [];
        }
        
        renderArrests();
    } catch (error) {
        console.error('Error loading arrests:', error);
        document.getElementById('arrestsLoading').textContent = 'Error loading arrests';
    }
}

// ========================================
// SAVE ARRESTS
// ========================================

async function saveArrests() {
    const arrestsObj = {};
    arrestsCache.forEach(arrest => {
        arrestsObj[arrest.id] = arrest;
    });
    await saveData('arrests', arrestsObj);
}

// ========================================
// ADD ARREST
// ========================================

function showAddArrest() {
    document.getElementById('addArrestModal').classList.add('active');
}

async function addArrest() {
    if (!isAgent && !isAdmin) {
        alert('Agent or Admin access required!');
        return;
    }

    const suspects = document.getElementById('arrestSuspects').value.trim();
    const primaryAgent = document.getElementById('arrestPrimaryAgent').value.trim();
    const secondaryAgents = document.getElementById('arrestSecondaryAgents').value.trim();
    const crime = document.getElementById('arrestCrime').value.trim();
    const imageUrl = document.getElementById('arrestImage').value.trim();

    if (!suspects || !primaryAgent || !crime) {
        alert('Please fill all required fields (Suspects, Primary Agent, and Crime)!');
        return;
    }

    const newArrest = {
        id: Date.now(),
        suspects,
        primaryAgent,
        secondaryAgents: secondaryAgents || 'None',
        crime,
        imageUrl: imageUrl || '',
        timestamp: Date.now(),
        filedBy: currentUser.email
    };

    arrestsCache.unshift(newArrest); // Add to beginning (newest first)
    await saveArrests();
    renderArrests();
    closeModal('addArrestModal');
    
    // Clear form
    document.getElementById('arrestSuspects').value = '';
    document.getElementById('arrestPrimaryAgent').value = '';
    document.getElementById('arrestSecondaryAgents').value = '';
    document.getElementById('arrestCrime').value = '';
    document.getElementById('arrestImage').value = '';
    
    // Show success message
    alert('✅ Arrest log successfully added!');
}

// ========================================
// DELETE ARREST (Admin Only)
// ========================================

async function deleteArrest(id) {
    if (!isAdmin) {
        alert('Only admins can delete arrest logs!');
        return;
    }
    
    if (confirm('Delete this arrest log?')) {
        arrestsCache = arrestsCache.filter(a => a.id !== id);
        await saveArrests();
        renderArrests();
    }
}

// ========================================
// FILTER ARRESTS
// ========================================

function getFilteredArrests() {
    const search = document.getElementById('arrestSearch').value.toLowerCase();
    
    return arrestsCache.filter(arrest => 
        arrest.suspects.toLowerCase().includes(search) ||
        arrest.primaryAgent.toLowerCase().includes(search) ||
        arrest.crime.toLowerCase().includes(search)
    );
}

function filterArrests() {
    renderArrests();
}

// ========================================
// RENDER ARRESTS
// ========================================

function renderArrests() {
    const grid = document.getElementById('arrestsGrid');
    const loading = document.getElementById('arrestsLoading');
    const filteredArrests = getFilteredArrests();
    
    loading.style.display = 'none';
    grid.style.display = 'grid';
    
    if (filteredArrests.length === 0) {
        grid.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <p style="color: var(--text-secondary); font-size: 1.2rem;">
                    No arrest logs found. 
                    ${isAgent || isAdmin ? 'Click "+ New Arrest Log" to add one.' : ''}
                </p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredArrests.map((arrest, index) => {
        const arrestNumber = String(filteredArrests.length - index).padStart(3, '0');
        const date = new Date(arrest.timestamp);
        const dateStr = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        const timeStr = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        return `
            <div class="card arrest-card">
                <div class="card-header">
                    <h3 class="card-title">ARREST #${arrestNumber}</h3>
                    <span class="card-badge">LOGGED</span>
                </div>
                <div class="card-content">
                    <p><strong>Suspect(s):</strong> ${arrest.suspects}</p>
                    <p><strong>Primary Agent:</strong> ${arrest.primaryAgent}</p>
                    <p><strong>Secondary Agent(s):</strong> ${arrest.secondaryAgents}</p>
                    <p><strong>Crime:</strong> ${arrest.crime}</p>
                    <p><strong>Date:</strong> ${dateStr} - ${timeStr}</p>
                    
                    ${arrest.imageUrl ? `
                        <div style="margin-top: 1rem;">
                            <img src="${arrest.imageUrl}" 
                                 alt="Arrest Evidence" 
                                 style="width: 100%; border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.3);"
                                 onerror="this.style.display='none'">
                        </div>
                    ` : ''}
                    
                    ${isAdmin ? `
                        <button class="btn btn-danger" 
                                style="margin-top: 1rem; padding: 0.6rem 1.25rem; font-size: 0.8rem;" 
                                onclick="deleteArrest(${arrest.id})">
                            Delete Log
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// INITIALIZE ARRESTS
// ========================================

async function initializeArrests() {
    // Only load if user is logged in as agent or admin
    if (isAgent || isAdmin) {
        await loadArrests();
    }
}

// Export functions to global scope
window.showAgentLogin = showAgentLogin;
window.agentLogin = agentLogin;
window.showAddArrest = showAddArrest;
window.addArrest = addArrest;
window.deleteArrest = deleteArrest;
window.filterArrests = filterArrests;
window.initializeArrests = initializeArrests;

console.log('✓ Arrest Logs system loaded');
