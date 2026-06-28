import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#1A2E1A',
              border: '1px solid #D8E4D8',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '16px',
              padding: '16px 24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
