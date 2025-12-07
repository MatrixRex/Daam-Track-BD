// Check if we should force remote data in development
const forceRemote = import.meta.env.DEV && localStorage.getItem('useRemoteData') === 'true';
const isRemote = import.meta.env.PROD || forceRemote;

export const DATA_BASE_URL = isRemote
  ? 'https://raw.githubusercontent.com/MatrixRex/Daam-Track-BD/database' 
  : import.meta.env.BASE_URL.replace(/\/$/, '');

export const DATA_START_YEAR = isRemote
  ? 2025
  : new Date().getFullYear() - 10;
