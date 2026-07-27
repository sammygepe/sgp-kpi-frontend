import './globals.css';

export const metadata = {
  title: 'SGP KPI System',
  description: 'Sistem Penilaian KPI Objektif',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  );
}