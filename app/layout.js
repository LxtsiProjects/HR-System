import "./globals.css";

export const metadata = {
  title: "HR & Payroll",
  description: "Employee management, payroll, and payslips",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
