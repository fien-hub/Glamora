// Mock data for demonstration
const mockServices = [
    {
        id: 1,
        name: "Lash Lift & Tint",
        provider: "Sophia Beauty Studio",
        email: "sophia@beautystudio.com",
        description: "Professional lash lift and tint service for natural-looking, lifted lashes that last 6-8 weeks",
        price: 45.00,
        duration: 60,
        submittedAt: "2 hours ago",
        status: "pending"
    },
    {
        id: 2,
        name: "Brow Lamination",
        provider: "Emma's Brow Bar",
        email: "emma@browbar.com",
        description: "Eyebrow lamination treatment to create fuller, fluffier brows with a natural lifted look",
        price: 35.00,
        duration: 45,
        submittedAt: "5 hours ago",
        status: "pending"
    },
    {
        id: 3,
        name: "Car Detailing",
        provider: "John's Auto Care",
        email: "john@autocare.com",
        description: "Professional car detailing and cleaning services",
        price: 150.00,
        duration: 120,
        submittedAt: "1 day ago",
        status: "pending",
        warning: "This doesn't appear to be a beauty service"
    }
];

// Handle approve button clicks
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-approve') || e.target.closest('.btn-approve')) {
        const serviceCard = e.target.closest('.service-card');
        const serviceName = serviceCard.querySelector('h4').textContent;
        
        if (confirm(`Are you sure you want to approve "${serviceName}"?`)) {
            approveService(serviceCard, serviceName);
        }
    }
});

// Handle reject button clicks
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-reject') || e.target.closest('.btn-reject')) {
        const serviceCard = e.target.closest('.service-card');
        const serviceName = serviceCard.querySelector('h4').textContent;
        
        showRejectModal(serviceCard, serviceName);
    }
});

// Approve service
function approveService(serviceCard, serviceName) {
    // Show loading state
    const actions = serviceCard.querySelector('.service-actions');
    actions.innerHTML = '<div style="text-align: center; padding: 12px; color: #10B981;">✓ Approving...</div>';
    
    // Simulate API call
    setTimeout(() => {
        // Update UI
        const statusBadge = serviceCard.querySelector('.status-badge');
        statusBadge.textContent = 'Approved';
        statusBadge.classList.remove('pending');
        statusBadge.classList.add('approved');
        
        actions.innerHTML = '<div style="text-align: center; padding: 12px; color: #10B981; font-weight: 600;">✓ Service Approved!</div>';
        
        // Show success notification
        showNotification(`"${serviceName}" has been approved!`, 'success');
        
        // Remove card after 2 seconds
        setTimeout(() => {
            serviceCard.style.opacity = '0';
            serviceCard.style.transform = 'scale(0.95)';
            setTimeout(() => {
                serviceCard.remove();
                updatePendingCount(-1);
            }, 300);
        }, 2000);
    }, 1000);
}

// Show reject modal
function showRejectModal(serviceCard, serviceName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <h3>Reject Service</h3>
            <p>Please provide a reason for rejecting "${serviceName}":</p>
            <textarea id="rejection-reason" placeholder="e.g., Not a beauty service" rows="4"></textarea>
            <div class="modal-actions">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-confirm-reject">Confirm Reject</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.2s;
        }
        
        .modal {
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            animation: slideUp 0.3s;
        }
        
        .modal h3 {
            font-size: 20px;
            font-weight: 600;
            color: #1F2937;
            margin-bottom: 12px;
        }
        
        .modal p {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 16px;
        }
        
        .modal textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            font-family: inherit;
            font-size: 14px;
            resize: vertical;
            margin-bottom: 16px;
        }
        
        .modal textarea:focus {
            outline: none;
            border-color: #F4B5A4;
            box-shadow: 0 0 0 3px rgba(244, 181, 164, 0.1);
        }
        
        .modal-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }
        
        .btn-cancel, .btn-confirm-reject {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-cancel {
            background: #F3F4F6;
            color: #6B7280;
        }
        
        .btn-cancel:hover {
            background: #E5E7EB;
        }
        
        .btn-confirm-reject {
            background: #EF4444;
            color: white;
        }
        
        .btn-confirm-reject:hover {
            background: #DC2626;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Handle cancel
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.remove();
    });
    
    // Handle confirm reject
    modal.querySelector('.btn-confirm-reject').addEventListener('click', () => {
        const reason = document.getElementById('rejection-reason').value.trim();
        if (!reason) {
            alert('Please provide a rejection reason');
            return;
        }
        
        modal.remove();
        rejectService(serviceCard, serviceName, reason);
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Reject service
function rejectService(serviceCard, serviceName, reason) {
    // Show loading state
    const actions = serviceCard.querySelector('.service-actions');
    actions.innerHTML = '<div style="text-align: center; padding: 12px; color: #EF4444;">✕ Rejecting...</div>';
    
    // Simulate API call
    setTimeout(() => {
        // Update UI
        const statusBadge = serviceCard.querySelector('.status-badge');
        statusBadge.textContent = 'Rejected';
        statusBadge.classList.remove('pending');
        statusBadge.classList.add('rejected');
        
        actions.innerHTML = `<div style="text-align: center; padding: 12px; color: #EF4444; font-weight: 600;">✕ Service Rejected</div>`;
        
        // Add rejection reason
        const rejectionNote = document.createElement('div');
        rejectionNote.className = 'rejection-note';
        rejectionNote.textContent = `Reason: ${reason}`;
        serviceCard.appendChild(rejectionNote);
        
        // Show success notification
        showNotification(`"${serviceName}" has been rejected`, 'error');
        
        // Remove card after 2 seconds
        setTimeout(() => {
            serviceCard.style.opacity = '0';
            serviceCard.style.transform = 'scale(0.95)';
            setTimeout(() => {
                serviceCard.remove();
                updatePendingCount(-1);
            }, 300);
        }, 2000);
    }, 1000);
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 24px;
            right: 24px;
            padding: 16px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            color: white;
            z-index: 10000;
            animation: slideInRight 0.3s, fadeOut 0.3s 2.7s;
        }
        
        .notification.success {
            background: #10B981;
        }
        
        .notification.error {
            background: #EF4444;
        }
        
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Update pending count
function updatePendingCount(change) {
    const badge = document.querySelector('.nav-item .badge');
    if (badge) {
        const currentCount = parseInt(badge.textContent);
        const newCount = Math.max(0, currentCount + change);
        badge.textContent = newCount;
        
        // Update stat card
        const statCard = document.querySelector('.stat-card .stat-content h3');
        if (statCard) {
            statCard.textContent = newCount;
        }
    }
}

// Initialize
console.log('Glamora Admin Dashboard loaded');
console.log('Mock services:', mockServices);

