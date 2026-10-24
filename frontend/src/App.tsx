import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './app/routes/AppRouter';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';

function App() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
