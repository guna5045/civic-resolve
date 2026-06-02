import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import AppRoutes from './routes/AppRoutes';
import AccessibilityPanel from './components/common/AccessibilityPanel';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AccessibilityProvider>
            <AuthProvider>
              <AppRoutes />
              <AccessibilityPanel />
            </AuthProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
