import axios from 'axios';

const api = axios.create({
  baseURL: 'https://bitbyte-server.onrender.com/api'
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bbt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bbt_user');
      localStorage.removeItem('bbt_token');
      window.dispatchEvent(new Event('bbt-session-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;

export const downloadPaymentAttachment = async (paymentId, fileName = 'payment-attachment') => {
  try {
    const response = await api.get(`/payments/${paymentId}/attachment`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  } catch (error) {
    console.error('Error downloading attachment', error);
    alert('Unable to download attachment. Please try again.');
  }
};

export const downloadPdf = async (invoiceId, invoiceNumber = 'Invoice') => {
  try {
    const response = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  } catch (error) {
    console.error('Error downloading PDF', error);
    alert('Unable to download PDF. Please try again.');
  }
};

export const downloadInternInvoicePdf = async (invoiceId, invoiceNumber = 'Intern-Invoice') => {
  try {
    const response = await api.get(`/intern-invoices/${invoiceId}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  } catch (error) {
    console.error('Error downloading intern invoice PDF', error);
    alert('Unable to download intern invoice PDF. Please try again.');
  }
};
