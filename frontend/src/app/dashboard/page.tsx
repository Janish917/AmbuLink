import { redirect } from 'next/navigation';

export default function DashboardIndex() {
  // Redirect to driver dashboard by default
  redirect('/dashboard/driver');
}
