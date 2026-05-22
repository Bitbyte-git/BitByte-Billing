import axios from 'axios';

const api = axios.create({
  baseURL: 'https://bitbyte-server.onrender.com/api'
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bbt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

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
