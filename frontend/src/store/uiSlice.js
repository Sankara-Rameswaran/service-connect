import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    darkMode: localStorage.getItem('darkMode') === 'true',
    sidebarOpen: false,
    notifications: [],
    unreadCount: 0,
  },
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      localStorage.setItem('darkMode', state.darkMode);
      if (state.darkMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    },
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      state.unreadCount++;
    },
    setUnreadCount: (state, action) => { state.unreadCount = action.payload; },
    clearNotifications: (state) => { state.unreadCount = 0; },
  },
});

export const { toggleDarkMode, toggleSidebar, setSidebarOpen, addNotification, setUnreadCount, clearNotifications } = uiSlice.actions;
export default uiSlice.reducer;
