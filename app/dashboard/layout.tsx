// app/dashboard/layout.tsx
import LayoutDashboard from "@/components/LayoutDashboard";

export const metadata = {
  title: "Dashboard - FlowSend",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <LayoutDashboard>{children}</LayoutDashboard>;
}
