export const statuses = ['Draft', 'Submitted', 'Under Review', 'Needs Clarification', 'Forwarded to Admin', 'Approved', 'Rejected', 'Invoice Generated', 'Paid'];

export const timeline = ['Submitted', 'Under Review', 'Needs Clarification', 'Forwarded to Admin', 'Approved', 'Invoice Generated', 'Paid'];

export const currency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
