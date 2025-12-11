
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import DressCode from './pages/DressCode';
import Gallery from './pages/Gallery';
import Seating from './pages/Seating';
import Trivia from './pages/Trivia';
import { AppRoute } from './types';
import { AuthProvider } from './context/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path={AppRoute.HOME} element={<Home />} />
            <Route path={AppRoute.DRESSCODE} element={<DressCode />} />
            <Route path={AppRoute.GALLERY} element={<Gallery />} />
            <Route path={AppRoute.SEATING} element={<Seating />} />
            <Route path={AppRoute.TRIVIA} element={<Trivia />} />
            <Route path="*" element={<Navigate to={AppRoute.HOME} replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
};

export default App;
