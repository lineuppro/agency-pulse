import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Layouts
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ClientLayout } from "@/components/layout/ClientLayout";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminClients from "./pages/admin/Clients";
import AdminUsers from "./pages/admin/Users";
import AdminTasks from "./pages/admin/Tasks";
import AdminPerformance from "./pages/admin/Performance";
import AdminChat from "./pages/admin/Chat";
import AdminSettings from "./pages/admin/Settings";
import AdminFiles from "./pages/admin/Files";
import AdminMeetingAgenda from "./pages/admin/MeetingAgenda";
import AdminCalendar from "./pages/admin/Calendar";
import AdminContentCreation from "./pages/admin/ContentCreation";

// Client Portal Pages
import MeetingAgenda from "./pages/portal/MeetingAgenda";
import Performance from "./pages/portal/Performance";
import Chat from "./pages/portal/Chat";
import PortalFiles from "./pages/portal/Files";
import PortalCalendar from "./pages/portal/Calendar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="clients" element={<AdminClients />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="tasks" element={<AdminTasks />} />
                <Route path="performance" element={<AdminPerformance />} />
                <Route path="files" element={<AdminFiles />} />
                <Route path="calendar" element={<AdminCalendar />} />
                <Route path="content-creation" element={<AdminContentCreation />} />
                <Route path="agenda" element={<AdminMeetingAgenda />} />
                <Route path="chat" element={<AdminChat />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Client Portal routes */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<MeetingAgenda />} />
                <Route path="performance" element={<Performance />} />
                <Route path="files" element={<PortalFiles />} />
                <Route path="calendar" element={<PortalCalendar />} />
                <Route path="chat" element={<Chat />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
