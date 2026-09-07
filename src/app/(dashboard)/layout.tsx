import { AppNav } from "@/components/shared/AppNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col">
      <AppNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
